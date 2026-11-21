'use client';
import { useEffect, useState } from 'react';

import './CacheStatusModal.scss';
import AppModal from '@/components/common/Modal/AppModal';
import CacheLed from './CacheLed';
import { getBookCacheInfo } from '@/other/offline/cacheStatus';
import { translate } from '@/other/i18n';
import { useCacheStatus } from '@/other/hooks/useCacheStatus';
import { useIsOnline } from '@/other/hooks/useIsOnline';

import type { TBookCacheInfo, TCacheImages, TCacheSize } from '@/types/offline';
import type { TBookCacheState } from '@/other/hooks/useCacheStatus';

/**/
type Props = {
  bookId: string;
  isOpen: boolean;
  onClose: () => void;
};

const STATE_KEYS: Record<TBookCacheState, string> = {
  cached: 'OFFLINE.AVAILABLE',
  caching: 'OFFLINE.SAVING',
  error: 'OFFLINE.NOT_SAVED',
  none: 'OFFLINE.NOT_SAVED',
  unavailable: 'OFFLINE.NOT_SAVED'
};

/** Shown until the worker answers. */
const PENDING = '…';
const KB = 1024;
const MB = KB * KB;

/** The one line that says the offline state of the book, in the language of the book. */
export function getStateText(bookId: string, state: TBookCacheState): string {
  return translate(bookId, STATE_KEYS[state]);
}

/** `1.6 MB`, `340.2 KB`: one decimal. */
export function formatBytes(bytes: number): string {
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${(bytes / KB).toFixed(1)} KB`;
}

/** `12 · 340.2 KB`; images: `6 / 19 · 340.2 KB` (cached / listed), just `19 · …` when all are cached. */
export function formatGroup(group: TCacheSize | TCacheImages): string {
  const isPartial = 'total' in group && group.count !== group.total;
  const count = isPartial ? `${group.count} / ${group.total}` : String(group.count);
  return `${count} · ${formatBytes(group.bytes)}`;
}

/**
 * Popup of the header dot: the offline state of the songbook, the progress
 * while it is being saved, and what the cache holds. No buttons: saving is
 * automatic and is tried again on the next session.
 *
 * Sizes and counts need a full cache listing in the worker
 * (`GET_BOOK_CACHE_INFO`), so they are asked for when the popup opens and
 * again when the state changes.
 */
function CacheStatusModal({ bookId, isOpen, onClose }: Props) {
  const { books, isAvailable } = useCacheStatus();
  const isOnline = useIsOnline();
  const [loadedInfo, setInfo] = useState<TBookCacheInfo | null>(null);

  const status = books[bookId];
  const state: TBookCacheState = isAvailable ? (status?.state ?? 'none') : 'unavailable';
  const hasPages = !!status?.pages;

  useEffect(() => {
    if (!isOpen || !hasPages) return;
    let isCurrent = true;
    getBookCacheInfo(bookId)
      .then((reply) => {
        if (isCurrent) setInfo(reply);
      })
      .catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, [bookId, hasPages, isOpen, state]);

  const t = (key: string) => translate(bookId, `OFFLINE.${key}`);
  const info = loadedInfo?.bookId === bookId ? loadedInfo : null;
  const percent = Math.round((status?.progress ?? 0) * 100);
  const show = (format: (info: TBookCacheInfo) => string) => (info ? format(info) : PENDING);

  // The all-songbooks total only when it shows a different number (other books are cached too);
  // hidden while the info is pending, so the row does not flash in and out.
  const allTotal = info && formatBytes(info.allTotalBytes);
  const showAllTotal = !!info && allTotal !== formatBytes(info.bookTotalBytes);

  // Without the bundle in the cache there is nothing to count: only the state line.
  const rows: Array<[key: string, label: string, value: string]> = hasPages
    ? [
      ['texts', t('TEXTS'), show((i) => formatGroup({ bytes: i.texts.bytes, count: i.pages }))],
      ['bookImages', t('BOOK_IMAGES'), show((i) => formatGroup(i.bookImages))],
      ['appImages', t('APP_IMAGES'), show((i) => formatGroup(i.appImages))],
      ['appResources', t('APP_RESOURCES'), show((i) => formatGroup(i.appResources))],
      ['appHtml', t('APP_HTML'), show((i) => formatGroup(i.appHtml))],
      ['bookTotal', t('BOOK_TOTAL'), show((i) => formatBytes(i.bookTotalBytes))],
      ...(showAllTotal ? [['allTotal', t('ALL_TOTAL'), allTotal] as [string, string, string]] : [])
    ]
    : [];

  const header = (
    <span className="CacheStatusModal__state">
      <CacheLed state={state} />
      {getStateText(bookId, state)}
    </span>
  );

  return (
    <AppModal header={header} isOpen={isOpen} onClose={onClose}>
      <div className="CacheStatusModal">
        {!isOnline && (
          <div className="CacheStatusModal__offline" role="status">
            {translate(bookId, 'FEEDBACK.OFFLINE')}
          </div>
        )}

        {state === 'caching' && (
          <div className="CacheStatusModal__progress">
            <div
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={percent}
              className="CacheStatusModal__bar"
              role="progressbar"
            >
              <div className="CacheStatusModal__fill" style={{ width: `${percent}%` }} />
            </div>
            <span className="CacheStatusModal__percent">{percent} %</span>
          </div>
        )}

        {rows.length > 0 && (
          <dl className="CacheStatusModal__rows">
            {rows.map(([key, label, value]) => (
              <div className="CacheStatusModal__row" data-row={key} key={key}>
                <dt className="CacheStatusModal__label">{label}</dt>
                <dd className="CacheStatusModal__value">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </AppModal>
  );
}

/**/
export default CacheStatusModal;
