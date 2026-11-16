import { expect, findPage, getNeighbours, markDocument, pathOf, test, waitForApp } from '@/tests/helpers/e2e';

import type { Page } from '@playwright/test';

/** Touch gestures on a phone. */

/** A horizontal finger move over the song text, in steps as a real finger sends them. */
async function swipe(page: Page, fromX: number, toX: number): Promise<void> {
  await page.evaluate(
    ([startX, endX]) => {
      const target = document.querySelector('main') as Element;
      const y = window.innerHeight / 2;
      const send = (type: string, x: number) => {
        const point = { identifier: 1, target, clientX: x, clientY: y };
        const touches = type === 'touchend' ? [] : [point];
        let event: Event;
        try {
          const touch = new Touch(point);
          const list = type === 'touchend' ? [] : [touch];
          event = new TouchEvent(type, { bubbles: true, cancelable: true, touches: list, targetTouches: list, changedTouches: [touch] });
        } catch {
          // WebKit has no Touch constructor outside iOS: an event with the same fields.
          event = new Event(type, { bubbles: true, cancelable: true });
          Object.defineProperty(event, 'touches', { value: touches });
          Object.defineProperty(event, 'changedTouches', { value: [point] });
        }
        target.dispatchEvent(event);
      };

      send('touchstart', startX);
      for (let step = 1; step <= 10; step++) send('touchmove', startX + ((endX - startX) * step) / 10);
      send('touchend', endX);
    },
    [fromX, toX]
  );
}

test('@mobile a long swipe to the left opens the next song, to the right the previous one', async ({ page }) => {
  const song = findPage('song', 'a song with a previous and a next song', (candidate) => {
    const { prev, next } = getNeighbours(candidate);
    return !!prev && !!next;
  });
  const { next } = getNeighbours(song);

  await page.goto(pathOf(song));
  await waitForApp(page);
  const isSameDocument = await markDocument(page);

  await swipe(page, 300, 60);
  await expect(page).toHaveURL(new URL(next.path, page.url()).pathname);

  await swipe(page, 60, 300);
  await expect(page).toHaveURL(pathOf(song));
  expect(await isSameDocument()).toBe(true);
});

test('@mobile a short swipe stays on the song', async ({ page }) => {
  const song = findPage('song', 'a song with a next song', (candidate) => !!getNeighbours(candidate).next);

  await page.goto(pathOf(song));
  await waitForApp(page);

  await swipe(page, 300, 200);
  // Give a wrong navigation the time to happen.
  await page.waitForTimeout(800);

  await expect(page).toHaveURL(pathOf(song));
});
