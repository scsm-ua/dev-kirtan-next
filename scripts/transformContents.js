const { CONST } = require('./constants');
const { readFile, writeFile } = require('./ioHelpers');

/**
 * Used to detect song duplicates for handling their page number.
 * @type {string[]}
 */
const songIds = [];

/**
 * @param targetDir {string} - directory of the songbook.
 * @param resourceMap {ResourceMap}
 */
function transformContents(targetDir, resourceMap) {
  const input = transform(
    readFile(targetDir, CONST.FILES.CONTENTS),
    resourceMap,
    targetDir
  );

  const output = JSON.stringify(input, null, 2);
  writeFile(targetDir, CONST.FILES.CONTENTS, output);
}

/**
 * @param groups {Array<RawContentGroup>}
 * @param resourceMap {ResourceMap}
 * @param targetDir {string} - directory of the songbook.
 * @return {Array<ContentGroup>}
 */
function transform(groups, resourceMap, targetDir) {
  const pageIdxDict = getherPageIdxDict(groups, targetDir);

  let itemIdx = 0;
  return groups.map((group) => {
    return {
      name: group.name,
      items: group.items.map((item) => {
				/** @type {RawSong} */
				const rawSong = readFile(`${targetDir}/songs`, `${item.id}.json`);
				const resources = resourceMap[item.id];
	
				/** @type {Song} */
				const song = { ...rawSong, resources };

				applyPageIdxDict(song, itemIdx, pageIdxDict);
				itemIdx++;
	
				writeFile(
					`${targetDir}/songs`,
					`${item.id}.json`,
					JSON.stringify(song, null, 2)
				);
				
				return mapItem(item, song);
			})
    };
  });
}

/**
 * If any of the item's page values is claimed by 2+ items in the dict,
 * rewrites that value in `song.meta.page` to `${page}/N`, where N is this
 * item's position in `dict[page]`.
 * @param song {Song}
 * @param itemIdx {number}
 * @param dict {{ [page: string]: number[] }}
 */
function applyPageIdxDict(song, itemIdx, dict) {
  if (!song.meta || song.meta.page == null) return;

  const rewrite = (v) => {
    const idxs = dict[String(v)];
    if (!idxs || idxs.length < 2) return v;
    const n = idxs.indexOf(itemIdx);
    if (n === -1) {
      return v;
    } else {
      const result = `${v}/${n + 1}`;
      return result;
    }
  };

  const p = song.meta.page;
  const newPageValue = Array.isArray(p) ? p.map(rewrite) : rewrite(p);
  song.meta = { ...song.meta, page: newPageValue };
}

/**
 * Walks contents.json in order and returns a dictionary mapping each page
 * number to the flat item indexes (across all groups) that claim it.
 * Array-page songs contribute the item index under every page they list.
 * @param groups {Array<RawContentGroup>}
 * @param targetDir {string}
 * @return {{ [page: string]: number[] }}
 */
function getherPageIdxDict(groups, targetDir) {
  /** @type {{ [page: string]: number[] }} */
  const dict = {};
  let itemIdx = 0;

  const usedMultipages = {};

  groups.forEach((group) => {
    group.items.forEach((item) => {
      const rawSong = readFile(`${targetDir}/songs`, `${item.id}.json`);
      const rawPage = rawSong && rawSong.meta && rawSong.meta.page;

      if (rawPage) {
        const pages = Array.isArray(rawPage) ? rawPage : [rawPage];

        let usePageIdx = 0;

        if (pages.length > 1) {
          usePageIdx = (item.id in usedMultipages ? usedMultipages[item.id] : -1) + 1;
          usedMultipages[item.id] = usePageIdx;
        }

        if (usePageIdx < pages.length) {

          const page = pages[usePageIdx];
  
          if (page) {
            const key = String(page);
            (dict[key] = dict[key] || []).push(itemIdx);
          }

        } else {
          console.warn(`Not enought page numbers for ${item.id} ${rawPage}`);
        }
      }
      itemIdx++;
    });
  });

  return dict;
}

/**
 * @param meta {RawSongMeta}
 * @param id {string}
 * @return {number}
 */
function getPage(meta, id) {
  if (!meta) return null;

  if (Array.isArray(meta.page)) {
    if (songIds.includes(id)) return meta.page[1];

    songIds.push(id);
    return meta.page[0];
  }

  return meta.page;
}

/**
 * @param meta {RawSongMeta}
 * @return {Array<number>}
 */
function getPages(meta) {
  if (!meta || !meta.page) return [];

  return Array.isArray(meta.page) ? meta.page : [meta.page];
}

/**
 * @param meta {RawSongMeta}
 * @return {Array<string>}
 */
function getAltFirstLines(meta) {
  const alt = meta && meta.alt_first_lines;
  if (!alt) return [];

  return Array.isArray(alt) ? alt : [alt];
}

/**
 * @param item {RawContentItem}
 * @param song {Song}
 * @return {ContentItem}
 */
function mapItem(item, song) {
  const altAliasNames = getAltFirstLines(song.meta);

  const hasNoAuthor = song.meta?.['no-author'] === 1;

  return {
    aliasName: song.meta.first_line,
    ...(altAliasNames.length ? { altAliasNames } : {}),
    author: hasNoAuthor
      ? null
      : song.meta?.author || (song.author && song.author[0]) || null,
    id: item.id,
    page: getPage(song.meta, item.id),
    pages: getPages(song.meta),
    title: item.title,
    has: {
      audio: song.resources?.audio?.length > 0,
      translation:
        !('translation' in song.meta) || song.meta.translation !== 'no'
    }
  };
}

/**/
module.exports = { transformContents };
