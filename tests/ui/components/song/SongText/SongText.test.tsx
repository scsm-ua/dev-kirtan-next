import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import SongText from '@/components/song/SongText/SongText';
import { translate } from '@/other/i18n';
import { findSongPage } from '@/tests/helpers/pageData';

import type { TSong } from '@/types/song';
import type { TViewMode, TWbwMode } from '@/types/common';

// The finders below load real songs until one matches; lib/ caches the book files in production mode.
vi.stubEnv('NODE_ENV', 'production');
afterAll(() => vi.unstubAllEnvs());

const LABEL = 'Show verses / translation';
const VIEW_KEY = 'SONG_VIEW_MODE';
const WBW_KEY = 'SONG_WBW_MODE';

type TCase = { bookId: string; song: TSong };

// A song with verses and translations but no word-by-word: the three-mode switch.
let plain: TCase;
// A song where every verse has per-word data: the menu, with learn (inline) mode.
let learnable: TCase;
// A song with word-by-word only as a block: the menu, without inline mode.
let classicalOnly: TCase;

const hasText = (song: TSong) => song.hasVersesText && song.hasVersesTranslations;

beforeAll(async () => {
  const load = async (description: string, matches: (song: TSong) => boolean): Promise<TCase> => {
    const page = await findSongPage(description, matches);
    return { bookId: page.route.bookId, song: page.data.song };
  };

  plain = await load('verses and translations, no word-by-word', (song) => hasText(song) && !song.hasWbw);
  learnable = await load('word-by-word for every word', (song) => hasText(song) && song.hasWbw && song.fullInlineWbw);
  classicalOnly = await load('word-by-word only as a block', (song) => hasText(song) && song.hasWbw && !song.fullInlineWbw);
});

/** Renders the song text; the stored modes are what the user picked on an earlier visit. */
function renderSong({ bookId, song }: TCase, stored: { mode?: TViewMode; wbw?: TWbwMode } = {}) {
  if (stored.mode) localStorage.setItem(VIEW_KEY, stored.mode);
  if (stored.wbw) localStorage.setItem(WBW_KEY, stored.wbw);

  const view = render(<SongText bookId={bookId} label={LABEL} song={song} />);
  return { ...view, user: userEvent.setup() };
}

/** How many blocks of a kind are open (shown) in the verses. */
const countOpen = (selector: string) =>
  document.querySelectorAll(`.Collapse[data-state="open"] ${selector}`).length;

const shown = () => ({
  verses: countOpen('.VerseText') > 0,
  translations: countOpen('.VerseTranslation__paragraph') > 0,
  wbwBlocks: countOpen('.VerseWbw') > 0,
  learn: countOpen('.LearnVerse') > 0
});

const radio = (bookId: string, key: string) =>
  [...document.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find(
    (item) => item.textContent === translate(bookId, `DISPLAY_MODE_MENU.${key}`)
  );
const checkedRadios = () =>
  [...document.querySelectorAll('[role="radio"][aria-checked="true"]')].map((item) => item.textContent);

const pressHotkey = (name: 'kirtan:setMode' | 'kirtan:setWbwMode', detail: object) =>
  act(() => {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  });

describe('SongText', () => {
  describe('on a song without word-by-word', () => {
    it('shows verses and translations, and the three-mode switch', () => {
      renderSong(plain);

      expect(document.querySelectorAll('.Verse')).toHaveLength(plain.song.verses.length);
      expect(shown()).toEqual({ verses: true, translations: true, wbwBlocks: false, learn: false });
      expect(document.querySelector('.ThreeModeSwitch .label-text').textContent).toBe(LABEL);
      expect(document.querySelector('.DisplayModeMenu')).toBeNull();
      expect(document.querySelector('.SongLoader')).toBeNull();
    });

    it('opens in the mode the user picked before', () => {
      renderSong(plain, { mode: 'translation' });

      expect(shown()).toMatchObject({ verses: false, translations: true });
      expect(document.querySelector('.SongText').classList.contains('SongText--wide')).toBe(true);
    });

    it('switches to verses only with the left half, and remembers it', async () => {
      const { user } = renderSong(plain);

      await user.click(document.querySelector('.ThreeModeSwitch .slot.left'));

      expect(shown()).toMatchObject({ verses: true, translations: false });
      expect(localStorage.getItem(VIEW_KEY)).toBe('verse');
    });

    it('switches to translation only with the right half, and back to both with a second click', async () => {
      const { user } = renderSong(plain);
      const right = document.querySelector('.ThreeModeSwitch .slot.right');

      await user.click(right);
      expect(shown()).toMatchObject({ verses: false, translations: true });
      expect(localStorage.getItem(VIEW_KEY)).toBe('translation');

      await user.click(right);
      expect(shown()).toMatchObject({ verses: true, translations: true });
      expect(localStorage.getItem(VIEW_KEY)).toBe('all');
    });

    it.each([
      ['all', { verses: true, translations: true }],
      ['verse', { verses: true, translations: false }],
      ['translation', { verses: false, translations: true }]
    ] as const)('follows the view hotkey "%s"', (mode, expected) => {
      renderSong(plain, { mode: mode === 'all' ? 'verse' : 'all' });

      pressHotkey('kirtan:setMode', { mode });

      expect(shown()).toMatchObject(expected);
      expect(localStorage.getItem(VIEW_KEY)).toBe(mode);
    });

    it('never shows word-by-word, whatever is stored or pressed', () => {
      renderSong(plain, { wbw: 'classical' });
      pressHotkey('kirtan:setWbwMode', { wbwMode: 'classical' });

      expect(shown()).toMatchObject({ wbwBlocks: false, learn: false });
    });
  });

  describe('on a song with word-by-word for every word', () => {
    it('hides word-by-word at first and shows the menu with both groups of options', () => {
      const { bookId } = learnable;
      renderSong(learnable);

      expect(shown()).toEqual({ verses: true, translations: true, wbwBlocks: false, learn: false });
      expect(document.querySelector('.ThreeModeSwitch')).toBeNull();
      expect(document.querySelector('.DisplayModeMenu__trigger').getAttribute('aria-label')).toBe(LABEL);
      expect(checkedRadios()).toEqual([
        translate(bookId, 'DISPLAY_MODE_MENU.SHOW_ALL'),
        translate(bookId, 'DISPLAY_MODE_MENU.HIDE_WBW')
      ]);
    });

    it('keeps the menu closed and out of reach until its button is pressed', async () => {
      const { user } = renderSong(learnable);
      const trigger = document.querySelector('.DisplayModeMenu__trigger');
      const panel = document.querySelector('.DisplayModeMenu__panelWrap');

      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(panel.hasAttribute('inert')).toBe(true);

      await user.click(trigger);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(panel.hasAttribute('inert')).toBe(false);

      await user.click(trigger);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('shows the classical word-by-word blocks when picked, and remembers it', async () => {
      const { bookId } = learnable;
      const { user } = renderSong(learnable);
      await user.click(document.querySelector('.DisplayModeMenu__trigger'));

      await user.click(radio(bookId, 'CLASSICAL_WBW'));

      expect(shown()).toEqual({ verses: true, translations: true, wbwBlocks: true, learn: false });
      expect(localStorage.getItem(WBW_KEY)).toBe('classical');
      expect(radio(bookId, 'CLASSICAL_WBW').getAttribute('aria-checked')).toBe('true');
    });

    it('replaces the verses with the per-word view in inline mode', async () => {
      const { bookId } = learnable;
      const { user } = renderSong(learnable);
      await user.click(document.querySelector('.DisplayModeMenu__trigger'));

      await user.click(radio(bookId, 'INLINE_WBW'));

      expect(shown()).toEqual({ verses: false, translations: true, wbwBlocks: false, learn: true });
      expect(localStorage.getItem(WBW_KEY)).toBe('inline');
      expect(document.querySelector('.SongText').classList.contains('SongText--learn')).toBe(true);
    });

    it('switches the view mode from the menu, and remembers it', async () => {
      const { bookId } = learnable;
      const { user } = renderSong(learnable);
      await user.click(document.querySelector('.DisplayModeMenu__trigger'));

      await user.click(radio(bookId, 'TRANSLATION_ONLY'));

      expect(shown()).toEqual({ verses: false, translations: true, wbwBlocks: false, learn: false });
      expect(localStorage.getItem(VIEW_KEY)).toBe('translation');
    });

    it('shows no word-by-word in translation-only mode, even when it is turned on', () => {
      renderSong(learnable, { mode: 'translation', wbw: 'classical' });

      expect(shown()).toEqual({ verses: false, translations: true, wbwBlocks: false, learn: false });
    });

    it('uses the per-word view instead of the blocks when only verses are shown', () => {
      renderSong(learnable, { mode: 'verse', wbw: 'classical' });

      expect(shown()).toEqual({ verses: false, translations: false, wbwBlocks: false, learn: true });
    });

    it('opens with the stored modes', () => {
      renderSong(learnable, { mode: 'all', wbw: 'inline' });

      expect(shown()).toEqual({ verses: false, translations: true, wbwBlocks: false, learn: true });
    });

    it('follows the word-by-word hotkeys', () => {
      renderSong(learnable);

      pressHotkey('kirtan:setWbwMode', { wbwMode: 'inline' });
      expect(shown()).toMatchObject({ learn: true, wbwBlocks: false });
      expect(localStorage.getItem(WBW_KEY)).toBe('inline');

      pressHotkey('kirtan:setWbwMode', { wbwMode: 'classical' });
      expect(shown()).toMatchObject({ learn: false, wbwBlocks: true });

      pressHotkey('kirtan:setWbwMode', { wbwMode: 'hide' });
      expect(shown()).toMatchObject({ learn: false, wbwBlocks: false });
      expect(localStorage.getItem(WBW_KEY)).toBe('hide');
    });

    describe('the compact and learn buttons', () => {
      const compactButton = () => document.querySelector<HTMLButtonElement>('.SongText__compact');
      const learnButton = () => document.querySelector<HTMLButtonElement>('.SongText__learn');

      it('offers "compact" in the full view; it leaves only the verses', async () => {
        const { user } = renderSong(learnable);
        expect(learnButton()).toBeNull();
        expect(compactButton().getAttribute('aria-pressed')).toBe('false');

        await user.click(compactButton());

        expect(shown()).toEqual({ verses: true, translations: false, wbwBlocks: false, learn: false });
        expect(localStorage.getItem(VIEW_KEY)).toBe('verse');
        expect(localStorage.getItem(WBW_KEY)).toBe('hide');
      });

      it('offers "learn" in the compact view; it shows everything with the per-word view', async () => {
        const { bookId } = learnable;
        const { user } = renderSong(learnable, { mode: 'verse', wbw: 'hide' });
        expect(compactButton()).toBeNull();
        expect(learnButton().getAttribute('aria-label')).toBe(translate(bookId, 'DISPLAY_MODE_MENU.LEARN_MODE'));

        await user.click(learnButton());

        expect(shown()).toEqual({ verses: false, translations: true, wbwBlocks: false, learn: true });
        expect(localStorage.getItem(VIEW_KEY)).toBe('all');
        expect(localStorage.getItem(WBW_KEY)).toBe('inline');
        // In learn mode the way back is the compact button.
        expect(learnButton()).toBeNull();
        expect(compactButton()).not.toBeNull();
      });

      it('goes from learn back to compact and to learn again', async () => {
        const { user } = renderSong(learnable, { mode: 'all', wbw: 'inline' });

        await user.click(compactButton());
        expect(shown()).toEqual({ verses: true, translations: false, wbwBlocks: false, learn: false });

        await user.click(learnButton());
        expect(shown()).toEqual({ verses: false, translations: true, wbwBlocks: false, learn: true });
      });
    });
  });

  describe('on a song with word-by-word only as a block', () => {
    it('offers no inline option', async () => {
      const { bookId } = classicalOnly;
      const { user } = renderSong(classicalOnly);
      await user.click(document.querySelector('.DisplayModeMenu__trigger'));

      expect(radio(bookId, 'INLINE_WBW')).toBeUndefined();
      expect(radio(bookId, 'CLASSICAL_WBW')).not.toBeUndefined();
      expect(radio(bookId, 'HIDE_WBW')).not.toBeUndefined();
    });

    it('falls back to the blocks when inline mode is stored from another song', () => {
      renderSong(classicalOnly, { wbw: 'inline' });

      expect(shown()).toEqual({ verses: true, translations: true, wbwBlocks: true, learn: false });
    });

    it('keeps the blocks when only verses are shown: there is no other way to see word-by-word', () => {
      renderSong(classicalOnly, { mode: 'verse', wbw: 'classical' });

      expect(shown()).toEqual({ verses: true, translations: false, wbwBlocks: true, learn: false });
    });
  });
});
