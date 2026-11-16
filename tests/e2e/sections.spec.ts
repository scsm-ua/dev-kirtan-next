import { expect, findPage, markDocument, pathOf, test, waitForApp } from '@/tests/helpers/e2e';

import type { Page } from '@playwright/test';
import type { TContentGroup } from '@/types/common';

/**
 * Sections of the index pages: badges and letters scroll to their section,
 * and an author link of a song opens the authors page at the author.
 */

/** Distance in px from the top of the scroller to the top of the section, minus its scroll margin. */
function offsetFromTop(page: Page, id: string): Promise<number> {
  return page.evaluate((sectionId) => {
    const section = document.getElementById(sectionId);
    const scroller = document.querySelector('.Layout__content');
    const margin = parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
    return Math.round(section.getBoundingClientRect().top - scroller.getBoundingClientRect().top - margin);
  }, id);
}

/** A group in the middle: the page can scroll it to the top. */
function middleGroup(groups: TContentGroup[]): TContentGroup {
  return groups[Math.floor(groups.length / 3)];
}

const scrollTop = (page: Page) => page.locator('.Layout__content').evaluate((el) => el.scrollTop);

test('an author badge scrolls to the author', async ({ page }) => {
  const authors = findPage('authors', 'many authors', (candidate) => candidate.data.groups.length > 9);
  const group = middleGroup(authors.data.groups);

  await page.goto(pathOf(authors));
  await waitForApp(page);

  await page.locator('.AuthorBadges__button', { hasText: `${group.name} (${group.items.length})` }).click();

  await expect.poll(() => offsetFromTop(page, `section-${group.name}`)).toBe(0);
  expect(await scrollTop(page)).toBeGreaterThan(0);
});

test('a letter of the A–Z page scrolls to the letter', async ({ page }) => {
  const az = findPage('a-z', 'many letters', (candidate) => candidate.data.groups.length > 9);
  const group = middleGroup(az.data.groups);

  await page.goto(pathOf(az));
  await waitForApp(page);

  await page.locator('.Pills__button').getByText(group.name, { exact: true }).click();

  await expect.poll(() => offsetFromTop(page, `section-${group.name}`)).toBe(0);
  expect(await scrollTop(page)).toBeGreaterThan(0);
});

test('the author of a song opens the authors page at that author', async ({ page }) => {
  let author = '';
  const song = findPage('song', 'a song whose author is in the middle of the authors page', (candidate) => {
    const authors = findPage('authors', 'the authors of the book', (item) => item.route.bookId === candidate.route.bookId);
    const index = authors.data.groups.findIndex((group) => group.name === candidate.data.song.meta.author);
    author = candidate.data.song.meta.author;
    return candidate.data.song.author?.length > 0 && index > 4 && index < authors.data.groups.length - 4;
  });

  await page.goto(pathOf(song));
  await waitForApp(page);
  const isSameDocument = await markDocument(page);

  await page.locator('.SongHeader__author a').first().click();

  await expect(page).toHaveURL((url) => url.pathname === `/${song.route.bookId}/authors/`);
  expect(decodeURIComponent(new URL(page.url()).hash)).toBe(`#section-${author}`);
  await expect.poll(() => offsetFromTop(page, `section-${author}`)).toBe(0);
  expect(await scrollTop(page)).toBeGreaterThan(0);
  expect(await isSameDocument()).toBe(true);
});
