import { act, render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import Authors from '@/components/authors/Authors';
import { getSongPathWithPage } from '@/other/paths';
import { getBookIds } from '@/tests/helpers/books';
import { loadPage } from '@/tests/helpers/pageData';

import type { TContentGroup } from '@/types/common';
import type { TPageDataOf } from '@/types/pageData';

vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

const pages = new Map<string, TPageDataOf<'authors'>>();

beforeAll(async () => {
  for (const bookId of getBookIds()) pages.set(bookId, await loadPage({ kind: 'authors', bookId }, 'authors'));
});

function renderAuthors(bookId: string) {
  const { groups, unknown } = pages.get(bookId).data;
  return render(<Authors bookId={bookId} contents={groups} unknown={unknown} />);
}

function sections(container: HTMLElement) {
  return [...container.querySelectorAll('.ContentGroup')].map((section) => ({
    id: section.getAttribute('id'),
    links: [...section.querySelectorAll('.ContentItem a')].map((a) => a.getAttribute('href'))
  }));
}

const expectedSection = (bookId: string, group: TContentGroup) => ({
  id: group.name ? `section-${group.name}` : null,
  links: group.items.map((item) => getSongPathWithPage(bookId, item))
});

const toggleUnknown = () =>
  act(() => {
    window.dispatchEvent(new CustomEvent('kirtan:toggleUnknownAuthors'));
  });

it('a real book has songs without an author', () => {
  expect([...pages.values()].some(({ data }) => data.unknown?.items.length)).toBe(true);
});

describe.each(getBookIds())('Authors of %s', (bookId) => {
  it('has one section per author with links to the songs', () => {
    const { container } = renderAuthors(bookId);

    expect(sections(container)).toEqual(pages.get(bookId).data.groups.map((group) => expectedSection(bookId, group)));
  });

  it('shows the songs without an author only after the toggle event', ({ skip }) => {
    const { groups, unknown } = pages.get(bookId).data;
    if (!unknown) skip();

    const { container } = renderAuthors(bookId);
    toggleUnknown();

    expect(sections(container)).toEqual([...groups, unknown].map((group) => expectedSection(bookId, group)));
  });
});
