'use client';
import classNames from 'classnames';
import { useEffect, useState } from 'react';

import './SongText.scss';

import {
  getSongDisplayMode,
  getSongLearnMode,
  setSongDisplayMode,
  setSongLearnMode
} from '@/other/userPreferrences';
import SongLoader from '@/components/song/SongText/SongLoader';
import ThreeModeSwitch from '@/components/common/ThreeModeSwitch/ThreeModeSwitch';
import Verse from '@/components/song/Verse/Verse';

import type { TSong, TVerse } from '@/types/song';
import type { TTranslationMode } from '@/types/common';

/**/
type Props = {
  label: string;
  song: TSong;
};

/**
 *
 */
function SongText({ label, song }: Props) {
  const [mode, setMode] = useState<TTranslationMode>(null);
  const [isLearn, setIsLearn] = useState<boolean>(false);
  const [updateCount, setCounter] = useState<number>(0);

  const hasTranslation = !('translation' in song.meta) || song.meta.translation !== 'no';
  const isWBW = !!song.verses.find((v: TVerse) => v.word_by_word?.length > 0);

  const contentCls = classNames(
    'SongText',
    mode === '2' && 'SongText--wide',
    updateCount > 0 && 'SongText--transition'
  );

  useEffect(() => {
    setMode(getSongDisplayMode());
    setIsLearn(getSongLearnMode());
  }, []);

  const handleChange = (mode: TTranslationMode) => {
    setCounter((c) => ++c);
    setSongDisplayMode(mode);
    setMode(mode);
  };

  const handleLearnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.checked;
    setSongLearnMode(value);
    setIsLearn(value);
  };

  useEffect(() => {
    const handleSetMode = (e: Event) => {
      handleChange((e as CustomEvent<{ mode: TTranslationMode }>).detail.mode);
    };

    window.addEventListener('kirtan:setMode', handleSetMode);
    return () => window.removeEventListener('kirtan:setMode', handleSetMode);
  }, []);

  return (
    <main className={contentCls}>
      {mode ? (
        <>
          {(hasTranslation || isWBW) && (
            <div className="SongText__toggle">
              {hasTranslation && (
                <ThreeModeSwitch
                  label={label}
                  onChange={handleChange}
                  value={mode as any}
                />
              )}

              {isWBW && (
                <label className="SongText__learn">
                  <input
                    type="checkbox"
                    checked={isLearn}
                    onChange={handleLearnChange}
                  />
                  <span>Learn</span>
                </label>
              )}
            </div>
          )}

          <ul className="SongText__list">
            {song.verses.map((verse: TVerse, idx: number, arr: TVerse[]) => (
              <Verse
                isLearn={isLearn && isWBW}
                isWBW={isWBW}
                key={idx}
                length={arr.length}
                meta={song.meta}
                mode={mode}
                verse={verse}
              />
            ))}
          </ul>
        </>
      ) : (
        <SongLoader />
      )}
    </main>
  );
}

/**/
export default SongText;

