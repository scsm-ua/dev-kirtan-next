- feedback form with Cloudflare Worker

# seo

- implement seo plan

- root page '/' render fist songbook without redirect

- contents (non song page) - SEO
  - all languages
  - use SEO skill

# Todo afrter build js app

- player title click - where to return?
- keyboard next prev navigation - could be faster without animation
- allow scroll down with dock player - to show footer

- refactor routes to simpler way

- review: AppRoot__progress
- sw.js offline response make nicer
- review Offline page: page.tsx is an empty app page
- review sw.js priorities, is_local?
- offline - book images not cached
- offline - white page, not loaded when network is back
- offline - forward from noncached to cached not working
- offline - (navigator as TNavigator).connection?.saveData) - save only for images precache, which is not implemented  yet

### GA possible issue

- Decision for you: trackPage now sends a page_view on every client navigation. If "Page changes based on browser history events" is on in your GA4 enhanced measurement settings, these navigations will be counted twice. Turn it off, or tell me to drop the explicit event and rely on GA's own tracking instead. I recommend turning it off, because GA's history tracking fires before the new title and page parameters are set.

- disabled, but views still counts by 2

### Back on soundclud possible issue

- mobile: start player, back button stops playback

- Problem that is now more noticeable: every SoundCloud track switch adds a history entry inside its hidden iframe. After an auto-advance or a Next press, the first browser Back press steps back inside the iframe, so it looks like Back did nothing; a second press works. This already happened before, but only on the page where the switch occurred. Now it can catch you on any page while music plays.

The fix I'd suggest is to create a fresh hidden SoundCloud iframe for each track instead of reloading the shared one. The risk is that on iPhones auto-advance to the next track might then be blocked, which I can't test here. Should I try it?

# Todo

- client search (as data not big)

- review tests findings

- sonbgooks legacy songbooks section
- en songbook link to https://scsmath.com/KirtanGuide/
- another build and app js approach
- do songbook images in resources

- review: todo-songbook-info.md

# complex questions

- how to handle audio variations?
- how to handle additional vandanas just for history

- move songbook images to resources?
- make fallback songbook image

- search: when google search started - hide numbers toolbar?

# Sonbgooks

## Fix index in all songbooks

add multiple song indexes, like for Sharanagati

## Fix author text in all songook

author: namas-te-narasimhaya - only Vyasadev, not Jayadev (check other songbooks)

no author: Hare Kṛṣṇa Mahāmantra

## songbook.json

analyze: book language in songbook.json

remove sort order

### Questionable:

learn mode
    - http://localhost:3333/es/jaya-jaya-girirajer-arati-vishiala/ flores *mālatī* y enredaderas *mādhavī*
    - http://localhost:3333/es/jashomati-nandana-vraja-vara-nagara/

pages:
- export
  - order?
  - skip aggregated pages
