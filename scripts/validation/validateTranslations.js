const Ajv = require('ajv');
const chalk = require('chalk');
const { TRANSLATION_VALIDATION_SCHEMA } = require('./validationSchema');

/**
 * @param slugs {Array<string>}
 * @param translations {Object}
 */
function validateTranslations(slugs, translations) {
	validateBookSlugs(slugs, translations);
	
	const ajv = new Ajv();
	const validate = ajv.compile(TRANSLATION_VALIDATION_SCHEMA);
	
	Object.entries(translations).forEach(([lang, obj]) => {
		const valid = validate(obj);
		
		if (!valid) {
			console.error(chalk.bgRedBright.bold(`Validation error: Missing or extra translation key in "${lang}"!`));
			console.error(validate.errors);
			console.error(chalk.bgRedBright('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^'));
			process.exit(1);
		}
	});
}

/**
 * Check that translation for each book is available.
 * @param slugs {Array<string>}
 * @param translations {Object}
 */
function validateBookSlugs(slugs, translations) {
	const ajv = new Ajv();
	const langSet = new Set();
	
	const props = {};
	const required = [];
	
	slugs.forEach((slug) => langSet.add(slug.slice(0, 2)));
	
	Array.from(langSet).forEach((lang) => {
		props[lang] = { type: 'object' };
		required.push(lang);
	});
	
	const languageKeysSchema = {
		type: 'object',
		properties: props,
		required: required
	};
	
	const validate = ajv.compile(languageKeysSchema);
	const valid = validate(translations);
	
	if (!valid) {
		console.error(chalk.bgRedBright.bold('Validation error: Missing language in the translations.json!'));
		console.error(validate.errors);
		console.error(chalk.bgRedBright('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^'));
		process.exit(1);
	}
}

/**/
module.exports = { validateTranslations };
