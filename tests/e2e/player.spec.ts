import { expect, findPage, markDocument, pathOf, test, waitForApp } from '@/tests/helpers/e2e';

import type { Page } from '@playwright/test';

/**
 * The player in a real browser, on the stand-in SoundCloud widget: playback
 * survives client navigation, and a playlist moves on by itself.
 */

const dock = (page: Page) => page.locator('.PlayerDock[aria-label="Now playing"]');
const position = (page: Page) => dock(page).locator('.PlayerDock__time').first();

/** Seconds shown as `m:ss`. */
const toSeconds = (text: string) => text.split(':').reduce((sum, part) => sum * 60 + Number(part), 0);

test('playback goes on while the reader moves to other pages', async ({ page }) => {
  const song = findPage('song', 'a song with recordings', (candidate) => candidate.data.song.resources?.audio?.length > 0);

  await page.goto(pathOf(song));
  await waitForApp(page);
  const isSameDocument = await markDocument(page);
  await expect(dock(page)).toHaveAttribute('inert');

  await page.locator('.AudioList button[aria-label="Play"]').first().click();

  await expect(dock(page)).not.toHaveAttribute('inert');
  await expect.poll(async () => toSeconds(await position(page).innerText())).toBeGreaterThan(0);

  await page.keyboard.press('c');
  await expect(page).toHaveURL(`/${song.route.bookId}/contents/`);

  const before = toSeconds(await position(page).innerText());
  await expect(dock(page)).not.toHaveAttribute('inert');
  await expect.poll(async () => toSeconds(await position(page).innerText())).toBeGreaterThan(before);
  expect(await isSameDocument()).toBe(true);
});

test('a playlist plays the next recording when one ends', async ({ page }) => {
  const singer = findPage('audio-singer', 'a singer with several recordings', (candidate) => candidate.data.tracks.length > 1);

  await page.goto(pathOf(singer));
  await waitForApp(page);
  const widgets = page.locator('main .PlayerWidget');

  await widgets.nth(0).locator('button[aria-label="Play"]').click();
  await expect(widgets.nth(0)).toHaveClass(/PlayerWidget--playing/);
  const firstTitle = await dock(page).locator('.PlayerDock__name').innerText();

  await page.evaluate(() => (window as unknown as { __sc: { finish: () => void } }).__sc.finish());

  await expect(widgets.nth(1)).toHaveClass(/PlayerWidget--playing/);
  await expect(widgets.nth(0)).not.toHaveClass(/PlayerWidget--active/);
  await expect(dock(page).locator('.PlayerDock__name')).not.toHaveText(firstTitle);
});

test.describe('the dock moves through the recordings of the page', () => {
  const singer = () =>
    findPage('audio-singer', 'a singer with three recordings', (candidate) => candidate.data.tracks.length > 2);
  // The default sort is by first line, the order of the data.
  const labels = (data: ReturnType<typeof singer>) => data.data.tracks.map((track) => track.label);
  const transport = (page: Page, name: 'Previous track' | 'Next track') =>
    dock(page).locator(`button[aria-label="${name}"]`);

  test('next and previous follow the order of the list', async ({ page }) => {
    const data = singer();
    const [first, second, third] = labels(data);
    await page.goto(pathOf(data));
    await waitForApp(page);
    const widgets = page.locator('main .PlayerWidget');

    await widgets.nth(1).locator('button[aria-label="Play"]').click();
    await expect(dock(page).locator('.PlayerDock__name')).toHaveText(second);

    await transport(page, 'Next track').click();
    await expect(widgets.nth(2)).toHaveClass(/PlayerWidget--playing/);
    await expect(dock(page).locator('.PlayerDock__name')).toHaveText(third);

    // Within the first seconds "previous" opens the track before.
    await transport(page, 'Previous track').click();
    await expect(widgets.nth(1)).toHaveClass(/PlayerWidget--playing/);
    await expect(dock(page).locator('.PlayerDock__name')).toHaveText(second);

    await transport(page, 'Previous track').click();
    await expect(widgets.nth(0)).toHaveClass(/PlayerWidget--playing/);
    await expect(dock(page).locator('.PlayerDock__name')).toHaveText(first);
    await expect(transport(page, 'Previous track')).toBeDisabled();
    await expect(transport(page, 'Next track')).toBeEnabled();

    // The end of the list.
    const count = data.data.tracks.length;
    await widgets.nth(count - 2).locator('button[aria-label="Play"]').click();
    await expect(transport(page, 'Next track')).toBeEnabled();
    await transport(page, 'Next track').click();
    await expect(dock(page).locator('.PlayerDock__name')).toHaveText(labels(data)[count - 1]);
    await expect(transport(page, 'Next track')).toBeDisabled();
  });

  test('the queue stays after leaving the page, and the way back shows the playing track', async ({ page }) => {
    const data = singer();
    const [, second, third] = labels(data);
    await page.goto(pathOf(data));
    await waitForApp(page);
    const isSameDocument = await markDocument(page);

    await page.locator('main .PlayerWidget').nth(1).locator('button[aria-label="Play"]').click();
    await expect(dock(page).locator('.PlayerDock__name')).toHaveText(second);

    await page.keyboard.press('c');
    await expect(page).toHaveURL(`/${data.route.bookId}/contents/`);
    await expect(page.locator('main .PlayerWidget')).toHaveCount(0);

    await transport(page, 'Next track').click();
    await expect(dock(page).locator('.PlayerDock__name')).toHaveText(third);
    const before = toSeconds(await position(page).innerText());
    await expect.poll(async () => toSeconds(await position(page).innerText())).toBeGreaterThan(before);

    await page.goBack();
    await expect(page).toHaveURL(pathOf(data));
    await expect(page.locator('main .PlayerWidget').nth(2)).toHaveClass(/PlayerWidget--playing/);
    await expect(page.locator('main .PlayerWidget--active')).toHaveCount(1);
    expect(await isSameDocument()).toBe(true);
  });
});

test('closing the dock stops the playback', async ({ page }) => {
  const song = findPage('song', 'a song with recordings', (candidate) => candidate.data.song.resources?.audio?.length > 0);

  await page.goto(pathOf(song));
  await waitForApp(page);
  await page.locator('.AudioList button[aria-label="Play"]').first().click();
  await expect(dock(page)).not.toHaveAttribute('inert');

  await dock(page).locator('button[aria-label="Close player"]').click();

  await expect(dock(page)).toHaveAttribute('inert');
  await expect(page.locator('.AudioList .PlayerWidget').first()).not.toHaveClass(/PlayerWidget--playing/);
});
