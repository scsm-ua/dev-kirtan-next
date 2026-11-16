import { expect, findPage, markDocument, pathOf, test, waitForApp } from '@/tests/helpers/e2e';

/**
 * A song printed on several pages of the book: `?p=` picks the page, and with
 * it the neighbours and the page shown on the search page.
 */

const findMultiPageSong = () =>
  findPage('song', 'a song on several pages, not the last song after its second page', (candidate) => {
    const pages = Object.keys(candidate.data.nav);
    return pages.length > 1 && !!candidate.data.nav[pages[1]].next;
  });

test('?p= picks the neighbours and the page number of that page', async ({ page }) => {
  const song = findMultiPageSong();
  const { bookId } = song.route;
  const [firstPage, secondPage] = Object.keys(song.data.nav);
  const { next } = song.data.nav[secondPage];
  if (!next) throw new Error('The finder picks a song with a next song.');

  await page.goto(`${pathOf(song)}?p=${secondPage}`);
  await waitForApp(page);
  const isSameDocument = await markDocument(page);

  await expect(page.locator('a.PrevNextLink--next')).toHaveAttribute('href', next.path);
  await expect(page.locator('.PageNumber__anchor')).toHaveAttribute('href', `/${bookId}/search/?p=${secondPage}`);
  await expect(page.locator(`footer a[href="/${bookId}/search/?p=${secondPage}"]`)).toHaveCount(1);

  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(next.path);
  expect(await isSameDocument()).toBe(true);

  // Without `?p=` the first page applies.
  await page.goto(pathOf(song));
  await waitForApp(page);
  await expect(page.locator('.PageNumber__anchor')).toHaveAttribute('href', `/${bookId}/search/?p=${firstPage}`);
});

test('the page number opens the search page with that page marked', async ({ page }) => {
  const song = findMultiPageSong();
  const { bookId } = song.route;
  const secondPage = Object.keys(song.data.nav)[1];

  await page.goto(`${pathOf(song)}?p=${secondPage}`);
  await waitForApp(page);
  const isSameDocument = await markDocument(page);

  await page.locator('.PageNumber__anchor').click();

  await expect(page).toHaveURL(`/${bookId}/search/?p=${secondPage}`);
  await expect(page.locator('.PageList__button--active')).toHaveText(secondPage);
  expect(await isSameDocument()).toBe(true);
});
