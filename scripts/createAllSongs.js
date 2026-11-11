/**
 * Offline script. Aggregates unique songs (skipping "page" items) from all
 * processed songbooks into `source/all-songs.json`: { [slug]: { title, first_line } }.
 * Both come from the first book (by `sort_order`) that contains the song.
 * Requires `scripts/processSrc.js` to have been run (reads `source/books`).
 */
const chalk = require('chalk');
const path = require('path');

const { CONST } = require('./constants');
const { readFile, writeFile } = require('./ioHelpers');

const ITEM_TYPE_PAGE = 'page';
const OUTPUT_FILE = 'all-songs.json';

const booksDir = path.resolve(__dirname, '..', CONST.FOLDER.SRC_OUTPUT);
const booksMap = readFile(booksDir, CONST.FILES.SONGBOOKS);

// Array.sort is stable, so ties keep the songbooks.json order.
const bookIds = Object.keys(booksMap).sort(
	(a, b) => booksMap[a].sort_order - booksMap[b].sort_order
);

const songs = {};

bookIds.forEach((bookId) => {
	const groups = readFile(path.join(booksDir, bookId), CONST.FILES.CONTENTS);
	if (!Array.isArray(groups)) return;

	groups.forEach((group) => {
		group.items.forEach((item) => {
			if (item.type === ITEM_TYPE_PAGE) return;
			if (!(item.id in songs)) {
				songs[item.id] = { title: item.title, first_line: item.aliasName };
			}
		});
	});
});

const sorted = Object.fromEntries(
	Object.entries(songs).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
);

writeFile(
	path.resolve(__dirname, '..', CONST.FOLDER.SRC_ROOT),
	OUTPUT_FILE,
	JSON.stringify(sorted, null, 2) + '\n'
);

console.log(
	chalk.green(`${Object.keys(sorted).length} songs from ${bookIds.length} books -> ${CONST.FOLDER.SRC_ROOT}/${OUTPUT_FILE}`)
);
