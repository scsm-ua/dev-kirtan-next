const { CONST } = require('./constants');
const { compareFirstLines, stripMarks } = require('./compareHelpers');
const { readFile, writeFile } = require('./ioHelpers');

/**
 * @param targetDir {string} - directory of the songbook.
 */
function createAZ(targetDir) {
	const input = convert(readFile(targetDir, CONST.FILES.CONTENTS));
	const output = JSON.stringify(input, null, 2);
	writeFile(targetDir, CONST.FILES.A_Z, output);
}

/**
 * @param groups {Array<ContentGroup>}
 * @return {Array<ContentGroup>}
 */
function convert(groups) {
	const list = new Map();
	
	makeLineVersions(
		groups.flatMap((cat) => cat.items)
	).sort((a, b) => compareFirstLines(a.aliasName, b.aliasName))
		.forEach((item) => {
			const firstLetter = getFirstLetter(item);
			if (!list.has(firstLetter)) {
				return list.set(firstLetter, [item]);
			}
			
			const arr = list.get(firstLetter);
			list.set(firstLetter, [...arr, item]);
		});
	
	return Array.from(list.entries())
		.sort(((a, b) => a[0].localeCompare(b[0])))
		.map(([letter, items]) => ({
			name: letter.toUpperCase(),
			items: items.map((item) => ({
				...item,
				// Swapping `aliasName` and `title`.
				aliasName: item.title,
				title: item.aliasName
			}))
		}));
}

/**
 * Checking for the aliasNames that are prefixed with words
 * in brackets, such as `(кіба) джая...`. Making duplicates for them.
 * @param items {Array<ContentItem>}
 * @returns {Array<ContentItem>}
 */
function makeLineVersions(items) {
	const result = [];
	const uniqueIds = {};
	
	items.forEach((item) => {
		// Skip intro and pages (no first line) from index.
		// (Song has mandatory first_line in schema parser).
		if (item.id in uniqueIds || item.id === 'intro' || !item.aliasName) return;
		
		uniqueIds[item.id] = true;
		const { aliasName, altAliasNames, ...rest } = item;
		const seen = new Set();
		
		// The main first line plus any additional (alt) first lines.
		[aliasName, ...(altAliasNames || [])].forEach((line) => {
			pushLineVersions(result, rest, line, seen);
		});
	});
	
	return result;
}

/**
 * Pushes an index entry for a first line, plus a bracket-stripped
 * duplicate when the line is prefixed with words in brackets.
 * Skips aliases already generated for the same song.
 * @param result {Array<ContentItem>}
 * @param item {ContentItem} - the item without its alias fields.
 * @param line {string}
 * @param seen {Set<string>} - aliases already added for this song.
 */
function pushLineVersions(result, item, line, seen) {
	const alias = processLineEnding(line);
	
	if (!seen.has(alias)) {
		seen.add(alias);
		result.push({
			...item,
			aliasName: alias
		})
	}
	
	// Do not put empty alias when all word in braces.
	const idx = alias.indexOf(')');
	
	if (idx > -1 && idx < alias.length - 1) {
		const stripped = alias.slice(idx + 1).trim();
		
		if (!seen.has(stripped)) {
			seen.add(stripped);
			result.push({
				...item,
				aliasName: stripped
			})
		}
	}
}

/**
 * Some lines (alisNames) may end with a comma or hyphen which need to be removed.
 * @param line {string}
 * @returns {string}
 */
function processLineEnding(line) {
	const len = line.length - 1;
	let idx = line.lastIndexOf('-');
	if (idx === len) return line.slice(0, idx);
	
	idx = line.lastIndexOf(',');
	if (idx === len) return line.slice(0, idx);
	
	return line;
}

/**
 * Some lines may start with a bracket, e.g. `(кіба) джая...`.
 * @param item {ContentItem}
 * @returns {string}
 */
function getFirstLetter(item) {
	const letter = ((item.aliasName.startsWith('(')
		|| item.aliasName.startsWith('‘')
		|| item.aliasName.startsWith('«'))
		? item.aliasName[1]
		: item.aliasName[0]).toLowerCase();

	// Unite Latin letters with diacritics (ā, ś, ṭ) under the base letter; keep Cyrillic (й, ё) as is.
	const base = stripMarks(letter);
	return /^[a-z]$/.test(base) ? base : letter;
}

/**/
module.exports = { createAZ };
