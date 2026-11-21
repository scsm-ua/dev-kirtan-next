const resourcesConfig = require('../source/resources.json');

/**
 * Links to images of the shared resources repo (the git URL in
 * source/resources.json) and their local copy in public/images/resources.
 * Shared by install:post-fetch (lists a book's images) and the content
 * loaders (rewrite the links), so both find the same images.
 */

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// "git+https://github.com/<owner>/<repo>.git#<ref>" -> "https://github.com/<owner>/<repo>"
const RESOURCES_REPO_URL = resourcesConfig.resources
  .replace(/^git\+/, '')
  .replace(/#.*$/, '')
  .replace(/\.git$/, '');
const RESOURCES_RAW_URL = RESOURCES_REPO_URL.replace(
  'https://github.com/',
  'https://raw.githubusercontent.com/'
);

/**
 * `<repo>/(blob|raw)/<branch>/images/<path>?raw=true` or the
 * raw.githubusercontent.com equivalent; branch may contain slashes
 * (e.g. `feature/x`, `refs/heads/x`). Captures the path under images/.
 */
const RESOURCE_URL_PART = `(?:${escapeRegExp(RESOURCES_REPO_URL)}/(?:blob|raw)|${escapeRegExp(RESOURCES_RAW_URL)})/[^)\\s]+?/images/([^)?\\s]+)(?:\\?[^)\\s]*)?`;

/** Public path prefix of the local copy of the resources images. */
const IMG_PUBLIC_PREFIX = '/images/resources/';

/** Markdown image of the resources repo: captures alt and the path under images/. */
const createResourceMdImageRe = () => new RegExp(`!\\[([^\\]]*)\\]\\(${RESOURCE_URL_PART}\\)`, 'g');

/** Markdown link target of the resources repo: captures the path under images/. */
const createResourceLinkRe = () => new RegExp(`\\]\\(${RESOURCE_URL_PART}\\)`, 'g');

/**
 * Public paths (`/images/resources/en/1.jpg`) of the resources-repo images
 * in a markdown text.
 * @param text {string}
 * @return {Array<string>}
 */
function findResourceImages(text) {
  return Array.from(text.matchAll(createResourceMdImageRe()), (m) => IMG_PUBLIC_PREFIX + m[2]);
}

/**/
module.exports = {
  IMG_PUBLIC_PREFIX,
  createResourceLinkRe,
  createResourceMdImageRe,
  findResourceImages
};
