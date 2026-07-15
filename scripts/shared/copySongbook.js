const path = require('path');
const { execSync } = require('child_process');
const { mkdirSync } = require('fs');

const { CONST } = require('../constants');

/**
 * Phase 2 — build + copy json (used for all cases, especially local debug).
 *
 * Builds the book package in ./shared/node_modules/<slug> and copies the
 * resulting jsons into the project. The package is expected to be present in
 * ./shared/node_modules (installed by installShared.js, or linked manually for
 * local debug). Building here (rather than in phase 1) ensures local edits are
 * always picked up on rerun.
 * @param targetDir {string}
 * @param bookSlug {string}
 * @param booksMap {Object}
 */
function copySongbook(targetDir, bookSlug, booksMap) {
	const absPathToPackage = path.resolve(
		__dirname,
		'..',
		'..',
		CONST.FOLDER.SHARED,
		CONST.FOLDER.NODE_MODULES,
		bookSlug
	);

	// Build the book package in place.
	execSync('pnpm run build', { cwd: absPathToPackage, stdio: 'inherit' });

	// Copying the jsons to the project.
	mkdirSync(targetDir, { recursive: true });
	execSync(`cp -a ${path.resolve(absPathToPackage, CONST.FOLDER.SRC_INPUT)}/. ${targetDir}`);

	// Inserting the book info into the variable.
	booksMap[bookSlug] = require(path.resolve(absPathToPackage, CONST.FILES.BOOK_INFO));
}

/**/
module.exports = { copySongbook };
