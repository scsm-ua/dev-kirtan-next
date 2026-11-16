import { describe, expect, it } from 'vitest';

import '@/other/player/plugins';
import { detectType, getPlugin, registerPlugin } from '@/other/player/registry';

describe('player plugin registry', () => {
  it('has the built-in plugins', () => {
    expect(getPlugin('audio').type).toBe('audio');
    expect(getPlugin('soundcloud').type).toBe('soundcloud');
  });

  it('fails for a type that no plugin has', () => {
    expect(() => getPlugin('video')).toThrow('no plugin registered for type "video"');
  });

  it.each([
    ['https://soundcloud.com/some-user/some-track', 'soundcloud'],
    ['http://m.soundcloud.com/some-user/some-track', 'soundcloud'],
    ['https://example.com/audio/some-track.mp3', 'audio'],
    ['https://example.com/audio/some-track.OGG?v=2', 'audio'],
    ['https://example.com/soundcloud.com/page', 'audio'],
    ['https://example.com/some-page', 'audio']
  ])('detects the type of %s as %s', (url, type) => {
    expect(detectType(url)).toBe(type);
  });

  it('offers a download for audio files and a link for SoundCloud', () => {
    const file = 'https://example.com/some-track.mp3';
    const track = 'https://soundcloud.com/some-user/some-track';

    expect(getPlugin('audio').getAction(file)).toMatchObject({ kind: 'download', href: file });
    expect(getPlugin('soundcloud').getAction(track)).toMatchObject({ kind: 'link', href: track });
  });

  it('lets a plugin registered later take over the URLs of an earlier one', () => {
    registerPlugin({
      type: 'custom',
      match: (url) => url.includes('soundcloud.com'),
      createAdapter: () => null
    });

    expect(detectType('https://soundcloud.com/some-user/some-track')).toBe('custom');
    expect(detectType('https://example.com/some-track.mp3')).toBe('audio');
  });
});
