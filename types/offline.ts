/** `cached / total` of one kind of file of a songbook. */
export type TCacheCount = { cached: number; total: number };

/** A group of files the book job checked: all of them, and those not in the cache after the check. */
export type TCachedFiles = { files: Array<string>; missing: Array<string> };

/**
 * Status record of the files every songbook shares. The service worker keeps
 * it as `/data/cache-status.json` in the build's cache; every book job checks
 * the listed files and writes it again.
 */
export type TSharedCacheRecord = {
  /** The shell: `/shell/`, `/`, their JS/CSS and the font. Listed on install. */
  appFiles: TCachedFiles;
  /** Logos and covers, listed in the bundle; `null` until the first book job. */
  images: TCachedFiles | null;
};

/** Status record of one songbook, kept as `/data/<book>/cache-status.json`. */
export type TBookCacheRecord = {
  /** On Save-Data they are listed and looked up, not fetched. */
  contentImages: TCachedFiles;
};

/**
 * Offline state of one songbook, as the service worker reports it
 * (`public/sw.js`, `ensureBook`).
 */
export type TBookCacheStatus = {
  bookId: string;
  /** The bundle is in the cache: every page of the book works offline. */
  pages: boolean;
  /** `cached`: the bundle and both status records exist (the static files were checked). */
  state: 'none' | 'caching' | 'cached' | 'error';
  /** 0..1 while caching: finished items / all items. */
  progress?: number;
  error?: string;
  /** Logos and covers, from the shared record. */
  images?: TCacheCount;
  /** From the book's record. The total counts also when Save-Data skipped them. */
  contentImages?: TCacheCount;
};

/** Reply of the worker to `GET_CACHE_STATUS`; books with nothing cached are left out. */
export type TCacheStatusReply = {
  build: string;
  books: Record<string, TBookCacheStatus>;
};

/** Cache entries of one group: their bytes and how many there are. */
export type TCacheSize = { bytes: number; count: number };

/** A group of images with a known list: `total` is the listed ones (plus any other cached). */
export type TCacheImages = TCacheSize & { total: number };

/**
 * Reply of the worker to `GET_BOOK_CACHE_INFO`: needs a full cache listing and
 * reads every body, so it is asked only on demand.
 */
export type TBookCacheInfo = {
  bookId: string;
  /** Pages in the cached bundle; 0 without it. */
  pages: number;
  /** `/data/<book>/**`: the bundle, page entries and the book's record. */
  texts: TCacheSize;
  /** Content images of the book (`/images/resources/**` listed in its bundle). */
  bookImages: TCacheImages;
  /** Other `/images/**`: logos, covers and thumbnails of all books. */
  appImages: TCacheImages;
  /** Cached HTML documents: `/shell/` and pages of every book. */
  appHtml: TCacheSize;
  /** Everything else of the app: JS, CSS, fonts, the shared record. */
  appResources: TCacheSize;
  /** This book and the app: the five groups above. */
  bookTotalBytes: number;
  /** The whole cache: the app and every cached book. */
  allTotalBytes: number;
};
