const path = require('path');
const { readdirSync, readFileSync } = require('fs');

const { CONST } = require('./constants');
const songbooks = require('../source/songbooks.json');

/**
 * Per-book settings from source/songbooks.json. Each value is either a git
 * repo URL string (legacy shorthand) or a settings object.
 * @typedef {Object} SongbookSettings
 * @property {string} repository - git repo URL of the songbook package.
 * @property {Object} [audio]
 * @property {Object} [audio.filter]
 * @property {Array<string>} [audio.filter.by_title] - person ids; only audio
 *   tracks with these raw titles are kept for the book.
 * @property {Array<import('../types/book').TShortcut>} [shortcuts] -
 *   extra links to content items shown on the contents and a-z pages.
 */

/**
 * @param bookSlug {string}
 * @return {SongbookSettings}
 */
function getSongbookSettings(bookSlug) {
	const entry = songbooks[bookSlug];
	return typeof entry === 'string' ? { repository: entry } : entry;
}

/**
 * @return {{ [bookSlug: string]: string }} - slug → git repo URL map.
 */
function getSongbookRepositories() {
	const repos = {};

	Object.keys(songbooks).forEach((bookSlug) => {
		repos[bookSlug] = getSongbookSettings(bookSlug).repository;
	});

	return repos;
}

/**
 * Merged info of one book: the package's songbook.json, the site settings
 * (they win on conflicts; `repository` is install-only) and the song count.
 * `sort_order` is the book's position in source/songbooks.json.
 * Expects the book to be already copied into source/books/<slug>.
 * @param bookSlug {string}
 * @return {Object}
 */
function createSongbookInfo(bookSlug) {
	const packageInfo = require(path.resolve(
		__dirname,
		'..',
		CONST.FOLDER.SHARED,
		CONST.FOLDER.NODE_MODULES,
		bookSlug,
		CONST.FILES.BOOK_INFO
	));
	const { repository, ...settings } = getSongbookSettings(bookSlug);

	return {
		...packageInfo,
		...settings,
		sort_order: Object.keys(songbooks).indexOf(bookSlug) + 1,
		songsCount: countTranslatedSongs(bookSlug)
	};
}

/**
 * @param bookSlug {string}
 * @return {number}
 */
function countTranslatedSongs(bookSlug) {
	const songsDir = path.resolve(
		__dirname,
		'..',
		`${CONST.FOLDER.SRC_OUTPUT}/${bookSlug}`,
		CONST.FOLDER.SONGS
	);

	return readdirSync(songsDir).filter((file) => {
		try {
			return !readFileSync(path.join(songsDir, file), 'utf8').includes('"translation": "no"');
		} catch (err) {
			return false;
		}
	}).length;
}

/**/
module.exports = {
	createSongbookInfo,
	getSongbookRepositories
};
