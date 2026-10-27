const deburr = require('lodash.deburr');

/**
 * For the sake of correct comparison some symbols should be omitted.
 * @param str {string}
 * @returns {string}
 */
function cleanForCompare(str) {
	return stripMarks(deburr(str))
		.replace(/[«,\-'‘’()]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Removes combining marks (deburr keeps dot-below letters like `ṭ`).
 * @param str {string}
 * @returns {string}
 */
function stripMarks(str) {
	return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * @param a {string}
 * @param b {string}
 * @returns {number}
 */
function compareFirstLines(a, b) {
	return cleanForCompare(a).localeCompare(cleanForCompare(b), undefined, { numeric: true });
}

module.exports = { compareFirstLines, stripMarks };
