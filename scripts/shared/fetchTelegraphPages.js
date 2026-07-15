const path = require('path');
const { writeFileSync } = require('fs');

const chalk = require('chalk');

/**/
const SOURCE_URL =
	'https://raw.githubusercontent.com/scsm-ua/kirtan-mate/main/data/telegraph-pages.json';
const TARGET_PATH = path.resolve(__dirname, '..', '..', 'source', 'telegraph-pages.json');

/**
 * Downloads the latest telegraph-pages.json from the kirtan-mate repo into
 * source/telegraph-pages.json. Runs alongside the songbook + resources install
 * so all upstream data is refreshed in a single deployment phase.
 */
async function fetchTelegraphPages() {
	console.log(chalk.bgBlueBright(' Fetching telegraph-pages.json '));

	const res = await fetch(SOURCE_URL);
	if (!res.ok) {
		throw new Error(`Failed to fetch ${SOURCE_URL}: ${res.status} ${res.statusText}`);
	}

	// Validate + normalize formatting.
	const data = await res.json();
	writeFileSync(TARGET_PATH, JSON.stringify(data, null, 2) + '\n');

	console.log(chalk.green(`✓ Wrote ${data.length} entries to source/telegraph-pages.json`));
}

/**/
fetchTelegraphPages().catch((err) => {
	console.error(chalk.bgRedBright.bold(err.message));
	process.exit(1);
});
