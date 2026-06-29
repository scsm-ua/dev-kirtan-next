'use client';
import classnames from 'classnames';

import './Verse.scss';
import Collapse from '@/components/common/Collapse/Collapse';
import LearnVerse from '@/components/song/Verse/LearnVerse';
import VerseText from '@/components/song/Verse/VerseText';
import VerseTranslation from '@/components/song/Verse/VerseTranslation';
import VerseWbw from '@/components/song/Verse/VerseWbw';

import type { TSong, TVerse } from '@/types/song';
import type { TTranslationMode } from '@/types/common';

/**/
type Props = {
  isLearn?: boolean;
  isWBW: boolean;
  length: number;
  meta: TSong['meta'];
  mode: TTranslationMode;
  verse: TVerse;
};

/**
 *
 */
function Verse({ isLearn, isWBW, length, meta, mode, verse }: Props) {
  const { number, subtitle, text, translation, word_by_word } = verse;
  const isWide = mode === '2';

  const showVerse = mode === '1' || mode === '3';
  const showWbw = mode === '3';
  const showTranslation = mode === '2' || mode === '3';
  const showWbwBlock = isWBW && !isLearn;
  // const showWbwBlock = isWBW;

  const stCls = (classnames as any)(
    'Verse__subtitles',
    mode === '2' && 'Verse__subtitles--large'
  );

  return (
    <li className="Verse" data-mode={mode}>
      {subtitle?.length > 0 && showTranslation && (
        <div className={stCls}>
          {subtitle.map((s: string) => (
            <div key={s}>{s}</div>
          ))}
        </div>
      )}

      {length > 1 && number && (
        <header className="Verse__header">
          <h6 className="Verse__title">{number}</h6>
        </header>
      )}

      {text?.length > 0 && (
        <Collapse defaultOpen={showVerse} open={showVerse}>
          {isLearn ? (
            <LearnVerse
              hasNumber={!!number}
              meta={meta}
              text={text}
              wordByWord={word_by_word}
            />
          ) : (
            <VerseText hasNumber={!!number} meta={meta} text={text} />
          )}
        </Collapse>
      )}

      {showWbwBlock && (
        <Collapse defaultOpen={showWbw} open={showWbw}>
          <VerseWbw lines={word_by_word} />
        </Collapse>
      )}

      {translation?.length > 0 && (
        <Collapse defaultOpen={showTranslation} open={showTranslation}>
          <VerseTranslation
            isWide={isWide}
            isWBW={isWBW}
            translation={translation}
          />
        </Collapse>
      )}
    </li>
  );
}

/**/
export default Verse;

