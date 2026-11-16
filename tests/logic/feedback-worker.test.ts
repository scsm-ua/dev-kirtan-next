import { afterEach, describe, expect, it, vi } from 'vitest';

import worker from '../../server-worker/feedback/feedback-view.js';

const env = {
  ALLOWED_ORIGINS: 'https://kirtan.site',
  TELEGRAM_BOT_TOKEN: 'test-token',
  TELEGRAM_CHAT_ID: '123',
  FEEDBACK_RATE_LIMITER: { limit: vi.fn(async () => ({ success: true })) }
};

function request(form = new FormData(), origin = 'https://kirtan.site') {
  return new Request('https://worker.example/', {
    method: 'POST',
    headers: { Origin: origin, 'CF-Connecting-IP': '192.0.2.1' },
    body: form
  });
}

function validForm() {
  const form = new FormData();
  form.set('name', 'Name');
  form.set('email', 'name@example.com');
  form.set('message', 'Hello there');
  form.set('href', 'https://kirtan.site/');
  return form;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('feedback worker', () => {
  it('forwards valid text and an image to the configured chat', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    const form = validForm();
    form.set('image', new File(['image'], 'image.png', { type: 'image/png' }));

    const response = await worker.fetch(request(form), env);

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://kirtan.site');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toEqual({
      chat_id: '123',
      text: '*Name:* Name\n*Email:* name@example\\.com\n*Message:* Hello there\n*href:* https://kirtan\\.site/',
      parse_mode: 'MarkdownV2'
    });
    expect((fetchMock.mock.calls[1][1].body as FormData).get('chat_id')).toBe('123');
  });

  it('rejects disallowed origins and invalid forms without contacting Telegram', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect((await worker.fetch(request(validForm(), 'https://evil.example'), env)).status).toBe(403);
    expect((await worker.fetch(request(), env)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('enforces the rate limit and propagates delivery failures', async () => {
    env.FEEDBACK_RATE_LIMITER.limit.mockResolvedValueOnce({ success: false });
    expect((await worker.fetch(request(validForm()), env)).status).toBe(429);
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ ok: false })));
    expect((await worker.fetch(request(validForm()), env)).status).toBe(502);
  });

  it('handles CORS preflight and rejects oversized requests', async () => {
    const preflight = new Request('https://worker.example/', {
      method: 'OPTIONS', headers: { Origin: 'https://kirtan.site' }
    });
    expect((await worker.fetch(preflight, env)).status).toBe(204);

    const form = validForm();
    form.set('image', new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }));
    expect((await worker.fetch(request(form), env)).status).toBe(400);

    form.set('image', new File([new Uint8Array(2 * 1024 * 1024 + 32 * 1024)], 'huge.png', { type: 'image/png' }));
    const hugeRequest = request(form);
    const bufferedRequest = new Request(hugeRequest.url, {
      method: hugeRequest.method,
      headers: hugeRequest.headers,
      body: await hugeRequest.arrayBuffer()
    });
    expect((await worker.fetch(bufferedRequest, env)).status).toBe(413);
  });
});