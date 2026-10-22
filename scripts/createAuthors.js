const { CONST } = require('./constants');
const { readFile, writeFile } = require('./ioHelpers');

/**
 * @param targetDir {string} - directory of the songbook.
 */
function createAuthors(targetDir) {
	const input = create(readFile(targetDir, CONST.FILES.CONTENTS));
	const output = JSON.stringify(input, null, 2);
	writeFile(targetDir, CONST.FILES.AUTHORS, output);
}

/**
 * @param groups {Array<RawContentGroup>}
 * @return {Array<ContentGroup>}
 */
function create(groups) {
	const authors = new Map(); // Author as key : Array<ContentItem> as value.
	const uniqueIds = {};
	
	groups.flatMap((group) => group.items)
		.forEach((item) => {
			if (item.type === 'page' || item.id === 'intro' || item.id in uniqueIds) {
				return;
			}
			
			uniqueIds[item.id] = true;
			
			if (!authors.has(item.author)) {
				return authors.set(item.author, [item]);
			}
			
			const arr = authors.get(item.author);
			authors.set(item.author, [...arr, item]);
		});
	
	return Array.from(authors)
		.map(([author, items]) => ({
			name: author,
			items: items.sort((a, b) => a.title.localeCompare(b.title))
		}))
		.sort((a, b) => a.items.length === b.items.length
			? (a.name || '').localeCompare(b.name || '')    // `author` can be `null`.
			: b.items.length - a.items.length
		);
}

/**/
module.exports = { createAuthors };
