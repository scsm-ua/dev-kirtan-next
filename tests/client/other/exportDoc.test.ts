import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { buildExportHtml } from '@/lib/export';
import {
  DEFAULT_EXPORT_OPTIONS,
  escHtml,
  exportOptionsFromSearch,
  exportOptionsToSearch,
  filterExportBody,
  makeExportFileName,
  wrapExportDoc
} from '@/other/exportDoc';
import { findBook, findSong } from '@/tests/helpers/cases';

import type { TExportOptions } from '@/other/exportDoc';

/** Everything on, nothing filtered out. */
const ALL: TExportOptions = {
  ...DEFAULT_EXPORT_OPTIONS,
  onlyTranslated: false,
  verseNumberMode: 'heading',
  withPageNumbers: true
};

const NAV = '<span class="nav-links"><a href="#toc">↑</a><a href="#first-lines">↓</a></span>';

/** A small document with the same markers as `lib/export.ts` and the content handlers write. */
const BODY = `
<h1 class="book-title">Book</h1>
<p class="nav-links"><a href="#first-lines">↓ Index</a></p>
<section class="toc" id="toc">
  <h1>Contents</h1>
  <h2 class="toc-item-group">Group A</h2>
  <p class="toc-item" data-translated="1"><a href="#song-one">One<span class="page-num"> — 5</span></a></p>
  <p class="toc-item page" data-translated="1"><a href="#song-about">About</a></p>
  <h2 class="toc-item-group">Group B</h2>
  <p class="toc-item" data-translated="0"><a href="#song-two">Two</a></p>
</section>
<section class="category">
  <h1>Group A</h1>
  <section class="song" id="song-one" data-translated="1">
    <div class="verse-block" data-number="1">
      <h2>One ${NAV}</h2>
      <h5>1</h5>
      <p class="verse">verse line</p>
      <p class="wbw">word — meaning</p>
      <p class="translation">translation</p>
    </div>
  </section>
  <section class="song page" id="song-about" data-translated="1">
    <h2>${NAV}</h2>
    <div class="PageMarkdown"><p>About text</p></div>
  </section>
</section>
<section class="category">
  <h1>Group B</h1>
  <section class="song" id="song-two" data-translated="0">
    <div class="verse-block" data-number=""><h2>Two ${NAV}</h2><p class="verse">other line</p></div>
  </section>
</section>
<section class="first-lines" id="first-lines">
  <h1>Index</h1>
  <h2 class="first-line-group">O</h2>
  <p class="first-line" data-translated="1"><a href="#song-one">verse line</a></p>
  <h2 class="first-line-group">T</h2>
  <p class="first-line" data-translated="0"><a href="#song-two">other line</a></p>
</section>`;

/** The filtered document, parsed. */
function filter(options: Partial<TExportOptions>, body = BODY): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = filterExportBody(body, { ...ALL, ...options });
  return root;
}

const count = (root: HTMLElement, selector: string) => root.querySelectorAll(selector).length;

describe('export options in the URL', () => {
  it('writes nothing for the default options', () => {
    expect(exportOptionsToSearch(DEFAULT_EXPORT_OPTIONS)).toBe('');
  });

  it('reads the defaults from an empty query', () => {
    expect(exportOptionsFromSearch('')).toEqual(DEFAULT_EXPORT_OPTIONS);
  });

  it('writes only what differs from the defaults', () => {
    const search = exportOptionsToSearch({ ...DEFAULT_EXPORT_OPTIONS, withToc: false, verseIndent: 0 });

    expect(Object.fromEntries(new URLSearchParams(search))).toEqual({ toc: '0', indent: '0' });
  });

  it('reads back every option it wrote', () => {
    const changed: TExportOptions = {
      onlyTranslated: !DEFAULT_EXPORT_OPTIONS.onlyTranslated,
      verseIndent: 12,
      verseNumberMode: 'translation-prefix',
      withFirstLines: !DEFAULT_EXPORT_OPTIONS.withFirstLines,
      withLinks: !DEFAULT_EXPORT_OPTIONS.withLinks,
      withNavLinks: !DEFAULT_EXPORT_OPTIONS.withNavLinks,
      withPageNumbers: !DEFAULT_EXPORT_OPTIONS.withPageNumbers,
      withPages: !DEFAULT_EXPORT_OPTIONS.withPages,
      withToc: !DEFAULT_EXPORT_OPTIONS.withToc,
      withTranslation: !DEFAULT_EXPORT_OPTIONS.withTranslation,
      withWbw: !DEFAULT_EXPORT_OPTIONS.withWbw
    };

    expect(exportOptionsFromSearch(exportOptionsToSearch(changed))).toEqual(changed);
  });

  it.each([
    ['an unknown verse number mode', 'nums=sideways', 'verseNumberMode'],
    ['an indent that is not a number', 'indent=wide', 'verseIndent']
  ] as const)('falls back to the default for %s', (_name, search, key) => {
    expect(exportOptionsFromSearch(search)[key]).toBe(DEFAULT_EXPORT_OPTIONS[key]);
  });

  it('never reads a negative indent', () => {
    expect(exportOptionsFromSearch('indent=-5').verseIndent).toBe(0);
  });
});

describe('escHtml', () => {
  it('escapes what would start a tag or an entity', () => {
    expect(escHtml('a < b > c & d')).toBe('a &lt; b &gt; c &amp; d');
  });
});

describe('wrapExportDoc', () => {
  it('makes a complete HTML document in the book language', () => {
    const html = wrapExportDoc('<p>Body</p>', 'A & B', 'ua');
    const doc = new DOMParser().parseFromString(html, 'text/html');

    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(doc.documentElement.lang).toBe('ua');
    expect(doc.title).toBe('A & B');
    expect(doc.querySelector('meta[charset]').getAttribute('charset')).toBe('utf-8');
    expect(doc.querySelector('style').textContent).toContain('p.verse');
    expect(doc.body.innerHTML.trim()).toBe('<p>Body</p>');
  });
});

describe('makeExportFileName', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds the local date and time to the name', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 2, 5, 7, 9));

    expect(makeExportFileName('songbook', '.html')).toBe('songbook-2026-03-05-07-09.html');
    expect(makeExportFileName('songbook')).toBe('songbook-2026-03-05-07-09');
  });
});

describe('filterExportBody', () => {
  it('keeps everything when every option is on', () => {
    const root = filter({});

    expect(count(root, 'section.song')).toBe(3);
    expect(count(root, 'p.toc-item')).toBe(3);
    expect(count(root, 'p.first-line')).toBe(2);
    expect(count(root, '.nav-links')).toBe(4);
    expect(count(root, 'span.page-num')).toBe(1);
    expect(count(root, 'h5')).toBe(1);
  });

  it('onlyTranslated: drops the songs without a translation, with their entries and empty groups', () => {
    const root = filter({ onlyTranslated: true });

    expect(root.querySelector('#song-two')).toBeNull();
    expect(count(root, '[data-translated="0"]')).toBe(0);
    expect([...root.querySelectorAll('.category > h1')].map((h) => h.textContent)).toEqual(['Group A']);
    expect([...root.querySelectorAll('.toc-item-group')].map((h) => h.textContent)).toEqual(['Group A']);
    expect([...root.querySelectorAll('.first-line-group')].map((h) => h.textContent)).toEqual(['O']);
  });

  it('withToc off: drops the contents and the links to it', () => {
    const root = filter({ withToc: false });

    expect(root.querySelector('section.toc')).toBeNull();
    expect(count(root, 'a[href="#toc"]')).toBe(0);
    expect(count(root, 'a[href="#first-lines"]')).toBe(4);
  });

  it('withFirstLines off: drops the index and the links to it', () => {
    const root = filter({ withFirstLines: false });

    expect(root.querySelector('section.first-lines')).toBeNull();
    expect(count(root, 'a[href="#first-lines"]')).toBe(0);
    expect(count(root, 'a[href="#toc"]')).toBe(3);
  });

  it('withToc and withFirstLines off: leaves no empty navigation', () => {
    expect(count(filter({ withToc: false, withFirstLines: false }), '.nav-links')).toBe(0);
  });

  it('withPageNumbers off: drops the page numbers', () => {
    expect(count(filter({ withPageNumbers: false }), 'span.page-num')).toBe(0);
  });

  it('withPages off: drops the markdown pages and their entries', () => {
    const root = filter({ withPages: false });

    expect(root.querySelector('#song-about')).toBeNull();
    expect(count(root, '.page')).toBe(0);
    expect(count(root, 'section.song')).toBe(2);
  });

  it('withNavLinks off: drops the navigation but keeps the other links', () => {
    const root = filter({ withNavLinks: false });

    expect(count(root, '.nav-links')).toBe(0);
    expect(count(root, 'p.toc-item a')).toBe(3);
  });

  it('withLinks off: turns every link into plain text', () => {
    const root = filter({ withLinks: false });

    expect(count(root, 'a')).toBe(0);
    expect(count(root, '.nav-links')).toBe(0);
    expect(root.querySelector('p.first-line').textContent).toBe('verse line');
  });

  it('withWbw off: drops the word-by-word', () => {
    const root = filter({ withWbw: false });

    expect(count(root, 'p.wbw')).toBe(0);
    expect(count(root, 'p.translation')).toBe(1);
  });

  it('withTranslation off: drops the translations', () => {
    const root = filter({ withTranslation: false });

    expect(count(root, 'p.translation')).toBe(0);
    expect(count(root, 'p.wbw')).toBe(1);
  });

  it('verseIndent: indents every verse', () => {
    const verses = [...filter({ verseIndent: 12 }).querySelectorAll<HTMLElement>('p.verse')];

    expect(verses.map((verse) => verse.style.marginLeft)).toEqual(['12px', '12px']);
  });

  describe('verseNumberMode', () => {
    it('heading: keeps the number as a heading', () => {
      expect(filter({ verseNumberMode: 'heading' }).querySelector('h5').textContent).toBe('1');
    });

    it('verse-suffix: puts the number after the verse', () => {
      const root = filter({ verseNumberMode: 'verse-suffix' });

      expect(count(root, 'h5')).toBe(0);
      expect(root.querySelector('#song-one p.verse').textContent).toBe('verse line\u00a0\u00a0[1]');
      expect(root.querySelector('#song-two p.verse').textContent).toBe('other line');
    });

    it('translation-prefix: puts the number before the translation', () => {
      const root = filter({ verseNumberMode: 'translation-prefix' });
      const translation = root.querySelector('p.translation');

      expect(count(root, 'h5')).toBe(0);
      expect(translation.firstElementChild.tagName).toBe('STRONG');
      expect(translation.textContent).toBe('1\u00a0\u00a0translation');
    });
  });
});

describe('filterExportBody on a real book', () => {
  let body: string;

  beforeAll(async () => {
    body = (await buildExportHtml(findSong('no-translation').bookId)).body;
  });

  it('finds in the real document every marker the options rely on', () => {
    const root = filter({}, body);

    for (const selector of [
      'section.toc',
      'p.toc-item[data-translated]',
      '.toc-item-group',
      'section.category',
      'section.song[data-translated="0"]',
      'section.song[data-translated="1"]',
      'div.verse-block[data-number]',
      'p.verse',
      'p.translation',
      '.nav-links a[href="#toc"]',
      '.nav-links a[href="#first-lines"]',
      'section.first-lines',
      'p.first-line[data-translated]',
      '.first-line-group',
      'span.page-num'
    ]) {
      expect(count(root, selector), selector).toBeGreaterThan(0);
    }
  });

  it('leaves no untranslated song with the default options', () => {
    const root = document.createElement('div');
    root.innerHTML = filterExportBody(body, DEFAULT_EXPORT_OPTIONS);

    expect(count(root, 'section.song')).toBeGreaterThan(0);
    expect(count(root, '[data-translated="0"]')).toBe(0);
    expect(count(root, 'span.page-num')).toBe(0);
  });

  it('marks the pages and their entries in a book that has markdown pages', async () => {
    const pagesBody = (await buildExportHtml(findBook('markdown-pages'))).body;
    const root = document.createElement('div');
    root.innerHTML = pagesBody;

    expect(count(root, 'section.song.page')).toBeGreaterThan(0);
    expect(count(root, 'p.toc-item.page')).toBe(count(root, 'section.song.page'));
  });
});
