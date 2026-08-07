/**
 * Pure helpers shared by the server-side builder (`lib/export.ts`) and the
 * client-side export view. Must stay free of node/fs imports.
 */

/**/
export type TVerseNumberMode = 'heading' | 'verse-suffix' | 'translation-prefix';

/**/
export type TExportOptions = {
  onlyTranslated: boolean;
  verseIndent: number;
  verseNumberMode: TVerseNumberMode;
  withFirstLines: boolean;
  withLinks: boolean;
  withNavLinks: boolean;
  withPageNumbers: boolean;
  withToc: boolean;
  withTranslation: boolean;
  withWbw: boolean;
};

/**/
export const DEFAULT_EXPORT_OPTIONS: TExportOptions = {
  onlyTranslated: true,
  verseIndent: 40,
  verseNumberMode: 'verse-suffix',
  withFirstLines: true,
  withLinks: true,
  withNavLinks: true,
  withPageNumbers: false,
  withToc: true,
  withTranslation: true,
  withWbw: true
};

const VERSE_NUMBER_MODES: readonly TVerseNumberMode[] = [
  'heading',
  'verse-suffix',
  'translation-prefix'
];

type BoolOptionKey = {
  [K in keyof TExportOptions]: TExportOptions[K] extends boolean ? K : never;
}[keyof TExportOptions];

// Drives both serialization and deserialization — add new bool options here only.
const BOOL_PARAMS: ReadonlyArray<{ key: BoolOptionKey; param: string }> = [
  { key: 'onlyTranslated', param: 'translated' },
  { key: 'withWbw', param: 'wbw' },
  { key: 'withToc', param: 'toc' },
  { key: 'withFirstLines', param: 'index' },
  { key: 'withPageNumbers', param: 'pages' },
  { key: 'withNavLinks', param: 'nav' },
  { key: 'withLinks', param: 'links' },
  { key: 'withTranslation', param: 'trans' }
];

/**
 * Serializes options to a URL query string so the current view can be
 * shared / restored on refresh. Values matching the defaults are omitted
 * so the URL stays clean.
 */
export function exportOptionsToSearch(opts: TExportOptions): string {
  const p = new URLSearchParams();
  for (const { key, param } of BOOL_PARAMS) {
    if (opts[key] !== DEFAULT_EXPORT_OPTIONS[key]) {
      p.set(param, opts[key] ? '1' : '0');
    }
  }
  if (opts.verseIndent !== DEFAULT_EXPORT_OPTIONS.verseIndent) {
    p.set('indent', String(opts.verseIndent));
  }
  if (opts.verseNumberMode !== DEFAULT_EXPORT_OPTIONS.verseNumberMode) {
    p.set('nums', opts.verseNumberMode);
  }
  return p.toString();
}

/**
 * Reads options from a query string, falling back to defaults for missing
 * or invalid values. Absent param always resolves to the default — no
 * manual default/direction tracking needed.
 */
export function exportOptionsFromSearch(search: string): TExportOptions {
  const p = new URLSearchParams(search);
  const nums = p.get('nums') as TVerseNumberMode | null;

  const bools = Object.fromEntries(
    BOOL_PARAMS.map(({ key, param }) => [
      key,
      p.has(param) ? p.get(param) === '1' : DEFAULT_EXPORT_OPTIONS[key]
    ])
  ) as Pick<TExportOptions, BoolOptionKey>;

  return {
    ...bools,
    verseNumberMode:
      nums && VERSE_NUMBER_MODES.includes(nums)
        ? nums
        : DEFAULT_EXPORT_OPTIONS.verseNumberMode,
    verseIndent: p.has('indent')
      ? Math.max(0, Number(p.get('indent')) || DEFAULT_EXPORT_OPTIONS.verseIndent)
      : DEFAULT_EXPORT_OPTIONS.verseIndent
  };
}

/**
 * Minimal styles: Word/LibreOffice turn each CSS class into a named
 * paragraph style on import, so keep one class per semantic block.
 */
export const DOC_STYLE = `
  p.wbw { font-size: 0.9em; }
  p.verse { margin-left: 40px; }
  div.verse-block { page-break-inside: avoid; break-inside: avoid; }
  section.category h1 { page-break-before: always; break-before: page; }
  p.toc-item { }
  p.first-line { }
  h5 { text-align: center; }
  span.nav-links { font-size: 0.6em; font-weight: normal; }
`;

/**
 *
 */
export function makeExportFileName(baseName: string, ext = ''): string {
  const d = new Date();
  const ts = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0')
  ].join('-');
  return `${baseName}-${ts}${ext}`;
}

export function escHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/**
 * Wraps the document body into a standalone HTML file.
 */
export function wrapExportDoc(
  body: string,
  title: string,
  lang: string
): string {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<title>${escHtml(title)}</title>
<style>${DOC_STYLE}</style>
</head>
<body>
${body}</body>
</html>
`;
}

/**
 * Applies the toolbar options to the prebuilt body. Browser only — relies
 * on `DOMParser` so the markup markers stay the single source of truth.
 */
export function filterExportBody(
  body: string,
  {
    onlyTranslated,
    verseIndent,
    verseNumberMode,
    withFirstLines,
    withLinks,
    withNavLinks,
    withPageNumbers,
    withToc,
    withTranslation,
    withWbw
  }: TExportOptions
): string {
  const parsed = new DOMParser().parseFromString(
    `<div>${body}</div>`,
    'text/html'
  );
  const root = parsed.body.firstElementChild as HTMLElement;

  if (!withToc) {
    root.querySelector('section.toc')?.remove();
    root.querySelectorAll('.nav-links a[href="#toc"]').forEach((el) => el.remove());
    root.querySelectorAll('.nav-links').forEach((el) => {
      if (!el.querySelector('a')) el.remove();
    });
  }
  if (!withFirstLines) {
    root.querySelector('section.first-lines')?.remove();
    // Strip now-broken links to the removed anchor; drop empty nav containers.
    root.querySelectorAll('.nav-links a[href="#first-lines"]').forEach((el) => el.remove());
    root.querySelectorAll('.nav-links').forEach((el) => {
      if (!el.querySelector('a')) el.remove();
    });
  }
  if (!withPageNumbers) {
    root.querySelectorAll('span.page-num').forEach((el) => el.remove());
  }
  if (!withNavLinks || !withLinks) {
    root.querySelectorAll('.nav-links').forEach((el) => el.remove());
  }

  if (!withLinks) {
    // Replace every <a> with a plain text span so Word/PDF has no hyperlinks.
    root.querySelectorAll('a').forEach((a) => {
      const span = parsed.createElement('span');
      span.textContent = a.textContent;
      a.replaceWith(span);
    });
  }

  root.querySelectorAll<HTMLElement>('p.verse').forEach((el) => {
    el.style.marginLeft = `${verseIndent}px`;
  });

  if (onlyTranslated) {
    root
      .querySelectorAll('.song:not([data-translated="1"])')
      .forEach((el) => el.remove());
    root
      .querySelectorAll('.first-line:not([data-translated="1"])')
      .forEach((el) => el.remove());
    root
      .querySelectorAll('.toc-item:not([data-translated="1"])')
      .forEach((el) => el.remove());
  }

  if (!withWbw) {
    root.querySelectorAll('p.wbw').forEach((el) => el.remove());
  }

  if (!withTranslation) {
    root.querySelectorAll('p.translation').forEach((el) => el.remove());
  }

  if (verseNumberMode !== 'heading') {
    root.querySelectorAll('.verse-block').forEach((block) => {
      const num = block.getAttribute('data-number');
      if (!num) return;
      block.querySelector('h5')?.remove();

      if (verseNumberMode === 'verse-suffix') {
        const verse = block.querySelector('p.verse');
        if (verse) verse.appendChild(parsed.createTextNode(`\u00a0\u00a0[${num}]`));
      } else {
        const trans = block.querySelector('p.translation');
        if (trans) {
          const strong = parsed.createElement('strong');
          strong.textContent = `${num}\u00a0\u00a0`;
          trans.prepend(strong);
        }
      }
    });
  }

  // Drop category headings left without songs.
  root.querySelectorAll('.category').forEach((el) => {
    if (!el.querySelector('.song')) el.remove();
  });

  // Drop empty group headings after filtering (shared logic for both index types).
  ['toc-item-group', 'first-line-group'].forEach((groupCls) => {
    const itemCls = groupCls.replace('-group', '');
    root.querySelectorAll(`.${groupCls}`).forEach((h) => {
      let next = h.nextElementSibling;
      while (next && !next.classList.contains(groupCls)) {
        if (next.classList.contains(itemCls)) return;
        next = next.nextElementSibling;
      }
      h.remove();
    });
  });

  return root.innerHTML;
}
