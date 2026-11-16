import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import AuthorBadges from '@/components/authors/AuthorBadges';
import Authors from '@/components/authors/Authors';
import { scrollToSection } from '@/other/helpers';
import { getBookIds } from '@/tests/helpers/books';
import { loadPage } from '@/tests/helpers/pageData';

import type { TPageDataOf } from '@/types/pageData';

vi.mock('@/other/helpers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/other/helpers')>()),
  scrollToSection: vi.fn()
}));

vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

const pages = new Map<string, TPageDataOf<'authors'>>();

beforeAll(async () => {
  for (const bookId of getBookIds()) pages.set(bookId, await loadPage({ kind: 'authors', bookId }, 'authors'));
});

describe.each(getBookIds())('AuthorBadges of %s', (bookId) => {
  it('has one button per author with the number of songs', () => {
    const { groups } = pages.get(bookId).data;
    const { getAllByRole } = render(<AuthorBadges contents={groups} />);

    expect(getAllByRole('button').map((button) => button.textContent)).toEqual(
      groups.map(({ items, name }) => `${name} (${items.length})`)
    );
  });

  it('scrolls to an existing section of the page on click', async () => {
    const { groups, unknown } = pages.get(bookId).data;
    const { getAllByRole } = render(
      <>
        <AuthorBadges contents={groups} />
        <Authors bookId={bookId} contents={groups} unknown={unknown} />
      </>
    );
    const user = userEvent.setup();
    vi.mocked(scrollToSection).mockClear();

    for (const button of getAllByRole('button')) await user.click(button);

    const targets = vi.mocked(scrollToSection).mock.calls.map(([name]) => name);
    expect(targets).toEqual(groups.map(({ name }) => name));
    expect(targets.filter((name) => !document.getElementById(`section-${name}`))).toEqual([]);
  });
});
