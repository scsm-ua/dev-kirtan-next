import { useEffect, useRef } from 'react';
import type { SyntheticEvent } from 'react';

import './SearchControls.scss';
import { translate } from '@/other/i18n';

/**/
type Props = {
  bookId: string;
  showNumpad?: boolean;
  value: string;
  onClear: () => void;
  onInput: (value: string) => void;
  onSubmit: () => void;
};

/**
 *
 */
function SearchControls({ bookId, showNumpad = true, value, onClear, onInput, onSubmit }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!/Mobi|Android/i.test(navigator.userAgent)) {
      inputRef.current?.focus();
    }
  }, []);

  const handleChange = (e: SyntheticEvent) => onInput(e.target['value']);

  const handleKeyDown = (e: SyntheticEvent) => {
    if (e['key'] === 'Enter' || e['keyCode'] === 13) onSubmit();
  };

  const handleNumpad = (digit: string) => onInput(value + digit);

  return (
    <div className="SearchControls">
      <div className="SearchControls__container">
        <input
          ref={inputRef}
          className="SearchControls__input"
          placeholder={translate(bookId, 'SEARCH_PAGE.INPUT_PLACEHOLDER')}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />

        <button
          className="NoBorderButton SearchControls__clear"
          onClick={onClear}
          title={translate(bookId, 'SEARCH_PAGE.CLEAR')}
        >
          <span className="icon-xmark-large" />
        </button>
      </div>

      <button
        className="RoundButton RoundButton--dark SearchControls__submit"
        onClick={onSubmit}
        title={translate(bookId, 'SEARCH_PAGE.FIND')}
      >
        <span className="icon-search" />
      </button>

      {showNumpad && (
        <div className="SearchControls__numpad-wrapper">
          <span className="SearchControls__numpad-label">{translate(bookId, 'SEARCH_PAGE.OR_ENTER_PAGE')}</span>
          <div className="SearchControls__numpad">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => (
              <button
                key={d}
                className="SearchControls__numpad-btn"
                onClick={() => handleNumpad(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**/
export default SearchControls;
