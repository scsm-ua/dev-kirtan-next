import { describe, expect, it } from 'vitest';

import { getContentHandler } from '@/lib/content/registry';
import { pageHandler } from '@/lib/content/page';
import { songHandler } from '@/lib/content/song';

describe('getContentHandler', () => {
  it('returns the handler of the item type', () => {
    expect(getContentHandler('song')).toBe(songHandler);
    expect(getContentHandler('page')).toBe(pageHandler);
  });

  it('treats an item without a type as a song', () => {
    expect(getContentHandler()).toBe(songHandler);
  });

  it('marks only pages in the export indexes', () => {
    expect(songHandler.indexEntryClass).toBe('');
    expect(pageHandler.indexEntryClass).toBe('page');
  });
});
