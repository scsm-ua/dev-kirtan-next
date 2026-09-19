const fs = require('node:fs');
const path = require('node:path');

/**
 * Absolute path -> raw JSON text. Reset by `writeFile` so subsequent reads
 * see fresh content. Raw text (not parsed) is cached so callers can safely
 * mutate the returned object without affecting other reads.
 * @type {Map<string, string>}
 */
const rawCache = new Map();

/**
 * @param dir {string}
 * @param filename {string}
 * @returns {*}
 */
function readFile(dir, filename) {
  const absPath = path.resolve(dir, filename);
  try {
    let raw = rawCache.get(absPath);
    if (raw === undefined) {
      raw = fs.readFileSync(absPath, 'utf8');
      rawCache.set(absPath, raw);
    }
    return JSON.parse(raw);

  } catch (err) {
    console.error(`Error reading file "${filename}" in ${dir}`);
  }
}

/**
 * @param dir {string}
 * @param fileName {string}
 * @param content {string}
 * @returns {*|undefined}
 */
function writeFile(dir, fileName, content) {
	const absPath = path.join(dir, fileName);
	try {
		const result = fs.writeFileSync(absPath, content);
		rawCache.delete(absPath);
		return result;
	} catch (e) {
		console.error(e);
	}
}

/**/
module.exports = {
  readFile,
	writeFile
};
