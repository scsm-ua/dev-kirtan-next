import classNames from 'classnames';
import { useState } from 'react';

import './VerseTranslation.scss';

const IMAGE_ONLY_REGEX = /^\s*<img\b[^>]*>\s*$/;

export function isImageOnlyLine(html: string): boolean {
  return IMAGE_ONLY_REGEX.test(html);
}

/**/
type Props = {
  imagesOnly?: boolean;
  isWide: boolean;
  isWBW: boolean;
  // Output of `processTranslationLines(..., 'VerseTranslation')`.
  lines: string[];
};

/**
 *
 */
function ImageThumb({ html }: { html: string }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((v) => !v);

  return (
    <p
      aria-expanded={expanded}
      className={classNames(
        'VerseTranslation__thumb',
        expanded && 'VerseTranslation__thumb--expanded'
      )}
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
      role="button"
      tabIndex={0}
    />
  );
}

/**
 *
 */
function VerseTranslation({ imagesOnly, isWide, isWBW, lines }: Props) {
  const cls = classNames(
    'VerseTranslation__paragraph',
    isWide && 'VerseTranslation__paragraph--wide',
    isWBW && 'VerseTranslation__paragraph--dark'
  );

  if (imagesOnly) {
    return (
      <div className="VerseTranslation">
        {lines.map((item, idx) => (
          <ImageThumb html={item} key={`${idx}-${item}`} />
        ))}
      </div>
    );
  }

  return (
    <div className="VerseTranslation">
      {lines.map((item, idx) => (
        <div key={`${idx}-${item}`}>
          {item.trim() === '---' ? (
            <hr className="VerseTranslation__separator" />
          ) : (
            <p className={cls} dangerouslySetInnerHTML={{ __html: item }} />
          )}
        </div>
      ))}
    </div>
  );
}

/**/
export default VerseTranslation;
