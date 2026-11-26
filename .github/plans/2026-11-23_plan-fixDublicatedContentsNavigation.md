## Plan: Fix Prev/Next Navigation for Songs Listed Twice with the Same Page

**Task (original description)**

Contents of the `en` book (part):

```
### Śrī Śikṣāṣṭakam Kīrtans
- Kīrtan 1. Pita-varaṇa kali                 songs/pita-varana-kali-pavana-gora.md
- …
- Kīrtan 7a. Gāite gāite nāma                songs/gaite-gaite-nama-ki-doshia-hoilo.md
- Kīrtan 7b. Gāite ‘Govinda’–nām             songs/gaite-govinda-nam-upajilo-bhava-gram.md
- Kīrtan 7c. Sakhī go kemote                 songs/sakhi-go-kemote-dhoribo-paran.md
- Kīrtan 8a. Bondhu-goṇ! śunoho              songs/bondhu-gon-shiunoho-vachana-mora.md
- Kīrtan 8b. Yoga-pīṭhopari-sthita           songs/yoga-pithopari-sthita-ashta-sakhi-subeshtita.md

### Śrī Śrī Upadeśāmṛta Verses
- Verse 1. Vācho vegaṁ manasaḥ krodha-vegaṁ  songs/guru-kripa-bale-labhi-sambandha-vijniana.md
- … Verse 11                                 songs/sakala-preyasi-shreshtha-vrishabhanu-suta.md

### Śrī Śrī Upadeśāmṛta Kīrtans
- Kīrtan 1. Guru-kṛpā-bale labhi’ …          songs/guru-kripa-bale-labhi-sambandha-vijniana.md
- … Kīrtan 11                                songs/sakala-preyasi-shreshtha-vrishabhanu-suta.md
```

- Back navigation bug: on Verse 1 (`/en/guru-kripa-bale-labhi-sambandha-vijniana/`) "back" opens Verse 11 (`/en/sakala-preyasi-shreshtha-vrishabhanu-suta/`), but it should open Kīrtan 8b (`/en/yoga-pithopari-sthita-ashta-sakhi-subeshtita/`).
- Proposition: if the contents list the same item several times with the same page number, assume the listings follow each other. Back moves as from the first listing, forward as from the last one (forward already works this way).
- Print a warning when such listings are not together and other songs stand between them (then they need different page numbers).

**Cause**

`getNavItemsBySlug` in `lib/song.ts` builds the nav map with the page number as the key. Two listings with the same page give the same key, so `Object.fromEntries` keeps only the last listing, with both its neighbours:

| Song (page) | Listed at | Nav today | Wanted |
|---|---|---|---|
| Guru-kṛpā-bale (208) | 143 (Verse 1), 154 (Kīrtan 1) | prev = 153 (Verse 11), next = 155 | prev = 142 (Kīrtan 8b), next = 155 |

Listings with different pages (`ru`, `es`: `page: [39, 60]`) get two keys and a `?p=` URL. They work and do not change.

Same-page duplicates in the real books:

- `en`: Śikṣāṣṭakam Verses 124–131, repeated in Kīrtans 132–141 (with 7b, 7c added between 7a and 8a); Upadeśāmṛta Verses 143–153, repeated in Kīrtans 154–164.
- `ru-kdm`: `jaya-sa-parikara` (page 22) at 6 and at 23, with 16 other songs between.

**Approach: navigate over the contents without the earlier listings**

For navigation only, drop every listing that has a later listing with the same `id` and the same `page`. Prev and next are the neighbours in this shorter list.

```
contents:  … 123 [124 … 131] [132 … 138 139 140 141] 142 [143 … 153] [154 … 164] 165 …
                  dropped                                  dropped
nav list:  … 123             132 … 138 139 140 141   142             154 … 164   165 …
```

- Verse 1 / Kīrtan 1 (208): prev = 142 (Kīrtan 8b), next = 155. This is the wanted result.
- For listings that follow each other, or repeated blocks, this equals the proposition (back from the first listing, forward from the last).
- It differs from the literal proposition in one place, on purpose. Kīrtan 8a (205) is listed at 131 and 141. "Back as from the first listing" gives 7a, while forward goes 7a → 7b → 7c → 8a. So back would skip 7b and 7c. With the shorter list, back from 8a opens 7c, and the walk is the same in both directions for every book.
- The contents page, the sitemap and the export keep all listings. Only prev/next changes.

**Steps**

1. `lib/song.ts`, `getNavItemsBySlug`
   - Before looking up `indexes`, build `navSongs = songs.filter(...)`: keep an item unless a later item has the same `id` and the same `String(page)`. Items without a page compare as equal pages.
   - Use `navSongs` for `indexes`, `pages` and the neighbours. The rest stays: keys are pages, `'_'` when the item has no page.
   - Add a doc comment with the rule (the function has an empty one now).
2. `scripts/transformContents.js`: the warning
   - Add a pure `findSplitDuplicates(items)` over the flat mapped items (`id`, `page`). Take each run of consecutive dropped listings. The run is fine when the repeat of its first item comes right after the run. Otherwise return its items.
   - Call it at the end of `transform` and `console.warn` one line per item, next to the existing "Not enought page numbers" warning: `Duplicated "<id>" (page <N>) is listed apart from its repeat: prev/next skips the first listing. Give the listings different page numbers.`
   - Export it in `module.exports` for the test.
   - Expected with today's books: no warning for `en`, one for `ru-kdm` (`jaya-sa-parikara`). The fix for it is in the songbook repo (`page: [22, …]`), not here.
3. `.github/instructions/song-navigation.instructions.md`: add a short "Songs listed twice" section. Different pages give one nav entry per page (`?p=`). The same page gives one entry and the earlier listings are skipped. Mention the build warning.

**Tests**

- `tests/data/lib/song.test.ts`, `getNavItems in %s`: the test passes today with the bug, because it accepts the neighbours of any listing. Change it to check against the same shorter list: for each page key, `prev` and `next` are the neighbours of the kept listing. Add one test that walks `next` from the first item to the last and `prev` back, and expects the same items in reverse order, for every book.
- `tests/helpers/cases.ts`: add the case `listed-twice-with-same-page` (`occurrences > 1 && item.pages.length === 1`). Use it in `tests/data/lib/song.test.ts`: such a song has one nav entry, and its `prev` is not a song that is only listed between its two listings.
- `tests/pipeline/scripts/transformContents.test.ts`: `findSplitDuplicates` with inline items: neighbours `A A`, repeated block `A B A B`, block with an added song `A B A X B` (all fine), and `A X A` (reported).
- `tests/ui/components/song/PrevNextNav/PrevNextNav.test.tsx`: no change, it uses a song with several pages.

**Check**

- `pnpm run install:post-fetch`: prints the `ru-kdm` warning and nothing for `en`.
- `pnpm run type-check`, `pnpm run lint`, `pnpm test`.
- `pnpm run dev`: on `/en/guru-kripa-bale-labhi-sambandha-vijniana/` back opens `/en/yoga-pithopari-sthita-ashta-sakhi-subeshtita/`; from there forward returns. On `/en/bondhu-gon-shiunoho-vachana-mora/` back opens `/en/sakhi-go-kemote-dhoribo-paran/`.
