/**
 * @typedef {Object} RawContentGroup
 * @property {Array<RawContentItem>} items
 * @property {string} name
 */

/**
 * @typedef {Object} RawContentItem
 * @property {string} filepath
 * @property {string} id - slug of the song.
 * @property {string} title
 */

/**
 * @typedef {Object} RawSong
 * @property {Array<string>} [author]
 * @property {RawSongMeta} meta
 */

/**
 * @typedef {Object} Song
 * @property {Array<string>} [author]
 * @property {RawSongMeta} meta
 * @property {ResourceObj} [resources]
 */

/**
 * @typedef {Object} RawSongMeta
 * @property {string} [author]
 * @property {1} ['no-author'] - when `1`, the song is treated as having no author.
 * @property {string} first_line
 * @property {string | Array<string>} [alt_first_lines]
 * @property {'non bold'} ['inline verse']
 * @property {number | string | Array<number>} page
 * @property {'no'} [translation]
 * @property {'non bold'} ['verse parentheses']
 */

/**
 * @typedef {Object} RawEmbed
 * @property {string} embed_code
 * @property {string} embed_url
 * @property {string} iframe_url
 * @property {string} title
 */

/**
 * @typedef {Object} ContentGroup
 * @property {Array<ContentItem>} items
 * @property {string} name
 */

/**
 * @typedef {Object} ContentItem
 * @property {string} aliasName - the first line of the first verse.
 * @property {Array<string>} [altAliasNames] - additional first lines for the index.
 * @property {string} [author]
 * @property {string} id - slug of the song.
 * @property {number | string} page
 * @property {Array<number | string>} pages
 * @property {string} title
 * @property {Object} has
 * @property {boolean} has.audio
 */

/**
 * @typedef {Object} ImageRaw
 * @property {string} href - image path relative to the resources package.
 * @property {string} type - mime type, e.g. "image/png".
 * @property {number} width
 * @property {number} height
 * @property {number} length - file size in bytes.
 */

/**
 * @typedef {Object} ImageObj
 * @property {string} src - servable public image path.
 * @property {string} type
 * @property {number} width
 * @property {number} height
 * @property {number} length
 */

/**
 * @typedef {Object} ResourceRaw
 * @property {Array<AudioRaw>} [audio]
 * @property {ImageRaw} [image] - image meta relative to the resources package.
 */

/**
 * @typedef {Object} ResourceObj
 * @property {Array<AudioObj>} [audio]
 * @property {ImageObj} [image] - image meta with a servable public path.
 */

/**
 * @typedef {Object} AudioRaw
 * @property {string} embed_url
 * @property {string} iframe_url
 * @property {string} title
 */

/**
 * @typedef {Object} AudioObj
 * @property {string} embed_url
 * @property {string} iframe_url
 * @property {string} personId - raw title (person id), used by the per-book
 *   audio filter and stripped before the resource is written into a song json.
 * @property {I18n} title
 */

/**
 * @typedef {Object} I18n
 * @property {string} en
 * @property {string} [es]
 * @property {string} [lv]
 * @property {string} [pt]
 * @property {string} [ru]
 * @property {string} [ua]
 */

/**
 * @typedef {Object} Person
 * @property {string} id
 * @property {I18n} i18n
 */

/**
 * @typedef {{ [songSlug: string]: ResourceObj }} ResourceMap
 */
