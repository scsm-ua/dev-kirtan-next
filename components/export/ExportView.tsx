'use client';
import { useEffect, useRef, useState } from 'react';

import ExportToolbar from '@/components/export/ExportToolbar';
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
  const [options, setOptions] = useState<TExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [hydrated, setHydrated] = useState(false);

  const patchOptions = (patch: Partial<TExportOptions>) =>
    setOptions((o) => ({ ...o, ...patch }));

  // Stamp the title with the open-time datetime so Print → Save as PDF uses it as filename.
  useEffect(() => {
    document.title = makeExportFileName(fileName);
  }, []);

  // Restore options from the URL on mount so refresh / shared links keep state.
  useEffect(() => {
    setOptions(exportOptionsFromSearch(window.location.search));
    setHydrated(true);
  }, []);

  // Reflect current options back into the URL (no history entry).
  useEffect(() => {
    if (!hydrated) return;
    const search = exportOptionsToSearch(options);
    const url = `${window.location.pathname}${search ? '?' + search : ''}${window.location.hash}`;
    window.history.replaceState(null, '', url);
  }, [hydrated, options]);

  const getBody = () => filterExportBody(body, options);

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
        options={options}
      />

      <div className="ExportPage" ref={previewRef} />
    </>
  );
}

/**/
export default ExportView;
