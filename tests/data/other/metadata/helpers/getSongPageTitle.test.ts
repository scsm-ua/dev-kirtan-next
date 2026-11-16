import { describe, expect, it } from 'vitest';

import { getSongPageTitle } from '@/other/metadata/helpers/getSongPageTitle';

import type { TSong } from '@/types/song';

const song = (fields: object) => ({ title: ['Song', 'Title'], ...fields }) as unknown as TSong;

describe('getSongPageTitle', () => {
  it('joins the title lines', () => {
    expect(getSongPageTitle(song({}))).toBe('Song Title');
  });

  it('adds the first author line, then the subtitle', () => {
    const full = song({ author: ['by Author', 'second line'], subtitle: ['Sub', 'title'] });

    expect(getSongPageTitle(full)).toBe('Song Title. by Author. Sub title');
  });

  it('leaves the subtitle or the author out on request', () => {
    const full = song({ author: ['by Author'], subtitle: ['Subtitle'] });

    expect(getSongPageTitle(full, false)).toBe('Song Title. by Author');
    expect(getSongPageTitle(full, true, false)).toBe('Song Title. Subtitle');
  });

  it('skips empty author and subtitle lists', () => {
    expect(getSongPageTitle(song({ author: [], subtitle: [] }))).toBe('Song Title');
  });
});
