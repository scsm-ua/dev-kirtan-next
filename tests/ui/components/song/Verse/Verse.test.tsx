import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';

import Verse from '@/components/song/Verse/Verse';
import { isImageOnlyLine } from '@/components/song/Verse/VerseTranslation';
import { processTranslationLines } from '@/other/utils';
import { findSongPage } from '@/tests/helpers/pageData';
import { VIEW_MODE } from '@/types/common';

import type { TViewMode } from '@/types/common';
import type { TSong, TVerse } from '@/types/song';

type TFound = { song: TSong; verse: TVerse };

/** The first verse of a real song that matches. */
async function findVerse(description: string, matches: (verse: TVerse, song: TSong) => boolean): Promise<TFound> {
  const { song } = (await findSongPage(description, (s) => s.verses.some((v) => matches(v, s)))).data;
  return { song, verse: song.verses.find((v) => matches(v, song)) };
}

function renderVerse({ song, verse }: TFound, mode: TViewMode, length = song.verses.length) {
  return render(
    <Verse
      fullInlineWbw={song.fullInlineWbw}
      hasWbw={song.hasWbw}
      length={length}
      meta={song.meta}
      mode={mode}
      verse={verse}
    />
  );
}

const hasOriginal = (v: TVerse) => v.text?.length > 0 || v.word_by_word?.length > 0;
const hasTranslation = (v: TVerse) => v.translation?.length > 0;
const hasImageLine = (v: TVerse) =>
  processTranslationLines(v.translation, 'VerseTranslation').some(isImageOnlyLine);

const shown = (container: HTMLElement, selector: string) =>
  !!container.querySelector(`.Collapse[data-state="open"] ${selector}`);

let plain: TFound;
let originalOnly: TFound;
let translationOnly: TFound;
let withSubtitle: TFound;
let withImage: TFound;
let unnumberedLight: TFound;

beforeAll(async () => {
  plain = await findVerse(
    'a numbered verse with text and translation in a song of several verses',
    (v, s) => s.verses.length > 1 && !!v.number && v.text?.length > 0 && hasTranslation(v) && !v.subtitle?.length && !s.hasWbw
  );
  originalOnly = await findVerse('a verse with no translation', (v) => hasOriginal(v) && !hasTranslation(v) && !v.subtitle?.length);
  translationOnly = await findVerse(
    'a verse with only a translation',
    (v) => !hasOriginal(v) && hasTranslation(v) && !v.subtitle?.length && !hasImageLine(v)
  );
  withSubtitle = await findVerse('a verse with a subtitle', (v) => v.subtitle?.length > 0);
  withImage = await findVerse('a verse with an image line in its translation', (v) => hasTranslation(v) && hasImageLine(v));
  unnumberedLight = await findVerse(
    'a verse with no number in a song with light inline verses',
    (v, s) => s.meta.styles?.verses?.inline?.bold === false && !v.number
  );
});

describe('Verse', () => {
  it.each([
    [VIEW_MODE.ALL, true, true],
    [VIEW_MODE.VERSE, true, false],
    [VIEW_MODE.TRANSLATION, false, true]
  ])('in "%s" mode shows the verse text: %s, the translation: %s', (mode, text, translation) => {
    const { container } = renderVerse(plain, mode);

    expect(shown(container, '.VerseText')).toBe(text);
    expect(shown(container, '.VerseTranslation__paragraph')).toBe(translation);
    expect(container.querySelector('.Verse').getAttribute('data-mode')).toBe(mode);
  });

  it('shows the translation wide only in translation mode', () => {
    expect(renderVerse(plain, VIEW_MODE.TRANSLATION).container.querySelector('.VerseTranslation__paragraph--wide')).not.toBeNull();
    expect(renderVerse(plain, VIEW_MODE.ALL).container.querySelector('.VerseTranslation__paragraph--wide')).toBeNull();
  });

  it('shows every text and translation line', () => {
    const { container } = renderVerse(plain, VIEW_MODE.ALL);

    expect(container.querySelectorAll('.VerseTranslation__paragraph')).toHaveLength(
      processTranslationLines(plain.verse.translation, 'VerseTranslation').filter((line) => line.trim() !== '---').length
    );
    expect(container.querySelector('.VerseText').textContent.length).toBeGreaterThan(0);
  });

  describe('number', () => {
    it('shows the number of a verse in a song of several verses', () => {
      const { container } = renderVerse(plain, VIEW_MODE.ALL);

      expect(container.querySelector('.Verse__title').textContent).toBe(plain.verse.number);
    });

    it('shows no number when the song has one verse', () => {
      expect(renderVerse(plain, VIEW_MODE.ALL, 1).container.querySelector('.Verse__header')).toBeNull();
    });
  });

  describe('hiding a verse that would show only its number', () => {
    it('hides a verse without translation in translation mode, shows it otherwise', () => {
      expect(renderVerse(originalOnly, VIEW_MODE.TRANSLATION).container.innerHTML).toBe('');
      expect(renderVerse(originalOnly, VIEW_MODE.VERSE).container.innerHTML).not.toBe('');
    });

    it('hides a translation-only verse in verse mode, shows it otherwise', () => {
      expect(renderVerse(translationOnly, VIEW_MODE.VERSE).container.innerHTML).toBe('');
      expect(renderVerse(translationOnly, VIEW_MODE.TRANSLATION).container.innerHTML).not.toBe('');
    });

    it('hides an unnumbered verse of a song with light inline verses in verse mode', () => {
      expect(renderVerse(unnumberedLight, VIEW_MODE.VERSE).container.innerHTML).toBe('');
      expect(renderVerse(unnumberedLight, VIEW_MODE.ALL).container.innerHTML).not.toBe('');
    });
  });

  describe('subtitle', () => {
    it.each(Object.values(VIEW_MODE))('is shown in "%s" mode', (mode) => {
      const { container } = renderVerse(withSubtitle, mode);
      const subtitles = container.querySelector('.Verse__subtitles');

      expect(subtitles.textContent.replace(/\s+/g, '')).toBe(withSubtitle.verse.subtitle.join('').replace(/\s+/g, ''));
      expect(subtitles.classList.contains('Verse__subtitles--large')).toBe(mode === VIEW_MODE.TRANSLATION);
    });
  });

  describe('images in the translation', () => {
    it('get their own block, shown only in verse mode', () => {
      expect(shown(renderVerse(withImage, VIEW_MODE.VERSE).container, '.VerseTranslation__thumb')).toBe(true);
      expect(shown(renderVerse(withImage, VIEW_MODE.ALL).container, '.VerseTranslation__thumb')).toBe(false);
    });

    it('expand and collapse on click and from the keyboard', async () => {
      const { container } = renderVerse(withImage, VIEW_MODE.VERSE);
      const thumb = container.querySelector('.Collapse[data-state="open"] .VerseTranslation__thumb') as HTMLElement;
      const user = userEvent.setup();

      expect(thumb.getAttribute('role')).toBe('button');
      expect(thumb.getAttribute('aria-expanded')).toBe('false');

      await user.click(thumb);
      expect(thumb.getAttribute('aria-expanded')).toBe('true');
      expect(thumb.classList.contains('VerseTranslation__thumb--expanded')).toBe(true);

      thumb.focus();
      await user.keyboard('{Enter}');
      expect(thumb.getAttribute('aria-expanded')).toBe('false');

      await user.keyboard(' ');
      expect(thumb.getAttribute('aria-expanded')).toBe('true');
    });
  });
});
