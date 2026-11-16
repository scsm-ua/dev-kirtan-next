const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_REQUEST_SIZE = MAX_IMAGE_SIZE + 32 * 1024;
const escapeMarkdown = value => value.replace(/([_\*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');

const worker = {
	async fetch(request, env) {
		const origin = request.headers.get('Origin');
		const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim());
		if (!origin || !allowedOrigins.includes(origin)) return new Response('Forbidden', { status: 403 });

		const headers = {
			'Access-Control-Allow-Origin': origin,
			'Access-Control-Allow-Methods': 'POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
			'Vary': 'Origin'
		};
		const reply = (message, status) => new Response(message, { status, headers });

		if (request.method === 'OPTIONS') return reply(null, 204);
		if (request.method !== 'POST') return reply('Method not allowed', 405);
		if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID || !env.FEEDBACK_RATE_LIMITER) {
			return reply('Service unavailable', 503);
		}

		const ip = request.headers.get('CF-Connecting-IP');
		if (!ip) return reply('Forbidden', 403);
		const { success } = await env.FEEDBACK_RATE_LIMITER.limit({ key: ip });
		if (!success) return reply('Too many requests', 429);

		if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('multipart/form-data;')) {
			return reply('Invalid content type', 415);
		}
		if (Number(request.headers.get('Content-Length')) > MAX_REQUEST_SIZE) {
			return reply('Request too large', 413);
		}

		let form;
		try {
			const reader = request.body.getReader();
			const chunks = [];
			let size = 0;
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				size += value.byteLength;
				if (size > MAX_REQUEST_SIZE) {
					await reader.cancel();
					return reply('Request too large', 413);
				}
				chunks.push(value);
			}
			form = await new Request(request.url, {
				method: 'POST',
				headers: { 'Content-Type': request.headers.get('Content-Type') },
				body: new Blob(chunks)
			}).formData();
		} catch {
			return reply('Invalid form', 400);
		}

		const name = form.get('name');
		const email = form.get('email');
		const message = form.get('message');
		const href = form.get('href');
		const image = form.get('image');
		if (typeof name !== 'string' || name.length > 80 ||
				typeof email !== 'string' || email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
				typeof message !== 'string' || message.trim().length < 5 || message.length > 1000 ||
				typeof href !== 'string' || href.length > 2048 ||
				(image !== null && (!(image instanceof File) || !image.type.startsWith('image/') || image.size > MAX_IMAGE_SIZE))) {
			return reply('Invalid form', 400);
		}

		const lines = [];
		if (name) lines.push(`*Name:* ${escapeMarkdown(name)}`);
		if (email) lines.push(`*Email:* ${escapeMarkdown(email)}`);
		lines.push(`*Message:* ${escapeMarkdown(message)}`, `*href:* ${escapeMarkdown(href)}`);

		try {
			const base = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;
			const textResponse = await fetch(`${base}/sendMessage`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: lines.join('\n'), parse_mode: 'MarkdownV2' })
			});
			if (!textResponse.ok || !(await textResponse.json()).ok) return reply('Delivery failed', 502);

			if (image) {
				const photo = new FormData();
				photo.append('chat_id', env.TELEGRAM_CHAT_ID);
				photo.append('photo', image);
				const photoResponse = await fetch(`${base}/sendPhoto`, { method: 'POST', body: photo });
				if (!photoResponse.ok || !(await photoResponse.json()).ok) return reply('Photo delivery failed', 502);
			}
			return reply('OK', 200);
		} catch {
			return reply('Delivery failed', 502);
		}
	}
};

export default worker;
