import { expect, findPage, markDocument, pathOf, test, waitForApp } from '@/tests/helpers/e2e';

/**
 * The list of books that have the song: opened by its button or `l`, moved
 * through with the arrow keys, and a book opens the song there.
 */

test('l opens the list of books with the song; a book opens the song there', async ({ page }) => {
  const song = findPage('song', 'a song in several visible books', (candidate) =>
    candidate.data.descriptions.filter((description) => !description.hidden).length > 1
  );
  const { bookId, slug } = song.route;
  const other = song.data.descriptions.find((description) => !description.hidden && description.slug !== bookId);
  const dialog = page.getByRole('dialog');

  await page.goto(pathOf(song));
  await waitForApp(page);
  const isSameDocument = await markDocument(page);

  await page.keyboard.press('l');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('l');
  await expect(dialog).toBeHidden();

  await page.locator('.OtherTranslations__button').click();
  await expect(dialog).toBeVisible();
  const links = dialog.locator('a[href]');
  await page.keyboard.press('ArrowDown');
  await expect(links.first()).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(links.last()).toBeFocused();

  await dialog.locator(`a[href="/${other.slug}/${slug}/"]`).click();

  await expect(page).toHaveURL(`/${other.slug}/${slug}/`);
  await expect(dialog).toBeHidden();
  await expect(page.locator('.ContentPage__book')).toHaveText(other.title);
  expect(await isSameDocument()).toBe(true);
});
