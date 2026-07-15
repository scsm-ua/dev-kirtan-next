const path = require('path');

const { CONST } = require('./constants');
const { readFile } = require('./ioHelpers');
const { validateSongbooks } = require('./validation/validateSongbooks');
const { validateTranslations } = require('./validation/validateTranslations');

/**
 *
 */
function validate() {
	const songbookDeps = readFile(
		path.resolve(__dirname, '..', CONST.FOLDER.SRC_ROOT),
		CONST.FILES.SONGBOOKS
	);
	
	const songbooks = readFile(
		path.resolve(__dirname, '..', CONST.FOLDER.SRC_OUTPUT),
		CONST.FILES.SONGBOOKS
	);
	
	const translations = readFile(
		path.resolve(__dirname, '..', CONST.FOLDER.SRC_ROOT),
		CONST.FILES.TRANSLATIONS
	);
	
	const slugs = Object.keys(songbookDeps);
	validateSongbooks(slugs, songbooks);
	validateTranslations(slugs, translations);
}

/**/
validate();
