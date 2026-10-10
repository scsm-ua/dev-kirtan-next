const path = require('path');
const { cpSync, existsSync, mkdirSync } = require('fs');

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

  // Top-level `images` is standalone (page) images meta, not a song slug.
  /** @type {Array<ImageRaw>} */
  const standaloneImages = Array.isArray(resources.images)
    ? resources.images
    : [];
  delete resources.images;

  /** @type {PersonsMap} */
  const personsMap = {};
  persons.forEach(({ id, i18n }) => (personsMap[id] = i18n));

  /** @type {{ [songSlug: string]: ImageRaw }} */
  const images = {};

  Object.entries(resources).forEach(
    ([songSlug, res /** @type {ResourceRaw} */]) => {
      const audio = handleAudio(res.audio, personsMap);
      if (audio) {
        result[songSlug] = { audio };
      }
      if (res.image) {
        images[songSlug] = res.image;
      }
    }
  );

  copyImages(absPathToPackage, images, result);

  const outputDir = path.resolve(__dirname, '..', '..', CONST.FOLDER.SRC_OUTPUT);
  mkdirSync(outputDir, { recursive: true });
  writeFile(outputDir, CONST.FILES.RESOURCES, JSON.stringify(result, null, 2));
  writeImagesMeta(outputDir, standaloneImages);

  return result;
}

/**
 * Writes source/books/images.json — standalone (page) image meta keyed by
 * path relative to images/ (e.g. "en-2026/2.png"), consumed by the page
 * markdown loader to emit <img> tags with intrinsic dimensions.
 * @param outputDir {string}
 * @param images {Array<ImageRaw>}
 */
function writeImagesMeta(outputDir, images) {
  /** @type {{ [rel: string]: Omit<ImageRaw, 'href'> }} */
  const map = {};
  images.forEach(({ href, ...meta }) => {
    const rel = href.replace(new RegExp(`^${CONST.FOLDER.SOURCE_IMAGES}/`), '');
    map[rel] = meta;
  });
  writeFile(outputDir, CONST.FILES.IMAGES, JSON.stringify(map, null, 2));
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
      // Person id is needed to support filtering audio by title.
      personId: a.title,
      title: personsMap[a.title]
    }));
}

/**
 * Copies the resources `images/` folder into public/images/<subdir> and adds
 * the image meta (with a servable `src` path) to each song's resource entry
 * (creating the entry when the song has an image but no audio).
 * @param absPathToPackage {string}
 * @param images {{ [songSlug: string]: ImageRaw }}
 * @param result {ResourceMap}
 */
function copyImages(absPathToPackage, images, result) {
  // Copy the whole folder whenever it exists — page bodies may reference
  // images directly even when no song carries image meta.
  const srcDir = path.resolve(absPathToPackage, CONST.FOLDER.SOURCE_IMAGES);
  if (existsSync(srcDir)) {
    const destDir = path.resolve(
      __dirname,
      '..',
      '..',
      CONST.FOLDER.PUBLIC,
      CONST.FOLDER.TARGET_IMAGES,
      CONST.FOLDER.IMAGES_PUBLIC_SUBDIR
    );
    mkdirSync(destDir, { recursive: true });
    cpSync(srcDir, destDir, { recursive: true });
  }

  Object.entries(images).forEach(([songSlug, imageMeta]) => {
    // href is relative to the package, e.g. "images/en-2026/3.png";
    // strip the leading "images/" and prefix the public path.
    const { href, ...meta } = imageMeta;
    const rel = href.replace(new RegExp(`^${CONST.FOLDER.SOURCE_IMAGES}/`), '');
    const src = `/${CONST.FOLDER.TARGET_IMAGES}/${CONST.FOLDER.IMAGES_PUBLIC_SUBDIR}/${rel}`;
    result[songSlug] = { ...(result[songSlug] || {}), image: { src, ...meta } };
  });
}

/**/
module.exports = { prepareSharedResources };
