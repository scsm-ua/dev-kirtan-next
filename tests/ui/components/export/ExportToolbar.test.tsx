import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ExportToolbar from '@/components/export/ExportToolbar';
import { DEFAULT_EXPORT_OPTIONS } from '@/other/exportDoc';

import type { TExportOptions } from '@/other/exportDoc';

const HTML = '<!DOCTYPE html><html><body><h1>Songbook</h1></body></html>';
let onChange: ReturnType<typeof vi.fn<(patch: Partial<TExportOptions>) => void>>;

function renderToolbar(options: Partial<TExportOptions> = {}) {
  onChange = vi.fn();
  return render(
    <ExportToolbar
      fileName="Songbook-Export-xx"
      getHtml={() => HTML}
      onChange={onChange}
      options={{ ...DEFAULT_EXPORT_OPTIONS, ...options }}
    />
  );
}

const checkbox = (name: string) => screen.getByRole('checkbox', { name }) as HTMLInputElement;

function stubClipboard(clipboard: Partial<Clipboard>) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
}

afterEach(() => {
  delete (navigator as { clipboard?: unknown }).clipboard;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ExportToolbar: options', () => {
  it.each([
    ['Table of contents', 'withToc'],
    ['First-line index', 'withFirstLines'],
    ['Include non song pages', 'withPages'],
    ['Page numbers in TOC', 'withPageNumbers'],
    ['Enable links', 'withLinks'],
    ['Add navigation to top', 'withNavLinks'],
    ['Word by word', 'withWbw'],
    ['Translation', 'withTranslation'],
    ['Hide songs without translation', 'onlyTranslated']
  ] as const)('"%s" shows and switches %s', async (name, key) => {
    renderToolbar();

    expect(checkbox(name).checked).toBe(DEFAULT_EXPORT_OPTIONS[key]);
    await userEvent.click(checkbox(name));
    expect(onChange).toHaveBeenCalledWith({ [key]: !DEFAULT_EXPORT_OPTIONS[key] });
  });

  it('turns off "Add navigation to top" while links are off', () => {
    renderToolbar({ withLinks: false, withNavLinks: true });

    expect(checkbox('Add navigation to top').disabled).toBe(true);
    expect(checkbox('Add navigation to top').checked).toBe(false);
  });

  it('sets the verse indent from the slider and the number field, never below 0', () => {
    renderToolbar();
    const slider = screen.getByRole('slider');
    const number = screen.getByRole('spinbutton');

    act(() => {
      slider.focus();
    });
    // Range and number inputs ignore typing in user-event; set the value as the browser does.
    for (const [input, value, expected] of [
      [slider, '70', 70],
      [number, '25', 25],
      [number, '-5', 0],
      [number, '', 0]
    ] as const) {
      onChange.mockClear();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      act(() => {
        setter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      expect(onChange).toHaveBeenLastCalledWith({ verseIndent: expected });
    }
  });

  it('sets the verse number mode', async () => {
    renderToolbar();
    await userEvent.selectOptions(screen.getByRole('combobox'), 'heading');

    expect(onChange).toHaveBeenCalledWith({ verseNumberMode: 'heading' });
  });

  it('collapses to one button and expands back', async () => {
    renderToolbar();
    await userEvent.click(screen.getByTitle('Collapse toolbar'));

    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('checkbox')).toBeNull();

    await userEvent.click(screen.getByTitle('Expand toolbar'));
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
  });
});

describe('ExportToolbar: actions', () => {
  it('downloads the document as a dated .html file', async () => {
    const blobs: Blob[] = [];
    vi.stubGlobal('URL', Object.assign(URL, {
      createObjectURL: vi.fn((blob: Blob) => (blobs.push(blob), 'blob:export')),
      revokeObjectURL: vi.fn()
    }));
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked.push(this);
    });
    renderToolbar();

    await userEvent.click(screen.getByRole('button', { name: 'Download .html' }));

    expect(clicked).toHaveLength(1);
    expect(clicked[0].href).toBe('blob:export');
    expect(clicked[0].download).toMatch(/^Songbook-Export-xx-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.html$/);
    expect(blobs[0].type).toBe('text/html');
    expect(await blobs[0].text()).toBe(HTML);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:export');
  });

  describe('copy', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('copies rich text (HTML and plain flavours) and says so for 2 s', async () => {
      const items: Record<string, Blob>[] = [];
      vi.stubGlobal('ClipboardItem', class {
        constructor(data: Record<string, Blob>) {
          items.push(data);
        }
      });
      const write = vi.fn(async () => {});
      stubClipboard({ write });
      renderToolbar();

      await userEvent.click(screen.getByRole('button', { name: 'Copy HTML' }));

      expect(write).toHaveBeenCalledTimes(1);
      expect(Object.keys(items[0]).sort()).toEqual(['text/html', 'text/plain']);
      expect(await items[0]['text/html'].text()).toBe(HTML);
      expect(screen.getByText('Copied as rich text')).toBeTruthy();

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.queryByText('Copied as rich text')).toBeNull();
    });

    it('falls back to plain text when rich text is not allowed', async () => {
      const writeText = vi.fn(async () => {});
      stubClipboard({ write: vi.fn(async () => Promise.reject(new Error('denied'))), writeText });
      renderToolbar();

      await userEvent.click(screen.getByRole('button', { name: 'Copy HTML' }));

      expect(writeText).toHaveBeenCalledWith(HTML);
      expect(screen.getByText('Copied as text')).toBeTruthy();
    });
  });

  it('opens the print dialog', async () => {
    const print = vi.fn();
    vi.stubGlobal('print', print);
    renderToolbar();

    await userEvent.click(screen.getByRole('button', { name: 'Print / Save PDF' }));

    expect(print).toHaveBeenCalledTimes(1);
  });
});
