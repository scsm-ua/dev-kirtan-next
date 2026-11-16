import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it } from 'vitest';

import ExportView from '@/components/export/ExportView';
import { buildExportHtml } from '@/lib/export';
import {
  DEFAULT_EXPORT_OPTIONS,
  exportOptionsFromSearch,
  exportOptionsToSearch,
  filterExportBody
} from '@/other/exportDoc';
import { openPath } from '@/tests/helpers/app';
import { getBookIds, getItems } from '@/tests/helpers/books';

import type { TExportOptions } from '@/other/exportDoc';

// The smallest real book: the preview re-parses the whole document on every change.
const bookId = getBookIds().sort((a, b) => getItems(a).length - getItems(b).length)[0];
const fileName = `Songbook-Export-${bookId}`;
const exportPath = `/${bookId}/export/`;
let doc: Awaited<ReturnType<typeof buildExportHtml>>;

beforeAll(async () => {
  doc = await buildExportHtml(bookId);
});

function renderView(search = '') {
  openPath(exportPath + search);
  return render(<ExportView body={doc.body} fileName={fileName} lang={doc.lang} title={doc.title} />);
}

const preview = () => document.querySelector('.ExportPage').innerHTML;
const previewFor = (options: TExportOptions) => {
  const div = document.createElement('div');
  div.innerHTML = filterExportBody(doc.body, options);
  return div.innerHTML;
};

describe('ExportView', () => {
  it('previews the document with the default options', () => {
    renderView();

    expect(preview()).toBe(previewFor(DEFAULT_EXPORT_OPTIONS));
    expect(window.location.search).toBe('');
  });

  it('names the tab after the export file, so Save as PDF uses it', () => {
    renderView();

    expect(document.title.startsWith(fileName)).toBe(true);
  });

  it('restores the options from the address and shows them in the toolbar', () => {
    const options = { ...DEFAULT_EXPORT_OPTIONS, withToc: false, withFirstLines: false, verseIndent: 12 };
    renderView(`?${exportOptionsToSearch(options)}`);

    expect(preview()).toBe(previewFor(options));
    expect((screen.getByRole('checkbox', { name: 'First-line index' }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('checkbox', { name: 'Table of contents' }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole('spinbutton') as HTMLInputElement).value).toBe('12');
  });

  it('updates the preview and the address when an option changes, without a history entry', async () => {
    renderView();
    const historyLength = window.history.length;

    await userEvent.click(screen.getByRole('checkbox', { name: 'Table of contents' }));

    const options = { ...DEFAULT_EXPORT_OPTIONS, withToc: false };
    expect(preview()).toBe(previewFor(options));
    expect(preview()).not.toBe(previewFor(DEFAULT_EXPORT_OPTIONS));
    expect(exportOptionsFromSearch(window.location.search)).toEqual(options);
    expect(window.location.pathname).toBe(exportPath);
    expect(window.history.length).toBe(historyLength);
  });

  it('downloads and copies exactly what the preview shows', async () => {
    renderView();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Translation' }));
    let copied = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => (copied = text) }
    });

    await userEvent.click(screen.getByRole('button', { name: 'Copy HTML' }));
    delete (navigator as { clipboard?: unknown }).clipboard;

    const exported = new DOMParser().parseFromString(copied, 'text/html');
    expect(exported.documentElement.lang).toBe(doc.lang);
    expect(exported.title).toBe(doc.title);
    expect(exported.body.innerHTML.trim()).toBe(previewFor({ ...DEFAULT_EXPORT_OPTIONS, withTranslation: false }).trim());
  });
});
