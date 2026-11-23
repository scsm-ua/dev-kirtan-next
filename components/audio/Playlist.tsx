'use client';
import classNames from 'classnames';
import { useContext, useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react';

import './Playlist.scss';
import PlayerWidget from '@/components/player/PlayerWidget';
import PlaylistLink from '@/components/audio/PlaylistLink';
import { AUTOPLAY_PARAM, getSongPathWithPage } from '@/other/paths';
import { translate } from '@/other/i18n';
import { playerManager } from '@/other/player/PlayerManager';
import { PagePathContext } from '@/other/router/pagePath';
import { getAudioSort, setAudioSort } from '@/other/userPreferrences';
import { AUDIO_SORT } from '@/types/audio';

import type { TAudioSort, TAudioTrack } from '@/types/audio';

/**/
type Props = {
  bookId: string;
  tracks: Array<TAudioTrack>;
  /** Render the singer next to the title (all recordings view). */
  showSinger?: boolean;
};

/**/
const SORT_OPTIONS: Array<{ value: TAudioSort; labelKey: string }> = [
  { value: AUDIO_SORT.FIRST_LINE, labelKey: 'AUDIO_PAGE.SHOW_FIRST_LINES' },
  { value: AUDIO_SORT.TITLE, labelKey: 'AUDIO_PAGE.SHOW_TITLES' },
  { value: AUDIO_SORT.SHUFFLE, labelKey: 'AUDIO_PAGE.SHOW_SHUFFLE' }
];

/**/
const SORT_MODIFIER: Partial<Record<TAudioSort, string>> = {
  [AUDIO_SORT.TITLE]: 'PlaylistSort--second',
  [AUDIO_SORT.SHUFFLE]: 'PlaylistSort--third'
};

/** Fisher-Yates. */
function shuffle<T>(list: Array<T>): Array<T> {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** What the page of the playing playlist looked like: its sort and the order of `track.order`. */
type TPlaylistView = { sort: TAudioSort; order: Array<number> };

/** The view saved with the playing playlist, when `path` is its page. */
function getSavedView(path: string): TPlaylistView | null {
  return (playerManager.getPlaylistView(path) as TPlaylistView | null) ?? null;
}

/** `tracks` in a saved order; tracks it does not know go last. */
function restoreOrder(tracks: Array<TAudioTrack>, order: Array<number>): Array<TAudioTrack> {
  const position = new Map(order.map((value, index) => [value, index]));
  const at = (track: TAudioTrack) => position.get(track.order) ?? order.length;
  return [...tracks].sort((a, b) => at(a) - at(b));
}

/**/
const noopSubscribe = () => () => {};
const getServerSort = (): TAudioSort => AUDIO_SORT.FIRST_LINE;

/**
 * `tracks` arrive sorted by first line; the title sort restores contents order.
 */
function Playlist({ bookId, tracks, showSinger }: Props) {
  const name = useId();
  // Static HTML is always first-line sorted; the stored choice applies after hydration.
  const stored = useSyncExternalStore(noopSubscribe, getAudioSort, getServerSort);
  const path = useContext(PagePathContext) ?? '';
  // The page of the playing playlist comes back as it was left: prev/next follow this order.
  const [saved] = useState(() => getSavedView(path));
  const [picked, setPicked] = useState<TAudioSort | null>(null);
  const sort = picked ?? saved?.sort ?? stored;
  const isSortByTitleEnabled = sort === AUDIO_SORT.TITLE;
  const [shuffled] = useState(() =>
    saved?.sort === AUDIO_SORT.SHUFFLE ? restoreOrder(tracks, saved.order) : shuffle(tracks)
  );
  const sorted = useMemo(() => {
    if (sort === AUDIO_SORT.SHUFFLE) return shuffled;
    return isSortByTitleEnabled ? [...tracks].sort((a, b) => a.order - b.order) : tracks;
  }, [sort, isSortByTitleEnabled, shuffled, tracks]);

  // The manager keeps the view with the playlist played from this page, to show the page the
  // same way when it comes back. Then the dock: its title just changed, and on the page of the
  // playing playlist prev/next follow the new order (on other pages they do not).
  useEffect(() => {
    playerManager.setPageView(path, { sort, order: sorted.map((track) => track.order) });
    playerManager.refresh();
  }, [path, sort, sorted]);

  // `?autoplay=1` (from a singer's play link): start the first track once, then drop the param.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(AUTOPLAY_PARAM)) return;
    url.searchParams.delete(AUTOPLAY_PARAM);
    window.history.replaceState(window.history.state, '', url);
    playerManager.playFirst();
  }, []);

  const handleSort = (value: TAudioSort) => {
    setAudioSort(value);
    setPicked(value);
  };

  return (
    <>
      <div
        className={classNames(
          'PlaylistSort',
          SORT_MODIFIER[sort],
          picked && 'PlaylistSort--animated'
        )}
        role="radiogroup"
      >
        {SORT_OPTIONS.map(({ value, labelKey }) => (
          <label className="PlaylistSort__option" key={value}>
            <input
              checked={sort === value}
              className="PlaylistSort__input"
              name={name}
              onChange={() => handleSort(value)}
              type="radio"
            />
            <span className="PlaylistSort__label">{translate(bookId, labelKey)}</span>
          </label>
        ))}
      </div>

      <ul className="Playlist">
        {sorted.map((track: TAudioTrack) => {
          const { item } = track;
          const page = Array.isArray(item.page) ? item.page.join(', ') : item.page;
          const primary = isSortByTitleEnabled ? item.title : track.label;
          const secondary = isSortByTitleEnabled ? track.label : item.title;
          const subtitle = showSinger
            ? track.singerName
            : secondary !== primary
              ? secondary
              : undefined;

          return (
            <li className="Playlist__item" key={track.order}>
              <PlayerWidget
                className="Playlist__player"
                loop
                showSubtitleInline
                source={{ url: track.url }}
                subtitle={subtitle}
                title={primary}
                trackInfo={{
                  bookId,
                  pageType: 'playlist',
                  singer: track.singerName,
                  title: item.title
                }}
              />

              <PlaylistLink
                className="Playlist__link"
                href={getSongPathWithPage(bookId, item)}
                title={secondary}
              >
                {page && (
                  <span
                    className="Playlist__page"
                    title={translate(bookId, 'SONG_PAGE.PAGE_IN_PAPER_SONGBOOK')}
                  >
                    {page}
                  </span>
                )}
                <span className="Playlist__icon icon-chevron-right" />
              </PlaylistLink>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**/
export default Playlist;
