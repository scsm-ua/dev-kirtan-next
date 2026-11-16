import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import FeedbackWidget from '@/components/feedback/FeedbackWidget';
import { MAX_IMAGE_SIZE } from '@/components/feedback/helpers';
import { useIsOnline } from '@/other/hooks/useIsOnline';
import { translate } from '@/other/i18n';
import { getBookIds } from '@/tests/helpers/books';

import type { TFeedbackTranslations } from '@/types/translations';

vi.mock('@/other/hooks/useIsOnline', () => ({ useIsOnline: vi.fn(() => true) }));

const [bookId] = getBookIds();
const t = translate(bookId, 'FEEDBACK') as unknown as TFeedbackTranslations;

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

beforeEach(() => {
  vi.mocked(useIsOnline).mockReturnValue(true);
  fetchMock = vi.fn<typeof fetch>(async () => Response.json({ ok: true }));
  vi.stubGlobal('fetch', fetchMock);
  window.history.replaceState(null, '', `/${bookId}/some-song/`);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const field = (label: string) => screen.getByLabelText<HTMLInputElement>(label, { exact: false });
const submit = () => screen.getByRole('button', { name: t.FIELDS.SUBMIT });
const errorOf = (name: string) =>
  document.querySelector(`label[for="${name}"] .FormField__message`)?.textContent ?? null;
const sentForm = () => fetchMock.mock.calls[0][1].body as FormData;

async function openForm() {
  // Without `accept` filtering: a dropped file is not filtered by the browser either.
  const user = userEvent.setup({ applyAccept: false });
  render(<FeedbackWidget bookId={bookId} />);
  await user.click(screen.getByRole('button', { name: t.TRIGGER_TEXT }));
  await screen.findByText(t.APPEAL);
  return user;
}

const image = (size = 1024, type = 'image/png', name = 'shot.png') =>
  new File([new Uint8Array(size)], name, { type });

describe('FeedbackWidget', () => {
  it('offline: only says so', () => {
    vi.mocked(useIsOnline).mockReturnValue(false);
    render(<FeedbackWidget bookId={bookId} />);

    expect(screen.getByRole('status').textContent).toBe(t.OFFLINE);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('opens a form with its title, the appeal and the name field in focus', async () => {
    await openForm();

    expect(screen.getByRole('dialog').querySelector('.FeedbackWidget__header').textContent).toBe(t.TITLE);
    expect(document.activeElement).toBe(field(t.FIELDS.NAME.LABEL));
    expect(field(t.FIELDS.MESSAGE.LABEL).getAttribute('placeholder')).toBe(t.FIELDS.MESSAGE.PLACEHOLDER);
  });

  describe('checks before sending', () => {
    it('a message is required', async () => {
      const user = await openForm();
      await user.click(submit());

      await waitFor(() => expect(errorOf('message')).toBe(t.FIELDS.MESSAGE.VALIDATION.MIN_LENGTH));
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('the message has at least 5 characters', async () => {
      const user = await openForm();
      await user.type(field(t.FIELDS.MESSAGE.LABEL), 'abcd');
      await user.click(submit());
      await waitFor(() => expect(errorOf('message')).toBe(t.FIELDS.MESSAGE.VALIDATION.MIN_LENGTH));

      await user.type(field(t.FIELDS.MESSAGE.LABEL), 'e');
      await user.click(submit());
      expect(await screen.findByText(t.TU_MESSAGE)).toBeTruthy();
    });

    it('the email must be valid when given', async () => {
      const user = await openForm();
      await user.type(field(t.FIELDS.EMAIL.LABEL), 'not-an-email');
      await user.type(field(t.FIELDS.MESSAGE.LABEL), 'A long enough message');
      await user.click(submit());

      await waitFor(() => expect(errorOf('email')).toBe(t.FIELDS.EMAIL.VALIDATION.INVALID));
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('the name has at most 80 characters', async () => {
      const user = await openForm();
      fireEvent.change(field(t.FIELDS.NAME.LABEL), { target: { value: 'n'.repeat(81) } });
      await user.type(field(t.FIELDS.MESSAGE.LABEL), 'A long enough message');
      await user.click(submit());

      await waitFor(() => expect(errorOf('name')).toBe(t.FIELDS.NAME.VALIDATION.MAX_LENGTH));
    });

    it('an attachment must be an image', async () => {
      const user = await openForm();
      await user.type(field(t.FIELDS.MESSAGE.LABEL), 'A long enough message');
      await user.upload(document.querySelector<HTMLInputElement>('#fileUpload'), image(10, 'text/plain', 'a.txt'));
      await user.click(submit());

      await waitFor(() => expect(errorOf('image')).toBe(t.FIELDS.IMAGE.VALIDATION.TYPE));
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('an image must be at most 2 MB', async () => {
      const user = await openForm();
      await user.type(field(t.FIELDS.MESSAGE.LABEL), 'A long enough message');
      await user.upload(document.querySelector<HTMLInputElement>('#fileUpload'), image(MAX_IMAGE_SIZE + 1));
      await user.click(submit());

      await waitFor(() => expect(errorOf('image')).toBe(t.FIELDS.IMAGE.VALIDATION.SIZE));
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it('sends the message with the name, email and page address, and thanks', async () => {
    const user = await openForm();
    await user.type(field(t.FIELDS.NAME.LABEL), 'Radha');
    await user.type(field(t.FIELDS.EMAIL.LABEL), 'radha@example.org');
    await user.type(field(t.FIELDS.MESSAGE.LABEL), 'A typo in verse 2');
    await user.click(submit());

    expect(await screen.findByText(t.TU_MESSAGE)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(process.env.NEXT_PUBLIC_FEEDBACK_URL);
    expect(Object.fromEntries(sentForm())).toEqual({
      name: 'Radha', email: 'radha@example.org', message: 'A typo in verse 2', href: window.location.href
    });
  });

  it('leaves out the name and email when not given', async () => {
    const user = await openForm();
    await user.type(field(t.FIELDS.MESSAGE.LABEL), 'A typo in verse 2');
    await user.click(submit());

    await screen.findByText(t.TU_MESSAGE);
    expect(sentForm().get('name')).toBe('');
    expect(sentForm().get('email')).toBe('');
  });

  it('sends an attached image as a photo', async () => {
    const user = await openForm();
    await user.type(field(t.FIELDS.MESSAGE.LABEL), 'See the picture');
    const file = image();
    await user.upload(document.querySelector<HTMLInputElement>('#fileUpload'), file);

    expect(document.querySelector('.FileItem__name').textContent).toBe(file.name);
    expect(document.querySelector('.FileItem__size').textContent).toBe('1 KB');
    await user.click(submit());

    await screen.findByText(t.TU_MESSAGE);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentForm().get('image')).toBeInstanceOf(File);
  });

  it('keeps the form open when delivery fails', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 502 }));
    const user = await openForm();
    await user.type(field(t.FIELDS.MESSAGE.LABEL), 'A long enough message');
    await user.click(submit());

    expect((await screen.findByRole('alert')).textContent).toBe(t.DELIVERY_ERROR);
    expect(screen.queryByText(t.TU_MESSAGE)).toBeNull();
    expect(field(t.FIELDS.MESSAGE.LABEL).value).toBe('A long enough message');
  });

  it('takes a dropped image', async () => {
    await openForm();
    const file = image();
    fireEvent.drop(document.querySelector('.FileDropzone'), { dataTransfer: { files: [file] } });

    expect(await screen.findByText(file.name)).toBeTruthy();
  });

  it('removes the attached image, without sending the form', async () => {
    const user = await openForm();
    await user.type(field(t.FIELDS.MESSAGE.LABEL), 'A long enough message');
    const file = image();
    await user.upload(document.querySelector<HTMLInputElement>('#fileUpload'), file);
    await user.click(screen.getByRole('button', { name: `Remove ${file.name}` }));

    expect(document.querySelector('.FileItem')).toBeNull();
    expect(screen.queryByText(t.TU_MESSAGE)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
