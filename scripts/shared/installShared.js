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
	// --ignore-scripts: skip install-time lifecycle scripts. Phase 2 runs
	//   `pnpm run build` inside each songbook package explicitly, so the
	//   dependency tree is all we need out of phase 1.
	// Isolation from the parent workspace and blockExoticSubdeps=false are
	// configured in the generated ./shared/pnpm-workspace.yaml (see
	// writeSharedManifest), so no CLI overrides are needed here — the same
	// config also lets manual `pnpm link` commands run flag-free.
	execSync('pnpm install --ignore-scripts', {
		cwd: SHARED_DIR,
		stdio: 'inherit'
	});
}

/**
 * Generates the ./shared workspace so the set of installed packages always
 * stays in sync with the source of truth. Files written:
 *
 * - package.json — book + resources dependencies aliased under their slugs.
 * - .npmrc — makes pnpm copy files from the store instead of hard-linking
 *   them so the phase-2 in-package builds cannot corrupt the shared store.
 * - pnpm-workspace.yaml — makes ./shared its own workspace root (isolated
 *   from the repo-root workspace) and sets blockExoticSubdeps=false so pnpm
 *   11 allows the git-URL sub-dep (songbook-md-json-parser). Having this here
 *   means `pnpm install` / `pnpm link` in ./shared need no CLI flags.
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

	writeFileSync(
		path.join(SHARED_DIR, CONST.FILES.PNPM_WORKSPACE),
		'blockExoticSubdeps: false\n'
	);
}

/**/
installShared();
