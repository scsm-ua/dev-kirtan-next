import { describe, expect, it } from 'vitest';

import { getPagesList } from '@/lib/search';
import { getSongPathWithPage } from '@/other/paths';
import { getBookIds, getItems } from '@/tests/helpers/books';

describe.each(getBookIds())('getPagesList of %s', (bookId) => {
  const items = getItems(bookId);
  const pages = getPagesList(bookId);

  it('has every page number of the contents once', () => {
    const expected = new Set(items.flatMap((item) => item.pages.map(String)));

    expect(pages.map((entry) => entry.page).sort()).toEqual([...expected].sort());
  });

  it('sorts the pages by number', () => {
    const outOfOrder = pages.slice(1).filter((entry, i) => parseFloat(pages[i].page) > parseFloat(entry.page));

    expect(outOfOrder.map((entry) => entry.page)).toEqual([]);
  });

  it('points every page to an item that is on it', () => {
    const wrong = pages.filter(
      (entry) =>
        !items.some(
          (item) =>
            item.pages.map(String).includes(entry.page) &&
            item.title === entry.title &&
            getSongPathWithPage(bookId, item, item.pages.find((page) => String(page) === entry.page)) ===
              entry.path
        )
    );

    expect(wrong.map((entry) => `${bookId}: page ${entry.page}`)).toEqual([]);
  });
});
