import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Header from '@/components/common/Header/Header';
import { ABOUT_PAGE_SLUG, getSongbookPath, getSongPath } from '@/other/paths';
import { getBookIds } from '@/tests/helpers/books';

const [bookId] = getBookIds();
const about = { path: getSongPath(bookId, ABOUT_PAGE_SLUG), title: 'About <this> project' };

describe('Header', () => {
  it('links the logo to the songbook list of the book', () => {
    render(<Header bookId={bookId} />);

    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe(getSongbookPath(bookId));
  });

  it('has no info button without an About link', () => {
    render(<Header bookId={bookId} />);

    expect(document.querySelector('.Header__about')).toBeNull();
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('shows the info button that opens the About page, named by its title', () => {
    render(<Header about={about} bookId={bookId} />);
    const link = screen.getByRole('link', { name: about.title });

    expect(link.getAttribute('href')).toBe(about.path);
    expect(link.getAttribute('title')).toBe(about.title);
    // The icon is decoration: the name comes from the label.
    expect(link.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
  });

  it('puts the info button directly before the Feedback widget', () => {
    render(<Header about={about} bookId={bookId} />);
    const feedback = document.querySelector('.Header__actions > .FeedbackWidget');

    expect(feedback.previousElementSibling).toBe(screen.getByRole('link', { name: about.title }));
  });
});
