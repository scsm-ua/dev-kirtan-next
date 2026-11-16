import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import AZ from '@/components/a-z/AZ';
import Pills from '@/components/common/Pills/Pills';
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

const pages = new Map<string, TPageDataOf<'a-z'>>();

beforeAll(async () => {
  for (const bookId of getBookIds()) pages.set(bookId, await loadPage({ kind: 'a-z', bookId }, 'a-z'));
});

describe.each(getBookIds())('Pills on the A–Z page of %s', (bookId) => {
  it('has one button per letter, and each scrolls to that letter of the list', async () => {
    const { book, groups, hasAudio } = pages.get(bookId).data;
    const letters = groups.map(({ name }) => name);
    const { getAllByRole } = render(
      <>
        <Pills items={letters.map((title) => ({ title }))} />
        <AZ bookId={bookId} contents={groups} hasAudio={hasAudio} shortcuts={book.shortcuts ?? []} />
      </>
    );
    const buttons = getAllByRole('button');
    const user = userEvent.setup();
    vi.mocked(scrollToSection).mockClear();

    expect(buttons.map((button) => button.textContent)).toEqual(letters);

    for (const button of buttons) await user.click(button);

    const targets = vi.mocked(scrollToSection).mock.calls.map(([name]) => name);
    expect(targets).toEqual(letters);
    expect(targets.filter((name) => !document.getElementById(`section-${name}`))).toEqual([]);
  });
});
