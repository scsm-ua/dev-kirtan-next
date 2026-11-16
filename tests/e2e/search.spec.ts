import { expect, findPage, markDocument, pathOf, test, waitForApp } from '@/tests/helpers/e2e';

import type { Page } from '@playwright/test';

/**
 * The search page: page numbers open their song, a text query goes to the
 * (stubbed) Google search API, and keys typed into the field are not hotkeys.
 */

const input = (page: Page) => page.locator('.SearchControls__input');

test('typing a page number that only one page starts with opens that page', async ({ page }) => {
  let number = '';
  const search = findPage('search', 'a page number no other page starts with', (candidate) => {
    number = candidate.data.pages
      .map((item) => item.page)
      .find((value) => /^\d+$/.test(value) && candidate.data.pages.filter((item) => item.page.startsWith(value)).length === 1);
    return !!number;
  });
  const target = search.data.pages.find((item) => item.page === number);

  await page.goto(pathOf(search));
  await waitForApp(page);
  const isSameDocument = await markDocument(page);

  await input(page).fill(number);

  await expect(page.locator('.PageList__button--pending')).toHaveText(number);
  await expect(page).toHaveURL(target.path);
  expect(await isSameDocument()).toBe(true);
});

test('a text query shows the results of the search API; a result opens in the app', async ({ page, baseURL }) => {
  const search = findPage('search', 'any book');
  const song = findPage('song', 'a song of that book', (candidate) => candidate.route.bookId === search.route.bookId);
  const queries: string[] = [];

  await page.context().route(
    (url) => url.hostname === 'www.googleapis.com',
    (route) => {
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      queries.push(new URL(route.request().url()).searchParams.get('q'));
      return route.fulfill({
        headers,
        json: {
          items: [{
            htmlFormattedUrl: '',
            htmlSnippet: 'A <b>snippet</b>',
            htmlTitle: 'A result',
            link: new URL(pathOf(song), baseURL).href
          }],
          searchInformation: { totalResults: '1' }
        }
      });
    }
  );
  await page.goto(pathOf(search));
  await waitForApp(page);
  const isSameDocument = await markDocument(page);

  await input(page).fill('a & b #c');
  await input(page).press('Enter');

  await expect(page.locator('.SearchResults__item')).toHaveCount(1);
  await expect(page.locator('.PageList')).toHaveCount(0);
  expect(queries).toEqual(['a & b #c']);

  await page.locator('.SearchResults__item a').click();
  await expect(page).toHaveURL(pathOf(song));
  await expect(page.locator('h1')).toContainText(song.data.song.title[0].trim());
  expect(await isSameDocument()).toBe(true);
});

test('letters typed into the search field are text, not hotkeys', async ({ page }) => {
  const search = findPage('search', 'any book');

  await page.goto(pathOf(search));
  await waitForApp(page);
  await expect(input(page)).toBeFocused();

  await page.keyboard.type('cihl');

  await expect(input(page)).toHaveValue('cihl');
  await expect(page).toHaveURL(pathOf(search));
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // Outside the field the same key is a hotkey again.
  await input(page).blur();
  await page.keyboard.press('c');
  await expect(page).toHaveURL(`/${search.route.bookId}/contents/`);
});
