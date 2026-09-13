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
 * @typedef {Object} ResourceRaw
 * @property {Array<AudioRaw>} audio
 */

/**
 * @typedef {Object} ResourceObj
 * @property {Array<AudioObj>} audio
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
