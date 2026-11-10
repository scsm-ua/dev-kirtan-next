function getSingerId(singer) {
  return singer.personSlug || singer.id || '';
}

function getSingerTranslation(singer) {
  const translation = singer.name ?? singer.title;
  if (typeof translation === 'string') return translation;
  return translation?.en || Object.values(translation || {})[0] || '';
}

const SINGER_PRIORITIES = {
  'dev-goswami': 1,
  nabadwip: 2,
  maharaj: 3,
  manasa: 4,
};

const DEFAULT_SINGER_PRIORITY = Math.max(...Object.values(SINGER_PRIORITIES)) + 1;

function sortSingers(singers) {
  const getPriority = (singer) => {
    const id = getSingerId(singer).toLowerCase();
    const match = Object.entries(SINGER_PRIORITIES).find(([term]) => id.includes(term));
    return match ? match[1] : DEFAULT_SINGER_PRIORITY;
  };

  return [...singers].sort((a, b) => {
    if (getPriority(a) !== getPriority(b)) return getPriority(a) - getPriority(b);
    return getSingerTranslation(a).localeCompare(getSingerTranslation(b));
  });
}

module.exports = { sortSingers };
