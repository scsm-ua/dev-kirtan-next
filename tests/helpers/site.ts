import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { ROOT } from '@/tests/helpers/books';

/**
 * Reads the static build that L6 checks (.github/plans/2026-11-16_plan-tests.md, L6):
 * `KIRTAN_BUILD_DIR` (the test build by default, `out` in deploy).
 */

export const SITE_DIR = path.resolve(ROOT, process.env.KIRTAN_BUILD_DIR || '.test-output/site');
export const ORIGIN = new URL(process.env.NEXT_PUBLIC_ORIGIN).origin;

/** Text of a file of the build, by its path inside the build (`en/index.html`). */
export function readSiteFile(file: string): string {
  return readFileSync(path.join(SITE_DIR, file), 'utf8');
}

/** Files of the build under `dir`, as paths inside the build with `/`. */
export function listSiteFiles(dir = ''): string[] {
  return readdirSync(path.join(SITE_DIR, dir), { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(SITE_DIR, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'));
}

/**
 * File a static server sends for a URL path of this site (`/en/x/` →
 * `en/x/index.html`), or `null`. Query and hash are ignored.
 */
export function resolveSitePath(urlPath: string): string | null {
  const pathname = decodeURIComponent(urlPath.replace(/[?#].*$/, '')).replace(/^\/+/, '');
  const file = pathname === '' || pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const abs = path.join(SITE_DIR, file);

  return existsSync(abs) && statSync(abs).isFile() ? file : null;
}

/** Path on this site of a link (relative to the page, root-relative or absolute), or `null` for another site. */
export function getSitePath(href: string, pagePath: string): string | null {
  const url = new URL(href, ORIGIN + pagePath);
  return url.origin === ORIGIN ? url.pathname : null;
}

/** HTML file of an app page path (`/en/contents/` → `en/contents/index.html`). */
export function getHtmlFile(pagePath: string): string {
  return `${pagePath.replace(/^\/+/, '')}index.html`;
}

/**/
export function readJsonFile<T>(file: string): T {
  return JSON.parse(readSiteFile(file));
}

/** The build exists and was made for this origin; otherwise a message that says what to run. */
export function getMissingBuildMessage(): string | null {
  if (!existsSync(path.join(SITE_DIR, 'sitemap.xml'))) {
    return `No build in ${path.relative(ROOT, SITE_DIR)}/. Run \`pnpm run build:test\` first.`;
  }
  if (!readSiteFile('sitemap.xml').includes(`<loc>${ORIGIN}/`)) {
    return `The build in ${path.relative(ROOT, SITE_DIR)}/ was made for another origin than ${ORIGIN}.`;
  }

  return null;
}

/* Page data inside the HTML ------------------------------------------------- */

type TFlightRow = { json?: string; text?: string };

/**
 * Page data the HTML page hydrates from: the `initial` prop of `AppRoot` in the
 * React Server Components payload (`self.__next_f.push` scripts).
 * `undefined` when the page has no such prop.
 */
export function readHtmlPageData(html: string): unknown {
  const rows = readFlightRows(html);
  const marker = '"initial":';

  for (const row of rows.values()) {
    const start = row.json?.indexOf(marker) ?? -1;
    if (start < 0) continue;
    if (row.json.startsWith('null', start + marker.length)) return null;

    const raw = sliceJsonValue(row.json, start + marker.length);
    return decodeFlightValue(rows, JSON.parse(raw));
  }

  return undefined;
}

/** Rows of the payload by id. Text rows (`T<hex byte length>,`) have no line end. */
function readFlightRows(html: string): Map<string, TFlightRow> {
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)];
  const buf = Buffer.from(chunks.map((match) => JSON.parse(match[1])).join(''));
  const rows = new Map<string, TFlightRow>();

  for (let i = 0; i < buf.length; ) {
    const colon = buf.indexOf(':', i);
    const id = buf.toString('utf8', i, colon);

    if (buf.toString('utf8', colon + 1, colon + 2) === 'T') {
      const comma = buf.indexOf(',', colon);
      const end = comma + 1 + parseInt(buf.toString('utf8', colon + 2, comma), 16);
      rows.set(id, { text: buf.toString('utf8', comma + 1, end) });
      i = end;
    } else {
      const end = buf.indexOf('\n', colon);
      rows.set(id, { json: buf.toString('utf8', colon + 1, end) });
      i = end + 1;
    }
  }

  return rows;
}

/** The JSON object or array that starts at `start`. */
function sliceJsonValue(text: string, start: number): string {
  let depth = 0;
  let inString = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (char === '\\') i++;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === '{' || char === '[') {
      depth++;
    } else if ((char === '}' || char === ']') && --depth === 0) {
      return text.slice(start, i + 1);
    }
  }

  throw new Error('Unterminated JSON value in the page payload.');
}

/** Plain value of a payload value: `$$x` → `$x`, `$undefined` → no key, `$<row>[:path]` → that value. */
function decodeFlightValue(rows: Map<string, TFlightRow>, value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => decodeFlightValue(rows, item));

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, decodeFlightValue(rows, item)])
        .filter(([, item]) => item !== undefined)
    );
  }

  if (typeof value !== 'string' || !value.startsWith('$')) return value;
  if (value.startsWith('$$')) return value.slice(1);
  if (value === '$undefined') return undefined;

  const [id, ...keys] = value.slice(1).split(':');
  const row = /^[0-9a-f]+$/.test(id) ? rows.get(id) : undefined;
  if (!row) throw new Error(`Unsupported value "${value}" in the page data payload.`);
  if (row.text !== undefined) return row.text;

  let target = JSON.parse(row.json);
  for (const key of keys) {
    // An element is the tuple ["$", type, key, props].
    target = Array.isArray(target) && target[0] === '$' && key === 'props' ? target[3] : target[key];
  }

  return decodeFlightValue(rows, target);
}
