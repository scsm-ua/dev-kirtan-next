import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import SongImage from '@/components/song/SongImage/SongImage';
import { loadSongPage } from '@/tests/helpers/pageData';

import type { TImage } from '@/types/resources';

let image: TImage;
let alt: string;

beforeAll(async () => {
  const { song } = (await loadSongPage('image')).data;
  image = song.resources.image;
  alt = song.title.join(' ');
});

describe('SongImage', () => {
  it('shows the image of the song with its size and the song title as alt text', () => {
    render(<SongImage alt={alt} image={image} />);
    const img = screen.getByRole('img', { name: alt });

    expect(img.getAttribute('src')).toBe(image.src);
    expect(img.getAttribute('width')).toBe(String(image.width));
    expect(img.getAttribute('height')).toBe(String(image.height));
    expect(img.style.getPropertyValue('--song-image-max-width')).toBe(`${image.width * 2}px`);
  });

  it('disappears when the image fails to load', () => {
    const { container } = render(<SongImage alt={alt} image={image} />);
    fireEvent.error(screen.getByRole('img'));

    expect(container.innerHTML).toBe('');
  });
});
