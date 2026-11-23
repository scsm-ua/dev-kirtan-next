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
    await expect(transport(page, 'Next track')).toBeEnabled();

    // The playlist is a loop: before the first recording comes the last.
    const count = data.data.tracks.length;
    await expect(transport(page, 'Previous track')).toBeEnabled();
    await transport(page, 'Previous track').click();
    await expect(widgets.nth(count - 1)).toHaveClass(/PlayerWidget--playing/);
    await expect(dock(page).locator('.PlayerDock__name')).toHaveText(labels(data)[count - 1]);

    // The end of the list.
    await widgets.nth(count - 2).locator('button[aria-label="Play"]').click();
    await expect(transport(page, 'Next track')).toBeEnabled();
    await transport(page, 'Next track').click();
    await expect(dock(page).locator('.PlayerDock__name')).toHaveText(labels(data)[count - 1]);

    // And after the last recording comes the first, by "next" and by itself.
    await expect(transport(page, 'Next track')).toBeEnabled();
    await transport(page, 'Next track').click();
    await expect(widgets.nth(0)).toHaveClass(/PlayerWidget--playing/);
    await expect(dock(page).locator('.PlayerDock__name')).toHaveText(first);

    await widgets.nth(count - 1).locator('button[aria-label="Play"]').click();
    await expect(widgets.nth(count - 1)).toHaveClass(/PlayerWidget--playing/);
    await page.evaluate(() => (window as unknown as { __sc: { finish: () => void } }).__sc.finish());
    await expect(widgets.nth(0)).toHaveClass(/PlayerWidget--playing/);
    await expect(page.locator('main .PlayerWidget--active')).toHaveCount(1);
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

  test('the playlist where play was pressed stays, and the dock title leads back to it as it was', async ({ page }) => {
    const byTitle = (data: ReturnType<typeof singer>) => [...data.data.tracks].sort((a, b) => a.order - b.order);
    const data = findPage(
      'audio-singer',
      'a singer whose recordings sort differently by title',
      (candidate) =>
        candidate.data.tracks.length > 2 && byTitle(candidate).some((track, i) => track !== candidate.data.tracks[i])
    );
    const [, second, third] = byTitle(data).map((track) => track.item.title);
    const sortOption = (index: number) => page.locator('.PlaylistSort__option').nth(index);
    await page.goto(pathOf(data));
    await waitForApp(page);
    const isSameDocument = await markDocument(page);

    // By title, then play the second recording.
    await sortOption(1).click();
    await page.locator('main .PlayerWidget').nth(1).locator('button[aria-label="Play"]').click();
    await expect(dock(page).locator('.PlayerDock__name')).toHaveText(second);

    // All recordings: another playlist with the same track. It is shown as playing there.
    await page.locator(`a.SingerList__link[href="/${data.route.bookId}/audio/"]`).click();
    await expect(page).toHaveURL(`/${data.route.bookId}/audio/`);
    await expect(page.locator('main .PlayerWidget--active')).toHaveCount(1);
    await expect(page.locator('main .PlayerWidget--active')).toHaveClass(/PlayerWidget--playing/);

    // Another sort here, and "next": still the list of the singer, by title.
    await sortOption(0).click();
    await transport(page, 'Next track').click();
    await expect(dock(page).locator('.PlayerDock__name')).toHaveText(third);

    await dock(page).locator('.PlayerDock__title').click();
    await expect(page).toHaveURL(pathOf(data));
    await expect(page.locator('.PlaylistSort__input').nth(1)).toBeChecked();
    await expect(page.locator('main .PlayerWidget').nth(2)).toHaveClass(/PlayerWidget--playing/);
    await expect(page.locator('main .PlayerWidget').nth(2)).toBeInViewport();
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

test.describe('the footer next to the dock', () => {
  const footer = (page: Page) => page.locator('.Footer');
  const box = async (page: Page, target: ReturnType<typeof footer>) => {
    const { y, height } = await target.boundingBox();
    return { top: Math.round(y), bottom: Math.round(y + height) };
  };
  const scrollTo = (page: Page, where: 'top' | 'bottom') =>
    page.locator('.Layout__content').evaluate((el, to) => {
      el.scrollTop = to === 'top' ? 0 : el.scrollHeight;
    }, where);
  const scrollTop = (page: Page) => page.locator('.Layout__content').evaluate((el) => el.scrollTop);

  /** Starts a recording on a song page, then moves to the contents: a long page with the dock on. */
  async function playAndOpenContents(page: Page): Promise<void> {
    const song = findPage('song', 'a song with recordings', (candidate) => candidate.data.song.resources?.audio?.length > 0);

    await page.goto(pathOf(song));
    await waitForApp(page);
    await page.locator('.AudioList button[aria-label="Play"]').first().click();
    await expect(dock(page)).not.toHaveAttribute('inert');
    await page.keyboard.press('c');
    await expect(page).toHaveURL(`/${song.route.bookId}/contents/`);
  }

  test('bottom bar: the footer is the end of the page, right above the dock', async ({ page }) => {
    const height = 900;
    await page.setViewportSize({ width: 600, height });
    await playAndOpenContents(page);

    // The dock is in: wait for the end of its slide.
    await expect.poll(async () => (await box(page, dock(page))).bottom).toBe(height);
    const dockTop = (await box(page, dock(page))).top;

    await scrollTo(page, 'top');
    expect((await box(page, footer(page))).top).toBeGreaterThanOrEqual(height);

    await scrollTo(page, 'bottom');
    await expect.poll(async () => (await box(page, footer(page))).bottom).toBe(dockTop);
    await expect(footer(page)).toBeInViewport({ ratio: 1 });
    const position = await scrollTop(page);
    expect(position).toBeGreaterThan(0);

    // Without the dock the footer is the bottom bar again; the page stays where it was.
    await dock(page).locator('button[aria-label="Close player"]').click();
    await expect(dock(page)).toHaveAttribute('inert');
    await expect.poll(async () => (await box(page, footer(page))).bottom).toBe(height);
    expect(await scrollTop(page)).toBeLessThanOrEqual(position);
    expect(await scrollTop(page)).toBeGreaterThan(0);

    await footer(page).getByRole('link').last().click();
    await expect(page).toHaveURL(/\/search\/$/);
  });

  test('bottom bar without a dock: the footer stays at the bottom of the screen', async ({ page }) => {
    const height = 900;
    await page.setViewportSize({ width: 600, height });
    const contents = findPage('contents', 'a contents page', () => true);

    await page.goto(pathOf(contents));
    await waitForApp(page);

    expect((await box(page, footer(page))).bottom).toBe(height);
    await scrollTo(page, 'bottom');
    expect((await box(page, footer(page))).bottom).toBe(height);
    // The scroller ends where the footer starts.
    const scroller = await box(page, page.locator('.Layout__content'));
    expect(scroller.bottom).toBe((await box(page, footer(page))).top);
  });

  test('sidebar: the footer stays the left bar, the dock starts next to it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await playAndOpenContents(page);
    await scrollTo(page, 'bottom');

    const bar = await footer(page).boundingBox();
    const player = await dock(page).boundingBox();
    expect(bar).toMatchObject({ x: 0, y: 0, height: 720 });
    expect(Math.round(player.x)).toBe(Math.round(bar.width));
  });
});
