/**/
if (!process.env.NEXT_PUBLIC_ORIGIN) {
  throw new Error('NEXT_PUBLIC_ORIGIN is not set');
}

/**/
export const SITE = {
  NAME: 'Kirtan Site',
  ORIGIN: process.env.NEXT_PUBLIC_ORIGIN
};

/**/
export const FILES = {
  A_Z: 'a-z.json',
  AUTHORS: 'authors.json',
  CONTENTS: 'contents.json',
  PERSONS: 'persons.json',
  RESOURCES: 'resources.json',
  SITEMAP: 'sitemap.xml',
  SONGBOOKS: 'songbooks.json'
};

/**/
export const PATH = {
  DIR: {
    PAGES: 'pages',
    SONGS: 'songs',
    SOURCE_BOOKS: 'source/books',
    SOURCE_ROOT: 'source'
  },
  IMG: {
    COVER: SITE.ORIGIN + 'images/cover/',
    FAV: SITE.ORIGIN + 'images/favicon/',
    LOGO: SITE.ORIGIN + 'images/svg/kirtan-site.svg',
    SVG: SITE.ORIGIN + 'images/svg/',
    THUMBNAIL: SITE.ORIGIN + 'images/thumbnail/'
  }
};

/**/
export const PREFERENCES = {
  PREFERRED_BOOK_ID: 'CURRENT_BOOK_ID'
};
