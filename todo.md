# Player

# Better js app build

static build:
- each static url, including /<lang>/<book-id>/<song-id>/ - is prebuild full html for better seo
- each built page contains links to reusable css and js for compact size and caching
- each built page once opened works as same standalone app
	- when other page should be opened, initial app from initially opened page not making redirect and page reload
	- it loads next page JSON and generates new page on client
- as requirement - all data is prerendered as JSON for client app loading

So:
- search bot see each page as static html
- user uses app as standalone app without page reload
- all new data during navigation loaded as JSON
- playing player dont stop during navigation
- each page navigation works faster as json is smaller then html
- full songbook cache is better, because JSON takes much less space to load
	- possible prebuilt one JSON per all sonbook, just for precaching - need decide if its better then many files

# Todo

- sonbgooks legacy songbooks section
- en songbook link to https://scsmath.com/KirtanGuide/
- contents (non song page) - SEO
  - use SEO skill
- another build and app js approach
- do songbook images in resources

# complex questions

- how to handle audio variations?
- how to handle additional vandanas just for history

- move songbook images to resources?
- make fallback songbook image

- search: when google search started - hide numbers toolbar?

## Fix index in all songbooks

add multiple song indexes, like for Sharanagati

## Fix author text in all songook

author: namas-te-narasimhaya - only Vyasadev, not Jayadev (check other songbooks)

no author: Hare Kṛṣṇa Mahāmantra

# Refactors 

analyze: book language in songbook.json

## build

single page app for each page - prerendered content?

json loaded

### Questionable:

learn mode
    - http://localhost:3333/es/jaya-jaya-girirajer-arati-vishiala/ flores *mālatī* y enredaderas *mādhavī*
    - http://localhost:3333/es/jashomati-nandana-vraja-vara-nagara/

pages:
- export
  - order?
  - skip aggregated pages
