'use client';
import { type SyntheticEvent, useEffect, useState } from 'react';
import QRCode from 'react-qr-code';

import { translate } from '@/other/i18n';

/**/
type Props = {
  bookId: string;
  onClose: () => void;
  telegraphUrl?: string | null;
};

/**/
function selectHref(e: SyntheticEvent) {
  (e.target as HTMLInputElement).select();
}

/**
 *
 */
function SongShareForm({ bookId, onClose, telegraphUrl }: Props) {
  const [href, setHref] = useState<string | null>(null);

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value).catch(console.error);
    setTimeout(onClose, 300);
  };

  useEffect(() => {
    setHref(window.location.href);
  }, []);

  if (!href) return null;

  return (
    <div className="SongShare">
      <div className="SongShare__qr">
        <QRCode size={240} value={href} />
      </div>

      <div className="SongShare__copy">
        <label htmlFor="" className="SongShare__label">
          {translate(bookId, 'SONG_PAGE.COPY_LINK')}
        </label>

        <div className="SongShare__form">
          <input
            className="SongShare__input"
            onClick={selectHref}
            readOnly
            type="text"
            value={href}
          />

          <button
            className="AppButton RoundButton RoundButton--L RoundButton--dark SongShare__share"
            onClick={() => handleCopy(href)}
            title={translate(bookId, 'SONG_PAGE.COPY')}
          >
            <span className="icon-copy" />
          </button>
        </div>
      </div>

      {telegraphUrl && (
        <div className="SongShare__copy">
          <label htmlFor="" className="SongShare__label">
            Telegraph
          </label>

          <div className="SongShare__form">
            <input
              className="SongShare__input"
              onClick={selectHref}
              readOnly
              type="text"
              value={telegraphUrl}
            />

            <button
              className="AppButton RoundButton RoundButton--L RoundButton--dark SongShare__share"
              onClick={() => handleCopy(telegraphUrl)}
              title={translate(bookId, 'SONG_PAGE.COPY')}
            >
              <span className="icon-copy" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**/
export default SongShareForm;
