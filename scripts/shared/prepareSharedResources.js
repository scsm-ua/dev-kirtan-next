const path = require('path');
const { mkdirSync } = require('fs');

const { CONST } = require('../constants');
const { readFile, writeFile } = require('../ioHelpers');

/**
 * @typedef {{ [personId: string]: I18n }} PersonsMap
 */

/**
 * Phase 2 — reads the shared resources package that was installed into
 * ./shared/node_modules by installShared.js (or linked manually for local
 * debug), transforms it and writes source/books/resources.json.
 * @return {ResourceMap}
 */
function prepareSharedResources() {
  const absPathToPackage = path.resolve(
    __dirname,
    '..',
    '..',
    CONST.FOLDER.SHARED,
    CONST.FOLDER.NODE_MODULES,
    CONST.RESOURCES_KEY
  );

  /** @type {ResourceMap} */
  const result = {};

  /** @type {Array<Person>} */
  const persons = readFile(absPathToPackage, CONST.FILES.PERSONS);

  /** @type {{ [songSlug: string]: ResourceRaw }} */
  const resources = readFile(absPathToPackage, CONST.FILES.RESOURCES);

  /** @type {PersonsMap} */
  const personsMap = {};
  persons.forEach(({ id, i18n }) => (personsMap[id] = i18n));

  Object.entries(resources).forEach(
    ([songSlug, res /** @type {ResourceRaw} */]) => {
      const audio = handleAudio(res.audio, personsMap);
      result[songSlug] = audio ? { audio } : {};
    }
  );

  const outputDir = path.resolve(__dirname, '..', '..', CONST.FOLDER.SRC_OUTPUT);
  mkdirSync(outputDir, { recursive: true });
  writeFile(outputDir, CONST.FILES.RESOURCES, JSON.stringify(result, null, 2));

  return result;
}

/**
 *
 * @param audioArr {Array<AudioRaw> | void}
 * @param personsMap {PersonsMap}
 * @return {Array<AudioObj> | void}
 */
function handleAudio(audioArr, personsMap) {
  if (!audioArr) return;

  return audioArr
    .sort((a) => (a.title.includes('Dev-Goswami') ? -1 : 1))
    .map((a) => ({
      ...a,
      title: personsMap[a.title]
    }));
}

/**/
module.exports = { prepareSharedResources };
