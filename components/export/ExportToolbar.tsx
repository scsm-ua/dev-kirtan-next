'use client';
import { useState } from 'react';

import './ExportToolbar.scss';

import { makeExportFileName } from '@/other/exportDoc';
import type { TExportOptions, TVerseNumberMode } from '@/other/exportDoc';

/**/
type Props = {
  fileName: string;
  getHtml: () => string;
  onChange: (patch: Partial<TExportOptions>) => void;
  options: TExportOptions;
};

/**
 * Floating controls for saving/copying the export document.
 * Hidden in print so File > Print > PDF stays clean.
 */
function ExportToolbar({ fileName, getHtml, onChange, options }: Props) {
  const {
    onlyTranslated,
    verseIndent,
    verseNumberMode,
    withFirstLines,
    withLinks,
    withNavLinks,
    withPageNumbers,
    withToc,
    withWbw
  } = options;

  const [copied, setCopied] = useState<string>('');
  const [collapsed, setCollapsed] = useState(false);

  const handleDownload = () => {
    const blob = new Blob([getHtml()], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = makeExportFileName(fileName, '.html');
    a.click();
    URL.revokeObjectURL(url);
  };

  const flashCopied = (label: string) => {
    setCopied(label);
    window.setTimeout(() => setCopied(''), 2000);
  };

  // text/html flavor lets Word / Google Docs paste with heading styles.
  const handleCopy = async () => {
    const html = getHtml();
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([html], { type: 'text/plain' })
        })
      ]);
      flashCopied('Copied as rich text');
    } catch {
      await navigator.clipboard.writeText(html);
      flashCopied('Copied as text');
    }
  };

  return (
    <div className={`ExportToolbar${collapsed ? ' ExportToolbar--collapsed' : ''}`}>
      <button
        className="ExportToolbar__toggle"
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        title={collapsed ? 'Expand toolbar' : 'Collapse toolbar'}
      >
        {collapsed ? '⚙' : '✕'}
      </button>
      {!collapsed && <>
      <div className="ExportToolbar__group">
        <div className="ExportToolbar__group-title">Navigation</div>
        <label className="ExportToolbar__option">
          <input
            checked={withToc}
            onChange={(e) => onChange({ withToc: e.target.checked })}
            type="checkbox"
          />
          Table of contents
        </label>
        <label className="ExportToolbar__option">
          <input
            checked={withFirstLines}
            onChange={(e) => onChange({ withFirstLines: e.target.checked })}
            type="checkbox"
          />
          First-line index
        </label>
        <label className="ExportToolbar__option">
          <input
            checked={withPageNumbers}
            onChange={(e) => onChange({ withPageNumbers: e.target.checked })}
            type="checkbox"
          />
          Page numbers in TOC
        </label>
        <label className="ExportToolbar__option">
          <input
            checked={withLinks}
            onChange={(e) => onChange({ withLinks: e.target.checked })}
            type="checkbox"
          />
          Enable links
        </label>
        <label className="ExportToolbar__option">
          <input
            checked={withNavLinks && withLinks}
            disabled={!withLinks}
            onChange={(e) => onChange({ withNavLinks: e.target.checked })}
            type="checkbox"
          />
          Add navigation to top
        </label>
      </div>

      <div className="ExportToolbar__group">
        <div className="ExportToolbar__group-title">Songs</div>
        <label className="ExportToolbar__option">
          Verse indent&nbsp;
          <input
            max={100}
            min={0}
            onChange={(e) => onChange({ verseIndent: Number(e.target.value) })}
            type="range"
            value={verseIndent}
          />
          <input
            className="ExportToolbar__number"
            min={0}
            onChange={(e) =>
              onChange({ verseIndent: Math.max(0, Number(e.target.value) || 0) })
            }
            type="number"
            value={verseIndent}
          />
          px
        </label>
        <label className="ExportToolbar__option">
          Verse number
          <select
            value={verseNumberMode}
            onChange={(e) =>
              onChange({ verseNumberMode: e.target.value as TVerseNumberMode })
            }
          >
            <option value="heading">Heading h5</option>
            <option value="verse-suffix">Suffix [N] to verse</option>
            <option value="translation-prefix">Prefix to translation</option>
          </select>
        </label>
        <label className="ExportToolbar__option">
          <input
            checked={withWbw}
            onChange={(e) => onChange({ withWbw: e.target.checked })}
            type="checkbox"
          />
          Word by word
        </label>
        <label className="ExportToolbar__option">
          <input
            checked={onlyTranslated}
            onChange={(e) => onChange({ onlyTranslated: e.target.checked })}
            type="checkbox"
          />
          Hide songs without translation
        </label>
      </div>

      <button type="button" onClick={handleDownload}>
        Download .html
      </button>
      <button type="button" onClick={handleCopy}>
        Copy HTML
      </button>
      <button type="button" onClick={() => window.print()}>
        Print / Save PDF
      </button>
      {copied && <span className="ExportToolbar__copied">{copied}</span>}
      </>}
    </div>
  );
}

/**/
export default ExportToolbar;
