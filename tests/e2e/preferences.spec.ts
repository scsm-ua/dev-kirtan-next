import { expect, findPage, getBookPages, getNeighbours, pathOf, test, waitForApp } from '@/tests/helpers/e2e';

import type { Page } from '@playwright/test';
import type { TSong } from '@/types/song';

/** What the reader chose stays chosen: after a reload and on the next song. */

const openCount = (page: Page, selector: string) =>
  page.locator(`.Collapse[data-state="open"] ${selector}`).count();

const hasPlainText = (song: TSong) => song.hasVersesText && song.hasVersesTranslations && !song.hasWbw;

test('the view mode picked with a key stays after a reload and on the next song', async ({ page }) => {
  const song = findPage('song', 'verses and translations, and the next song too', (candidate) => {
    const { next } = getNeighbours(candidate);
    const nextPage = next && getBookPages(candidate.route.bookId).find((other) => pathOf(other) === next.path);
    return hasPlainText(candidate.data.song) && nextPage?.kind === 'song' && hasPlainText(nextPage.data.song);
  });
  const nextPath = getNeighbours(song).next.path;

  await page.goto(pathOf(song));
  await waitForApp(page);
  await expect.poll(() => openCount(page, '.VerseText')).toBeGreaterThan(0);

  await page.keyboard.press('3');
  await expect.poll(() => openCount(page, '.VerseText')).toBe(0);
  expect(await openCount(page, '.VerseTranslation__paragraph')).toBeGreaterThan(0);

  await page.reload();
  await waitForApp(page);
  await expect.poll(() => openCount(page, '.VerseTranslation__paragraph')).toBeGreaterThan(0);
  expect(await openCount(page, '.VerseText')).toBe(0);

  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(nextPath);
  await expect.poll(() => openCount(page, '.VerseTranslation__paragraph')).toBeGreaterThan(0);
  expect(await openCount(page, '.VerseText')).toBe(0);

  await page.keyboard.press('1');
  await expect.poll(() => openCount(page, '.VerseText')).toBeGreaterThan(0);
});
