import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import AudioList from '@/components/song/AudioList/AudioList';
import { useIsOnline } from '@/other/hooks/useIsOnline';
import { getAudioSingerPath } from '@/other/paths';
import { playerManager } from '@/other/player/PlayerManager';
import { fakeAllSources, getAdapterOf } from '@/tests/helpers/player';
import { closePlayerPage } from '@/tests/helpers/playerPage';
import { loadSongPage } from '@/tests/helpers/pageData';

import type { TAudio } from '@/types/resources';

vi.mock('@/other/hooks/useIsOnline', () => ({ useIsOnline: vi.fn(() => true) }));

fakeAllSources();

let bookId: string;
let audio: TAudio[];
let songTitle: string;

beforeAll(async () => {
  const page = await loadSongPage('several-singers');
  bookId = page.route.bookId;
  audio = page.data.song.resources.audio;
  songTitle = page.data.song.title.join(' ');
});

beforeEach(() => {
  vi.mocked(useIsOnline).mockReturnValue(true);
});

afterEach(closePlayerPage);

function renderList() {
  render(<AudioList audio={audio} bookId={bookId} caption="Listen" offlineCaption="Offline" songTitle={songTitle} />);
}

const items = () => [...document.querySelectorAll('.AudioList__item')];
const playButton = (index: number) => items()[index].querySelector('button');

describe('AudioList', () => {
  it('has a player per recording, titled by the singer, and a link to the singer’s playlist', () => {
    renderList();

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Listen');
    expect(items().map((li) => li.querySelector('.PlayerWidget__title').textContent)).toEqual(
      audio.map((item) => item.title)
    );
    expect(items().map((li) => li.querySelector('a').getAttribute('href'))).toEqual(
      audio.map((item) => getAudioSingerPath(bookId, item.personSlug))
    );
    expect(items().map((li) => li.querySelector('a').getAttribute('aria-label'))).toEqual(
      audio.map((item) => item.title)
    );
  });

  it('shows the song title in the dock, not in the row', () => {
    renderList();
    fireEvent.click(playButton(0));

    expect(document.querySelector('.PlayerWidget__subtitle')).toBeNull();
    expect(playerManager.getSnapshot().active).toMatchObject({ title: audio[0].title, subtitle: songTitle });
  });

  it('plays the recording of the row', () => {
    renderList();
    fireEvent.click(playButton(1));

    expect(getAdapterOf(audio[1].embed_url).play).toHaveBeenCalledOnce();
    expect(getAdapterOf(audio[0].embed_url)).toBeUndefined();
  });

  it('does not go on to the next singer when a recording ends', () => {
    renderList();
    fireEvent.click(playButton(0));
    act(() => getAdapterOf(audio[0].embed_url).events.onEnded());

    expect(getAdapterOf(audio[1].embed_url)).toBeUndefined();
    expect(playerManager.getSnapshot().hasNext).toBe(true);
  });

  it('offline: says so and cannot be played', () => {
    vi.mocked(useIsOnline).mockReturnValue(false);
    renderList();
    fireEvent.click(playButton(0));
    fireEvent.click(items()[0].querySelector('.PlayerWidget'));

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Offline');
    expect(items().every((li) => li.querySelector('button').disabled)).toBe(true);
    expect(getAdapterOf(audio[0].embed_url)).toBeUndefined();
  });

  it('has no heading when the caption is empty', () => {
    render(<AudioList audio={audio} bookId={bookId} caption="" offlineCaption="" songTitle={songTitle} />);

    expect(screen.queryByRole('heading')).toBeNull();
  });
});
