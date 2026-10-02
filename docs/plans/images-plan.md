
## Context

- **Source data**: `images.json` maps `songSlug → "images/en-2026/N.png"`. The actual PNGs live in `images`.
- **Existing pattern**: audio flows via `prepareSharedResources.js` → writes `resources.json` (a `ResourceMap`) → `transformContents.js` merges it into each song JSON as `song.resources.audio` → consumed in `page.tsx` as `song.resources?.audio`.
- Images are **not** currently copied anywhere servable, so they need to be placed under `public`.

I'll mirror the audio pipeline and add rendering.

## Plan

**1. Copy image assets to `public` (build step)** — in `prepareSharedResources.js`
- Read `images.json` from the resources package.
- Copy the resources `images/` folder into `public/images/resources/` so files resolve at `/images/resources/en-2026/N.png`.
- Add `image: "/images/resources/<path>"` to each song's entry in the returned `ResourceMap` (creating the entry when the song has an image but no audio).

**2. Preserve `image` when merging into song JSON** — in `transformContents.js`
- `mapResources` currently returns `undefined` when there's no audio and strips everything but audio. Update it to keep `image` even when audio is empty/absent.

**3. Types**
- `TResource` in `resources.ts`: add `image?: string` (and make `audio` optional, since image-only songs will exist).
- Update JSDoc `ResourceRaw`/`ResourceObj` in `types.js` to include `image`.

**4. Render centered image between header and text** — in `page.tsx`
- Add a small `SongImage` component (`components/song/SongImage/SongImage.tsx` + `.scss`) that renders a centered `next/image` (or `img`) when `song.resources?.image` is set.
- Place it right after `</header>` (which closes the `SongHeader` block) and before `<SongText>`, matching the repo's one-component-per-feature + SCSS convention.

## Open questions
1. **Image serving path** — OK to copy the resources `images/` dir into `public/images/resources/`? (keeps them static, no external CDN needed)
2. **Component vs inline** — create a dedicated `SongImage` component (consistent with the codebase), or inline a simple `<div className="SongPage__image">`? I recommend the component.
3. **`next/image` vs plain `<img>`** — the project targets a static export (`next build` + `.nojekyll`); `next/image` needs care with static export. I'd use a plain `<img>` to avoid loader config. OK?

Want me to proceed with implementation once you confirm these three?
