import './SongHeader.scss';
import { Fragment, type ReactNode } from 'react';
import { getSongbookPagePath, SONGBOOK_PAGE } from '@/other/paths';
import { groupLines, processTranslationLines } from '@/other/utils';
import type { TSong } from '@/types/song';

/**/
type Props = {
  bookId: string;
  song: TSong;
};

/**
 *
 */
function SongHeader({ bookId, song }: Props) {
  const { author, meta, subtitle, title, word_by_word } = song;

  const authorHref =
    getSongbookPagePath(bookId, SONGBOOK_PAGE.AUTHORS) +
    (meta.author ? `#section-${meta.author}` : '');

  return (
    <section className="SongHeader">
      {title?.length > 0 && (
        <h1 className="SongHeader__title">
          {groupLines(title).map((group, index) => (
            <div key={index}>{renderLines(group)}</div>
          ))}
        </h1>
      )}

      {getWBW(word_by_word)}

      {groupLines(subtitle || []).map((group, index) => (
        <div className="SongHeader__subtitle" key={index}>
          {renderLines(group)}
        </div>
      ))}

      {groupLines(author || []).map((group, index) => (
        <div className="SongHeader__author" key={index}>
          {renderLines(group, (line) => (
            <a href={authorHref}>{line}</a>
          ))}
        </div>
      ))}
    </section>
  );
}

/**
 *
 */
function renderLines(
  lines: string[],
  renderLine?: (line: string) => ReactNode,
) {
  return lines.map((line, index) => (
    <Fragment key={index}>
      {index > 0 && <br />}
      {renderLine ? renderLine(line) : line}
    </Fragment>
  ));
}

/**
 *
 */
function getWBW(wbw?: string[]) {
  if (!wbw || wbw.length === 0) return null;

  const items = processTranslationLines(wbw, 'SongHeader').map((item: string) => (
    <div
      className="SongHeader__wbw"
      dangerouslySetInnerHTML={{ __html: item }}
      key={item}
    />
  ));

  return <>{items}</>;
}

/**/
export default SongHeader;
