# inbox

- keep song GA attribute?

# cache issues

- test no images cached
- test page with 404 data
  - what happen when page-data.json is 404 - bad result, just white browser error
- how to react when cache gone on fly (manually)
- better design for sw.js offline page
  - show cached urls?
- error in the popup. The popup shows "Not saved" for error and for none alike; status.error is not shown anywhere.
  - show error
  - test (simulate) error
- ?? offline - white page, not loaded when network is back

### GA possible issue

- Decision for you: trackPage now sends a page_view on every client navigation. If "Page changes based on browser history events" is on in your GA4 enhanced measurement settings, these navigations will be counted twice. Turn it off, or tell me to drop the explicit event and rely on GA's own tracking instead. I recommend turning it off, because GA's history tracking fires before the new title and page parameters are set.

- disabled, but views still counts by 2

- review events definitions, not working yet

- debug events on dashboard

### Back on soundclud possible issue

- mobile: start player, back button stops playback

- Problem that is now more noticeable: every SoundCloud track switch adds a history entry inside its hidden iframe. After an auto-advance or a Next press, the first browser Back press steps back inside the iframe, so it looks like Back did nothing; a second press works. This already happened before, but only on the page where the switch occurred. Now it can catch you on any page while music plays.

The fix I'd suggest is to create a fresh hidden SoundCloud iframe for each track instead of reloading the shared one. The risk is that on iPhones auto-advance to the next track might then be blocked, which I can't test here. Should I try it?

# Complex questions

- how to handle audio variations?
- how to handle additional vandanas just for history
- how to handle additional songs on legacy songbooks
  - how to easy acces them from main songbook (like /en/)

### Questionable:

learn mode
    - http://localhost:3333/es/jaya-jaya-girirajer-arati-vishiala/ flores *mālatī* y enredaderas *mādhavī*
    - http://localhost:3333/es/jashomati-nandana-vraja-vara-nagara/

# TODO

  pages:
  - export
    - order?
    - skip aggregated pages

# Small refactor

## About page

- en songbook link to https://scsmath.com/KirtanGuide/
- "about" on root page
- "about" on contents page
- add "about" to all songbooks md

# Big refactors

## Client search

- client search (as data not big and cached)

## SEO

- use SEO skill
- implement seo plan
- contents (a-z) (non song page) - SEO
  - all languages?
 
## Routes

- refactor routes to simpler way
  - make simple object with interface, less files duplicated route logic layers

## Songbook covers

- move songbook covers images to resources?
- make fallback songbook cover image

# UI

## Minors

- 

---

# Songbooks MD

## songbook.json

analyze: book language in songbook.json

- review: todo-songbook-info.md

## Fix index in all songbooks

add multiple song indexes, like for Sharanagati

## Fix author text in all songook

author: namas-te-narasimhaya - only Vyasadev, not Jayadev (check other songbooks)

no author: Hare Kṛṣṇa Mahāmantra

remove sort order
