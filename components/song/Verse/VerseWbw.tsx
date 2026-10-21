import './VerseWbw.scss';
import { processTranslationLines } from '@/other/utils';

/**/
type Props = {
  lines: string[];
};

/**
 *
 */
function VerseWbw({ lines }: Props) {
  return (
    <div className="VerseWbw">
      {processTranslationLines(lines, 'VerseWbw').map((item, idx) => (
        <div key={idx}>
          <p
            className="VerseWbw__paragraph"
            dangerouslySetInnerHTML={{ __html: item }}
          />
        </div>
      ))}
    </div>
  );
}

/**/
export default VerseWbw;
