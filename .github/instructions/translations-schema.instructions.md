---
description: "Use when editing source/translations.json (adding, renaming, or removing any translation key) or the JSON schema that validates it in scripts/validation/validationSchema.js. Covers keeping the two in sync and the `node scripts/validate.js` check."
applyTo: ["source/translations.json", "scripts/validation/validationSchema.js", "scripts/validation/validateTranslations.js"]
---

# Translations ↔ validation schema

`source/translations.json` is validated at build time against
`TRANSLATION_VALIDATION_SCHEMA` in
[scripts/validation/validationSchema.js](../../scripts/validation/validationSchema.js).
Every schema node uses `additionalProperties: false` and an explicit `required`
list, so the schema and the JSON must stay exactly in sync.

## Rule

Whenever you add, rename, or remove a key in `source/translations.json`, make
the matching change in `validationSchema.js` **in the same edit**:

- **Added key** → add it to both the parent node's `required` array and its
  `properties` map (`{ type: 'string' }` for leaf strings).
- **Renamed key** → update the name in both `required` and `properties`.
- **Removed key** → delete it from both `required` and `properties`.

Apply the change for every language — each language object under the top-level
locale keys (`lv`, `en`, `es`, `ru`, `uk`, `pt`, …) must have identical shape,
since the single schema is compiled once and run against each one.

## Verify

Always run the validator after changing either file:

```sh
node scripts/validate.js
```

It must print nothing and exit 0. `additionalProperties`/`required` errors mean
the schema drifted from the JSON. By default Ajv reports only the first error
per language; compile with `new Ajv({ allErrors: true })` in a throwaway script
if you need the full list.
