import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import PrevNextLink from '@/components/song/PrevNextNav/PrevNextLink';
import { loadSongPage } from '@/tests/helpers/pageData';

import type { TNavItem } from '@/types/song';

let item: TNavItem;

beforeAll(async () => {
  const { nav } = (await loadSongPage('in-one-book')).data;
  item = Object.values(nav)
    .flatMap(({ prev, next }) => [prev, next])
    .find((candidate): candidate is TNavItem => !!candidate && !!candidate.title);

  // Guard: the tests below need a real neighbour with a title.
  expect(item).toBeTruthy();
});

describe('PrevNextLink', () => {
  it.each(['prev', 'next'] as const)('links to the %s item and shows its title', (dir) => {
    const { container } = render(<PrevNextLink dir={dir} item={item} />);
    const link = container.querySelector('a');

    expect(link.getAttribute('href')).toBe(item.path);
    expect(link.textContent).toBe(item.title);
    expect(link.classList.contains(`PrevNextLink--${dir}`)).toBe(true);
  });

  it('has only its own classes on the link', () => {
    const { container } = render(<PrevNextLink dir="next" item={item} />);

    expect([...container.querySelector('a').classList]).toEqual(['PrevNextLink', 'PrevNextLink--next']);
  });

  it('shows a disabled placeholder, not a link, when there is no item', () => {
    const { container } = render(<PrevNextLink dir="prev" />);
    const placeholder = container.querySelector('.PrevNextLink');

    expect(container.querySelector('a')).toBeNull();
    expect(placeholder.tagName).toBe('SPAN');
    expect([...placeholder.classList]).toEqual(['PrevNextLink', 'PrevNextLink--prev', 'PrevNextLink--disabled']);
    expect(placeholder.hasAttribute('data-disabled')).toBe(true);
    expect(placeholder.textContent).toBe('');
  });
});
