# Song Page SEO Analysis

Analysis of the song page (`/[bookId]/[slug]/`) structure for SEO: current state, issues found, and suggested improvements.

Date: 2026-10-19

---

## 1. Current state (what's already good)

| Feature | Status | Where |
|---|---|---|
| Static pre-rendering of all song pages | ✅ | `app/[bookId]/[slug]/page.tsx` (`generateStaticParams`, `dynamicParams: false`) |
| Title / description meta | ✅ | `lib/content/song/meta.ts` |
| Canonical URL (query-less, trailing slash) | ✅ | `alternates.canonical` via `getSongPath` |
| hreflang alternates + `x-default` | ✅ | `getLanguages()` in `lib/content/song/meta.ts` |
| Open Graph + Twitter card | ✅ | `other/metadata/helpers/getOG.ts`, `getTwitter.ts` |
| JSON-LD (`MusicComposition`, `MusicRecording`) | ✅ | `other/metadata/LdJsonSong.tsx` |
| `<html lang>` per book language | ✅ | `components/common/Layout/Layout.tsx` |
| Single `<h1>` with song title | ✅ | `components/song/SongHeader.tsx` |
| robots.txt + sitemap.xml (env-gated indexing) | ✅ | `app/robots.ts`, `app/sitemap.ts` |
| Internal linking (author anchor, prev/next, footer nav) | ✅ | `SongHeader`, `PrevNextNav`, `Footer` |

The foundation is solid. Items below are ordered roughly by impact.

---

## 2. Bugs (fix first)

### 2.1 Shared `KEYWORDS` array is mutated per song — HIGH ✅ DONE

`getKeywords()` in `lib/content/song/meta.ts`:

```ts
const keywords = KEYWORDS;      // reference, not a copy
keywords.push(authors[0].name); // mutates the module-level constant
keywords.push(song.title[0]);
```

During a build every song appends its author + title to the same shared array, so later-built pages emit a `keywords` meta tag containing **all previously processed songs' titles and authors**. This produces bloated, spammy keyword tags.

**Fix:** copy the array: `const keywords = [...KEYWORDS];`

### 2.2 Dangling `#website` reference in song JSON-LD — HIGH ✅ DONE

`LdJsonSong.tsx` sets `isPartOf: { '@id': SITE.ORIGIN + '#website' }` on both the page node and the composition, but the `WebSite` node is only defined in `LdJson.tsx` (index pages). On song pages the reference points to an entity that **does not exist in the page's graph**, so parsers drop the relation.

**Fix:** include the `WebSite` + `Organization` nodes in the song page `@graph` too (extract a shared `getSiteGraphNodes()` helper used by both `LdJson` and `LdJsonSong`).

### 2.3 Wrong values in `MusicRecording` — MEDIUM ✅ DONE

In `LdJsonSong.tsx` audio mapping:

- `byArtist: { name: audio.title }` — the raw i18n object was emitted instead of a resolved string (`audio.title` holds the performer name per language).
- `audio.embedUrl: getIFrameUrl(url)` — the **page** URL is passed instead of the audio embed URL.

**Fix (applied):** resolve `byArtist.name` via `audio.title[language] || audio.title.en`, and pass `audio.embed_url` to `getIFrameUrl`.

---

## 3. Structured data improvements (JSON-LD)

### 3.1 Page `@type`: `CollectionPage` → `WebPage` / `ItemPage` ✅ DONE

A song page is a single item, not a collection. `CollectionPage` is correct for contents/A-Z/authors, but the song page node should be `WebPage` (or `ItemPage`), with `mainEntity` pointing at the composition:

```jsonc
{
  "@type": "WebPage",
  "@id": url,
  "name": pageName,
  "inLanguage": language,
  "mainEntity": { "@id": url + "#composition" },
  "isPartOf": { "@id": SITE.ORIGIN + "#website" }
}
```

### 3.2 Add `BreadcrumbList` ✅ DONE

No breadcrumb schema exists anywhere. Even without a visible breadcrumb UI, Google uses it for the SERP path display:

```jsonc
{
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": book.title, "item": absUrl(getSongbookPath(bookId)) },
    { "@type": "ListItem", "position": 2, "name": contentsTitle, "item": absUrl(getSongbookPagePath(bookId, SONGBOOK_PAGE.CONTENTS)) },
    { "@type": "ListItem", "position": 3, "name": songTitle }
  ]
}
```

Data needed (book title, song title) is already available in `SongBody`.

### 3.3 Enrich `MusicComposition` — ⚠️ PARTIALLY DONE (see §8)

Cheap, high-value additions from data already loaded:

- ✅ `inLanguage: language` — done (resolved via `getBookLocale`).
- ❌ `lyricist` — same person as `composer` for these songs; or keep just `composer`. → §8 G3
- ❌ `description: song.meta?.first_line` — mirrors the meta description. Also fill the existing `// TODO: description` on the page node. → §8 G1
- ⏸ `image` — when `song.resources.image` exists. Deferred together with item 12.
- ❌ `alternateName` — already includes `first_line`; also add `meta.alt_first_lines` when present. → §8 G2
- ❌ Fix the TODO: the page-node `description` is commented out. → §8 G1
- ❌ Optional: `lyrics: { "@type": "CreativeWork", "inLanguage": language }` to signal this is a lyrics page (don't embed the full text; a language marker is enough). → §8 G3
- `workTranslation` / `translationOfWork` — ✅ DONE 2026-10-20 — `SongBody` passes its already-fetched `bookDescriptions` to `LdJsonSong`, which emits `workTranslation` stubs (`@id` = other-language `#composition`, `inLanguage`) for every other book containing the song; the source composition also got `inLanguage`:

```jsonc
"workTranslation": [{ "@type": "MusicComposition", "@id": "<other-lang-url>#composition", "inLanguage": "ru" }]
```

### 3.4 Add `potentialAction` SearchAction to the `WebSite` node ⏭ SKIPPED

Won't do, for three reasons:

- **No SERP effect.** Google retired the sitelinks search box in November 2024; other engines don't meaningfully use `SearchAction`.
- **Target wouldn't work.** `SearchModule` keeps the query only in component state and ignores `?q=`, so `/[bookId]/search/?q={search_term_string}` would open an empty search box. Making it work requires URL-query support in the search page, which is not trivial for no payoff.
- **Per-book search vs. site-wide node.** Search lives at `/[bookId]/search/` while `WebSite` is a single site-wide node, so a default book would have to be arbitrarily chosen.

Revisit only if `?q=` deep-linking is added to the search page for user-facing reasons.

---

## 4. Meta tags

### 4.1 Title ✅ DONE

`getSongPageTitle` → `"Title. Author. Subtitle"`.

- No site/brand name is appended on song pages (index pages get `"… | Kirtan Site"` via `getPageTitle`). Recommend a consistent suffix: `"Śrī Guru-caraṇa-padma – Kirtan Site"` or use Next's `title.template` in a layout-level default.
- Titles with author + subtitle can exceed ~60 chars and get truncated in SERPs. Prefer `Title – Author` and drop the subtitle from `<title>` (keep it in OG/JSON-LD where length doesn't matter).

### 4.2 Description ✅ DONE

`description = song.meta?.first_line` — when `first_line` is missing the page ships **no description**, and when present it is often short (one transliterated line) and not in the searcher's language.

Recommend a composed fallback template (per book language, via `translate()`):

> "{Title} — a Vaiṣṇava song by {Author} with lyrics, {language} translation and word-by-word meaning. From {Book title}."

This adds natural-language keywords ("lyrics", "translation") that the transliterated first line never contains, and guarantees 120–160 chars on every page.

### 4.3 Keywords

`<meta name="keywords">` is ignored by Google/Bing. Keep it if desired (harmless once bug 2.1 is fixed), but don't invest further.

### 4.4 Open Graph ✅ DONE (type/locale)

- ✅ `type: 'website'` → use **`music.song`** on song pages (with optional `music:musician`); at minimum `article`. `website` is the weakest signal.
- ✅ `locale: bookId.slice(0, 2)` produces `"en"` / `"ru"`; OG expects `ll_CC` format (`en_US`, `ru_RU`). Map via a small lookup (a `getBookLocale` helper already exists for hreflang).
- OG image is the generic **book banner** for every song. When `song.resources.image` exists, put the song image first in `openGraph.images`.
- Image sizes 320×190 / 640×380 are below the recommended 1200×630 for large link previews — consider generating one larger banner size per book (or `opengraph-image` route).

### 4.5 Twitter

`card: 'summary'` is fine with small images; if a 1200×630 image is added, switch to `summary_large_image`.

### 4.6 hreflang

`getLanguages()` keyed by `d.slug.slice(0, 2)` — if two books ever share a language prefix (e.g. two English songbooks), one silently overwrites the other. ✅ DONE 2026-10-20 — song meta's `getLanguages()` now keys on `getBookLocale(d.slug)`, matching `getAlt.ts` and correctly mapping `ua` → `uk`.

---

## 5. HTML / semantic structure ✅ DONE (2026-10-20)

Current outline on a song page:

```
h1  Song title          (SongHeader)
h6  Book title          (ContentPage__book) ← skips h2–h5
h6  Verse numbers       (Verse__title)      ← one per verse
```

### Recommendations

1. **Wrap the song in `<article>`.** ✅ DONE — `.ContentPage__content` div → `<article>` in `ContentShell`.
2. **Remove heading tags from non-headings.** ✅ DONE
   - Book title `<h6 class="ContentPage__book">` → `<p>` (kept bold via `font-weight: 700` in SCSS).
   - Verse numbers `<h6 class="Verse__title">` → `<p>` inside the existing `<header>` (kept `color: var(--title-color)` in SCSS).
3. **Use `<nav>` for navigation blocks.** ✅ DONE — `PrevNextNav` root → `<nav aria-label="Previous / next song">`; footer link list `.Footer__content` → `<nav aria-label="Songbook navigation">`.
4. **Give real sections real headings.** ✅ DONE — audio caption `<p class="AudioList__caption">` → `<h2>` (body-text look preserved in SCSS), wrapper `<div>` → `<section>`. Translations render per-verse, no separate section to head.
5. **Author markup.** ✅ DONE — `rel="author"` added to the author link in `SongHeader`.
6. **Verse list element.** ✅ DONE (revised 2026-10-20) — **reverted to non-list markup** instead of `<ol>`. Rich editors (Word / Google Docs / Pages) rebuild `<ul>`/`<ol>`/`<li>` from the tags and ignore `list-style: none`, so pasting lyrics injected bullets/numbers — and with per-verse numbers already shown, an `<ol>` produced double numbering. The line-level lists were the real culprit. Converted all verse wrappers to `<div>`: `SongText__list`, `Verse`, and the per-line lists in `VerseText`, `VerseTranslation`, `VerseWbw`, `LearnVerse`. SEO impact nil (lyric structure lives in JSON-LD `MusicComposition`/`lyrics`, not HTML list tags); clean copy-paste gained. Audio tracks (`AudioList`) stay a real `<ul>` (genuine list, not copy-sensitive). Also fixed invalid nested `<main>`: `SongText` root → `<section>`, `SongLoader__main` → `<div>` (Layout owns the single `<main>`).
7. **Viewport:** ✅ DONE — `maximum-scale=1` removed from `Layout.tsx`.

---

## 6. Sitemap & crawl

- **`lastModified` is missing.** `changeFrequency`/`priority` are largely ignored by Google; `lastModified` is the one field it respects. Source JSON file `mtime` (or a build-time content hash date) per song would let crawlers skip unchanged pages.
- Do not duplicate song pages with multiple print pages use `?p=N`; `/ru/gurudeva-kripa-bindu-diya-kara-ei-dase/`.
- Consider adding `search` page's exclusion review — `search` is intentionally not in the sitemap (good; consider `disallow: /*/search/` in robots to save crawl budget, optional).

---

## 7. Prioritized action list

| # | Action | Impact | Effort |
|---|---|---|---|
| 1 | ✅ Fix `KEYWORDS` mutation bug (`[...KEYWORDS]`) | High | Trivial |
| 2 | ✅ Include `WebSite`/`Organization` nodes in song JSON-LD graph | High | Small |
| 3 | ✅ Composed meta-description fallback (localized template) | High | Small |
| 4 | ✅ Add `BreadcrumbList` JSON-LD | High | Small |
| 5 | ✅ `og:type: music.song`, fix `og:locale` format | Medium | Small |
| 6 | ✅ Page node `CollectionPage` → `WebPage` + `mainEntity` | Medium | Trivial |
| 7 | ✅ Fix `MusicRecording` artist / embed URL fields | Medium | Small |
| 8 | ✅ Site-name suffix in song `<title>` (template) | Medium | Trivial |
| 9 | ✅ Semantic HTML: `<article>`, demote h6s, `<nav>` wrappers | Medium | Medium |
| 10 | ⏸ Deferred: `lastModified` in sitemap | Medium | Small |
| 11 | ✅ `workTranslation` cross-language JSON-LD links | Medium | Medium |
| 12 | ⏸ Deferred: Song image in OG images; larger 1200×630 banner | Medium | Medium |
| 13 | ⏭ Skipped: `SearchAction` on `WebSite` node (see 3.4) | Low | Trivial |
| 14 | ✅ Remove `maximum-scale=1` from viewport | Low (a11y) | Trivial |
| 15 | ✅ Unify hreflang key building on `getBookLocale` | Low | Trivial |
| G1 | ✅ JSON-LD `description` on composition + page node (kill TODO) | Medium | Small |
| G2 | ✅ Fix `alternateName` `[null]` bug; add `alt_first_lines` | Medium | Trivial |
| G3 | ✅ `lyricist` + `lyrics: { inLanguage }` marker | Low | Trivial |
| G4 | ✅ `MusicRecording` polish: plain song title as `name`, `inLanguage` | Low | Trivial |
| G5 | ✅ robots: `disallow: /*/search/` (crawl budget, optional) | Low | Trivial |
| G6 | ✅ Description length guard (skip first line when composed > ~120 chars) | Low | Trivial |

---

## 8. Incomplete / leftover gaps (review 2026-10-21)

Found by verifying every ✅ item against the code. All confirmed items check out; these are the remaining holes, ordered for step-by-step implementation.

### G1. JSON-LD `description` on composition + page node — Medium / Small

`LdJsonSong.tsx` still carries a literal `// TODO: description` on the `WebPage` node, and the `MusicComposition` has no `description` either. The rich localized description already exists — `getDescription()` in `lib/content/song/meta.ts`.

**Fix:** export `getDescription` (or move it to a shared helper), pass the resolved string into `LdJsonSong` as a prop (it's computed server-side in `SongBody`/meta anyway), set it on both the page node and the composition, delete the TODO.

### G2. `alternateName` emits `[null]` when `first_line` is missing — Medium / Trivial

`alternateName: [song.meta?.first_line]` serializes to `[null]` in JSON-LD for songs without a first line.

**Fix:** build the array conditionally (like the `composer` spread) and include `song.meta.alt_first_lines` entries when present:

```ts
const alternateName = [song.meta?.first_line, ...(song.meta?.alt_first_lines ?? [])].filter(Boolean);
// spread into composition only when alternateName.length > 0
```

### G3. `lyricist` + `lyrics` language marker — Low / Trivial

On the composition node: duplicate `composer` as `lyricist` (same person for these songs), and add `lyrics: { '@type': 'CreativeWork', inLanguage: locale }` to signal a lyrics page without embedding the text.

### G4. `MusicRecording` polish — Low / Trivial

- `name: pageName` uses the full page title (title + author + subtitle); a recording name should be just `song.title.join(' ')`.
- Add `inLanguage: locale` to each recording.

### G5. robots: disallow search pages — Low / Trivial

`app/robots.ts` has no `disallow: '/*/search/'`; search pages are excluded from the sitemap but still crawlable. Optional crawl-budget saving (production branch only — keep the full disallow on non-prod).

### G6. Description length guard — Low / Trivial ✅ DONE 2026-10-21

`getDescription()` returned `firstLine + '. ' + composed`, which can exceed ~160 chars and get truncated in SERPs. Fixed: `MAX_COMPOSED_LENGTH = 120` guard in `meta.ts` — the first line is only prepended when `composed.length <= 120`, otherwise the composed sentence is returned alone.

### G7. Stale comment in `getTwitter.ts` — note only

The comment says the og:image set includes "banner + optional song image", but the song image is item 12 (deferred). Either trim the comment now or leave it as a reminder — just don't forget it when implementing #12.

### Suggested order

1. **G2** (bug, trivial) → 2. **G1** (needs a small refactor of `getDescription`) → 3. **G3 + G4** (same file, one pass over `LdJsonSong.tsx`) → 4. **G6** (touches `getDescription` again — can fold into G1) → 5. **G5** (separate file, separate concern). G7 rides along with whichever change touches `getTwitter.ts` or #12.

Verify after G1–G4 with Google's Rich Results Test / Schema.org validator on one song page with audio + translations and one minimal song (no author, no first line).

---

## 9. Reference: files involved

- Route: [app/[bookId]/[slug]/page.tsx](../../app/%5BbookId%5D/%5Bslug%5D/page.tsx)
- Song meta: [lib/content/song/meta.ts](../../lib/content/song/meta.ts)
- Meta helpers: [other/metadata/helpers/](../../other/metadata/helpers/) (`getCommonMeta`, `getOG`, `getTwitter`, `getAlt`, `getSongPageTitle`, `constants`)
- JSON-LD: [other/metadata/LdJsonSong.tsx](../../other/metadata/LdJsonSong.tsx), [other/metadata/LdJson.tsx](../../other/metadata/LdJson.tsx)
- HTML shell: [components/common/Layout/Layout.tsx](../../components/common/Layout/Layout.tsx), [components/content/ContentShell.tsx](../../components/content/ContentShell.tsx)
- Song markup: [components/song/SongHeader.tsx](../../components/song/SongHeader.tsx), [components/song/Verse/Verse.tsx](../../components/song/Verse/Verse.tsx)
- Crawl: [app/sitemap.ts](../../app/sitemap.ts), [app/robots.ts](../../app/robots.ts)
- Paths: [other/paths.ts](../../other/paths.ts)

===

Most of the plan is mechanical, so a top-tier model is overkill ("overheat") for the bulk of it. Suggested split:

**Fast/cheap model (e.g. GPT-5 mini, Claude Haiku) — items 1, 6, 8, 13, 14, 15:**
Single-file, single-line edits with no design decisions: `[...KEYWORDS]` copy, `CollectionPage` → `WebPage`, title suffix, `SearchAction`, viewport, `getBookLocale` unification.

**Mid-tier model (e.g. Claude Sonnet) — items 2, 4, 5, 7, 10:**
Small but need correctness across 2–3 files: shared `getSiteGraphNodes()` helper, `BreadcrumbList` with i18n labels, OG type/locale mapping, `MusicRecording` fields, sitemap `lastModified` from file mtime.

**Stronger model (Fable/Opus-class) — items 3, 9, 11, 12:**
These have real design decisions and cross-cutting risk:
- **3** (description template) — localized wording per book language, fallback logic, length constraints
- **9** (semantic HTML) — touches `ContentShell`, `Verse`, `PrevNextNav`, SCSS selectors keyed to `h6`, and must not break the export feature which reuses verse markup
- **11/12** — JSON-LD cross-language graph and OG image pipeline changes

**Practical batching strategy** (more important than model choice):

1. **Batch 1 — bug fixes** (1, 2, 7): ✅ DONE 2026-10-20 — `[...KEYWORDS]` copy; shared `getSiteGraphNodes()` helper used by `LdJson` + `LdJsonSong`; `byArtist` name resolved from i18n, `embedUrl` built from `audio.embed_url`.
2. **Batch 2 — metadata** (3, 4, 5, 6, 8): ✅ DONE 2026-10-20 — localized description templates (6 languages), `BreadcrumbList`, `music.song` + `getBookLocale` OG, `WebPage` + `mainEntity`, title suffix with 60-char budget.
3. **Batch 3 — markup** (9, 14): ✅ DONE 2026-10-20 — see section 5 annotations.
4. **Batch 5 — JSON-LD polish** (G1–G4, G6): one pass over `LdJsonSong.tsx` + `getDescription` refactor in `meta.ts`; verify with Rich Results Test. See §8 for order.
5. **Batch 6 — crawl** (G5): robots search disallow; trivial, separate concern.
6. **Deferred — later tasks** (10, 12, G7): sitemap `lastModified`, song/1200×630 OG images, `getTwitter` comment cleanup.

One batch per session with a focused prompt beats one giant "implement the whole doc" run regardless of model — smaller diffs, easier verification, and cheaper retries if something's off.
