const CONST = {
	FILES: {
		AUTHORS: 'authors.json',
		A_Z: 'a-z.json',
		BOOK_INFO: 'songbook.json',
		CONTENTS: 'contents.json',
		NPMRC: '.npmrc',
		PACKAGE_JSON: 'package.json',
		PERSONS: 'persons.json',
		RESOURCES: 'resources.json',
		SONGBOOKS: 'songbooks.json',
		TRANSLATIONS: 'translations.json'
	},
	FOLDER: {
		BUILD: 'out',
		NODE_MODULES: 'node_modules',
		SHARED: 'shared',
		SONGS: 'songs',
		SRC_INPUT: 'json',
		SRC_OUTPUT: 'source/books',
		SRC_ROOT: 'source'
	},
	// Key in source/resources.json for the shared resources package (not a book).
	RESOURCES_KEY: 'resources'
};

module.exports = { CONST };
