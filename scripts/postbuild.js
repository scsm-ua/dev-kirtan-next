const fs = require('node:fs');
const path = require('node:path');
const {CONST} = require('./constants');

const BUILD_DIR = path.resolve(__dirname, '..', CONST.FOLDER.BUILD);
const BOOKS_DIR = path.resolve(__dirname, '..', CONST.FOLDER.SRC_OUTPUT);

if (!process.env.NEXT_PUBLIC_ORIGIN) {
	throw new Error('postbuild: NEXT_PUBLIC_ORIGIN is not set');
}

const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN.replace(/\/+$/, '');

// GH Pages: disable Jekyll processing of the build output.
fs.writeFileSync(path.join(BUILD_DIR, '.nojekyll'), '');

writeLegacyHtmlRedirects();

/**
 * Prebuild emtpy legacy (from old site) .html pages with redurect to new canonicals.
 * Prevents 404 for search bots.
 */
function writeLegacyHtmlRedirects() {
	let count = 0;

	for (const bookId of readBookIds()) {
		const dir = path.join(BUILD_DIR, bookId);
		fs.mkdirSync(dir, {recursive: true});

		for (const slug of readBookSlugs(bookId)) {
			if (!slug || slug.includes('/')) continue;

			const target = `${ORIGIN}/${bookId}/${slug}/`;
			fs.writeFileSync(path.join(dir, `${slug}.html`), redirectHtml(target));
			count++;
		}
	}

	console.log(`postbuild: wrote ${count} legacy .html redirects`);
}

/**
 * Book ids are the subdirectories of `source/books` that contain a contents file.
 */
function readBookIds() {
	return fs
		.readdirSync(BOOKS_DIR, {withFileTypes: true})
		.filter(
			(e) =>
				e.isDirectory() &&
				fs.existsSync(path.join(BOOKS_DIR, e.name, CONST.FILES.CONTENTS))
		)
		.map((e) => e.name);
}

/**
 * Flatten a book's contents into the list of item slugs (ids).
 */
function readBookSlugs(bookId) {
	const file = path.join(BOOKS_DIR, bookId, CONST.FILES.CONTENTS);

	try {
		const groups = JSON.parse(fs.readFileSync(file, 'utf8'));
		return groups.flatMap((g) => g.items || []).map((i) => i.id);
	} catch (e) {
		console.error(e);
		return [];
	}
}

/**
 * Minimal HTML that 200s and redirects to `target`. Instant meta refresh + a
 * canonical link let crawlers consolidate the legacy URL onto the new one.
 */
function redirectHtml(target) {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Redirecting…</title>
<link rel="canonical" href="${target}">
<meta http-equiv="refresh" content="0; url=${target}">
<script>location.replace(${JSON.stringify(target)})</script>
</head>
<body>
Redirecting to <a href="${target}">${target}</a>…
</body>
</html>
`;
}
