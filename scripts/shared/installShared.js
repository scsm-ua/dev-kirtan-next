const path = require('path');
const { execSync } = require('child_process');
const { mkdirSync, writeFileSync } = require('fs');

const chalk = require('chalk');

const { CONST } = require('../constants');
const songbooks = require('../../source/songbooks.json');
const resources = require('../../source/resources.json');

/**/
const SHARED_DIR = path.resolve(__dirname, '..', '..', CONST.FOLDER.SHARED);

/**
 * Phase 1 — download (used for deployment).
 *
 * Installs every book package (source/songbooks.json) + the shared resources
 * package (source/resources.json) in a single `pnpm install` pass into
 * ./shared. Runs from zero on every deploy so the latest versions of the git
 * dependencies are always fetched. The per-book build runs in phase 2 so that
 * local edits to a linked package are always picked up.
 */
function installShared() {
	writeSharedManifest();

	console.log(chalk.bgBlueBright(' Installing shared packages (pnpm) '));
	// --ignore-workspace: ./shared is isolated from the parent pnpm workspace
	//   (pnpm-workspace.yaml at repo root) so packages install into
	//   ./shared/node_modules instead of being hoisted / skipped.
	// --ignore-scripts: skip install-time lifecycle scripts. Phase 2 runs
	//   `pnpm run build` inside each songbook package explicitly, so the
	//   dependency tree is all we need out of phase 1.
	// --config.blockExoticSubdeps=false: pnpm 11 blocks git-URL sub-deps
	//   (e.g. songbook-md-json-parser) by default. The equivalent flag in
	//   .npmrc is ignored in this scope, so it has to be passed on the CLI.
	execSync(
		'pnpm install --ignore-workspace --ignore-scripts'
			+ ' --config.blockExoticSubdeps=false',
		{ cwd: SHARED_DIR, stdio: 'inherit' }
	);
}

/**
 * Generates the ./shared workspace so the set of installed packages always
 * stays in sync with the source of truth. Files written:
 *
 * - package.json — book + resources dependencies aliased under their slugs.
 * - .npmrc — makes pnpm copy files from the store instead of hard-linking
 *   them so the phase-2 in-package builds cannot corrupt the shared store.
 */
function writeSharedManifest() {
	mkdirSync(SHARED_DIR, { recursive: true });

	const pkg = {
		name: 'kirtan-shared',
		version: '1.0.0',
		private: true,
		dependencies: { ...songbooks, ...resources }
	};

	writeFileSync(
		path.join(SHARED_DIR, CONST.FILES.PACKAGE_JSON),
		JSON.stringify(pkg, null, 2)
	);

	writeFileSync(
		path.join(SHARED_DIR, CONST.FILES.NPMRC),
		'package-import-method=copy\n'
	);
}

/**/
installShared();
