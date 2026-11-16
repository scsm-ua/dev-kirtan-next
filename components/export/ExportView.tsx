'use client';
import { useEffect, useRef, useState } from 'react';

import ExportToolbar from '@/components/export/ExportToolbar';
import { useAppLocation } from '@/other/router/location';
import {
  DEFAULT_EXPORT_OPTIONS,
  exportOptionsFromSearch,
  exportOptionsToSearch,
  filterExportBody,
  makeExportFileName,
  wrapExportDoc
} from '@/other/exportDoc';
import type { TExportOptions } from '@/other/exportDoc';
import './ExportToolbar.scss';

/**/
type Props = {
  body: string;
  fileName: string;
  lang: string;
  title: string;
};

/**
 * Owns the export options and keeps the preview in sync with the document
 * that gets downloaded / copied.
 */
function ExportView({ body, fileName, lang, title }: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const fileNameOnOpen = useRef(fileName);
  const location = useAppLocation();
  const [options, setOptions] = useState<TExportOptions | null>(null);
  const currentOptions = options ?? (
    location
      ? exportOptionsFromSearch(location.search.toString())
      : DEFAULT_EXPORT_OPTIONS
  );

  const patchOptions = (patch: Partial<TExportOptions>) => {
    setOptions((current) => ({ ...currentOptions, ...current, ...patch }));
  };

  // Stamp the title with the open-time datetime so Print → Save as PDF uses it as filename.
  useEffect(() => {
    document.title = makeExportFileName(fileNameOnOpen.current);
  }, []);

  // Reflect current options back into the URL (no history entry).
  useEffect(() => {
    if (!location || !options) return;
    const search = exportOptionsToSearch(options);
    const url = `${location.pathname}${search ? '?' + search : ''}${window.location.hash}`;
    window.history.replaceState(null, '', url);
  }, [location, options]);

  const getBody = () => filterExportBody(body, currentOptions);

  // Runs on every render (incl. HMR of exportDoc.ts) to keep preview in sync.
  useEffect(() => {
    if (previewRef.current) previewRef.current.innerHTML = getBody();
  });

  return (
    <>
      <ExportToolbar
        fileName={fileName}
        getHtml={() => wrapExportDoc(getBody(), title, lang)}
        onChange={patchOptions}
        options={currentOptions}
      />

      <div className="ExportPage" ref={previewRef} />
    </>
  );
}

/**/
export default ExportView;
