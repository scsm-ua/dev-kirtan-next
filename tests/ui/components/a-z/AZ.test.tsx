import { render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import AZ from '@/components/a-z/AZ';
import { getSongbookPagePath, getSongPath, getSongPathWithPage, SONGBOOK_PAGE } from '@/other/paths';
import { getBookIds } from '@/tests/helpers/books';
import { loadPage } from '@/tests/helpers/pageData';

import type { TPageDataOf } from '@/types/pageData';

vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

const pages = new Map<string, TPageDataOf<'a-z'>>();

beforeAll(async () => {
  for (const bookId of getBookIds()) pages.set(bookId, await loadPage({ kind: 'a-z', bookId }, 'a-z'));
});

function renderAZ(bookId: string) {
  const { data } = pages.get(bookId);
  return render(<AZ bookId={bookId} contents={data.groups} hasAudio={data.hasAudio} shortcuts={data.book.shortcuts ?? []} />);
}

describe.each(getBookIds())('AZ of %s', (bookId) => {
  it('has one section per letter, each listing its lines in order with their links', () => {
    const { container } = renderAZ(bookId);
    const shown = [...container.querySelectorAll('.ContentGroup')].map((section) => ({
      letter: section.querySelector('.ContentGroup__title').textContent,
      items: [...section.querySelectorAll('.ContentItem a')].map((a) => ({
        href: a.getAttribute('href'),
        title: a.querySelector('.ContentItem__title').textContent
      }))
    }));

    expect(shown).toEqual(
      pages.get(bookId).data.groups.map((group) => ({
        letter: group.name,
        items: group.items.map((item) => ({ href: getSongPathWithPage(bookId, item), title: item.title }))
      }))
    );
  });

  it('starts with the contents link, then audio and shortcuts, and ends with the authors link', () => {
    const { container } = renderAZ(bookId);
    const { book, hasAudio } = pages.get(bookId).data;

    expect([...container.querySelectorAll('.IndexLink a')].map((a) => a.getAttribute('href'))).toEqual([
      getSongbookPagePath(bookId, SONGBOOK_PAGE.CONTENTS),
      ...(hasAudio ? [getSongbookPagePath(bookId, SONGBOOK_PAGE.AUDIO)] : []),
      ...(book.shortcuts ?? []).map(({ slug }) => getSongPath(bookId, slug)),
      getSongbookPagePath(bookId, SONGBOOK_PAGE.AUTHORS)
    ]);
  });
});
