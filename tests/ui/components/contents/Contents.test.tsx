import { render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import Contents from '@/components/contents/Contents';
import { translate } from '@/other/i18n';
import { getSongbookPagePath, getSongPath, getSongPathWithPage, SONGBOOK_PAGE } from '@/other/paths';
import { getBookIds } from '@/tests/helpers/books';
import { loadPage } from '@/tests/helpers/pageData';

import type { TPageDataOf } from '@/types/pageData';
import type { TContentItem } from '@/types/common';

vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

const pages = new Map<string, TPageDataOf<'contents'>>();

beforeAll(async () => {
  for (const bookId of getBookIds()) pages.set(bookId, await loadPage({ kind: 'contents', bookId }, 'contents'));
});

function renderContents(bookId: string) {
  const { data } = pages.get(bookId);
  return render(
    <Contents bookId={bookId} contents={data.groups} hasAudio={data.hasAudio} shortcuts={data.book.shortcuts ?? []} />
  );
}

const isHidden = (item: TContentItem) => item.title.includes('(hidden)');
const allItems = () => [...pages.values()].flatMap(({ data }) => data.groups.flatMap((group) => group.items));

describe('Contents: the real data covers every case', () => {
  it.each([
    ['a "(hidden)" item', isHidden],
    ['an item without translation', (item: TContentItem) => !item.has.translation],
    ['an item with audio', (item: TContentItem) => item.has.audio],
    ['an item with several pages', (item: TContentItem) => item.pages?.length > 1]
  ])('%s', (_, matches) => {
    expect(allItems().some(matches)).toBe(true);
  });

  it('a group without a name', () => {
    expect([...pages.values()].some(({ data }) => data.groups.some((group) => !group.name))).toBe(true);
  });
});

describe.each(getBookIds())('Contents of %s', (bookId) => {
  it('lists every item except "(hidden)" ones, in order, with its link, title and first line', () => {
    const { container } = renderContents(bookId);
    const expected = pages
      .get(bookId)
      .data.groups.flatMap((group) => group.items)
      .filter((item) => !isHidden(item))
      .map((item) => ({ href: getSongPathWithPage(bookId, item), title: item.title, firstLine: item.aliasName ?? null }));

    const shown = [...container.querySelectorAll('.ContentItem')].map((li) => ({
      href: li.querySelector('a').getAttribute('href'),
      title: li.querySelector('.ContentItem__title').textContent,
      firstLine: li.querySelector('.ContentItem__title').getAttribute('title')
    }));

    expect(shown).toEqual(expected);
  });

  it('marks audio, untranslated items and pages as the data says', () => {
    const { container } = renderContents(bookId);
    const items = pages
      .get(bookId)
      .data.groups.flatMap((group) => group.items)
      .filter((item) => !isHidden(item));
    const problems: string[] = [];

    container.querySelectorAll('.ContentItem').forEach((li, index) => {
      const { has, id, page } = items[index];
      const pageText = li.querySelector('.ContentItem__page')?.textContent ?? '';
      const expectedPage = Array.isArray(page) ? page.join(', ') : String(page ?? '');

      if (!!li.querySelector('.ContentItem__embed') !== has.audio) problems.push(`${id}: audio mark`);
      if (li.querySelector('.ContentItem__title--normal') === null !== has.translation) problems.push(`${id}: translation`);
      if (pageText !== expectedPage) problems.push(`${id}: page "${pageText}" instead of "${expectedPage}"`);
    });

    expect(problems).toEqual([]);
  });

  it('has one section per group, with its name as heading and anchor id', () => {
    const { container } = renderContents(bookId);
    const sections = [...container.querySelectorAll('.ContentGroup')].map((li) => ({
      heading: li.querySelector('.ContentGroup__title')?.textContent ?? null,
      id: li.getAttribute('id')
    }));

    expect(sections).toEqual(
      pages.get(bookId).data.groups.map(({ name }) =>
        name ? { heading: name, id: `section-${name}` } : { heading: null, id: null }
      )
    );
  });

  it('starts with the A–Z link, then audio and shortcuts, and ends with the authors link', () => {
    const { container, getByRole } = renderContents(bookId);
    const { book, hasAudio } = pages.get(bookId).data;
    const links = [...container.querySelectorAll('.IndexLink a')].map((a) => a.getAttribute('href'));

    expect(links).toEqual([
      getSongbookPagePath(bookId, SONGBOOK_PAGE.A_Z),
      ...(hasAudio ? [getSongbookPagePath(bookId, SONGBOOK_PAGE.AUDIO)] : []),
      ...(book.shortcuts ?? []).map(({ slug }) => getSongPath(bookId, slug)),
      getSongbookPagePath(bookId, SONGBOOK_PAGE.AUTHORS)
    ]);
    expect(getByRole('heading', { level: 1 }).textContent).toBe(translate(bookId, 'CONTENTS_PAGE.LINK_FULL_TITLE'));
  });
});
