const chalk = require('chalk');
const path = require('path');

/**/
const { addSongsCount } = require('./addSongsCount');
const { CONST } = require('./constants');
const { createAuthors } = require('./createAuthors');
const { createAZ } = require('./createAZ');
const songbooks = require('../source/songbooks.json');
const { prepareSharedResources } = require('./shared/prepareSharedResources');
const { copySongbook } = require('./shared/copySongbook');
const { transformContents } = require('./transformContents');
const { writeFile } = require('./ioHelpers');

/**/
const booksMap = {};
const resourceMap = prepareSharedResources();

/**
 *
 */
Object.keys(songbooks).forEach((bookSlug) => {
	console.log(
		chalk.bgBlueBright('~~~~~~~~~~~~~~~ Processing '),
		chalk.bgYellow.underline.bold(bookSlug),
		chalk.bgBlueBright(' ~~~~~~~~~~~~~~~~~~~~~~~~~~')
	);
	
	const targetDir = path.resolve(__dirname, '..', `${CONST.FOLDER.SRC_OUTPUT}/${bookSlug}`);
	
	try {
		// Order matters.
		copySongbook(targetDir, bookSlug, booksMap);
		addSongsCount(booksMap, bookSlug);
		
		transformContents(targetDir, resourceMap);
		createAZ(targetDir);
		createAuthors(targetDir);
		
	} catch (e) {
		console.error(chalk.bgRedBright.bold(bookSlug));
		console.error(chalk.bgRedBright(e));
	}
});

/**/
writeFile(
	path.resolve(__dirname, '..', CONST.FOLDER.SRC_OUTPUT),
	CONST.FILES.SONGBOOKS,
	JSON.stringify(booksMap, null, 2)
);
