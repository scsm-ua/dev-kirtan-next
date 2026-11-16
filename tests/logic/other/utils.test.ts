import { describe, expect, it } from 'vitest';

import {
  groupLines,
  isMobile,
  isObject,
  processTranslationLines,
  renderImageTag
} from '@/other/utils';

describe('isObject', () => {
  it.each([
    [{}, true],
    [{ a: 1 }, true],
    [[], false],
    [null, false],
    [undefined, false],
    ['text', false],
    [1, false]
  ])('%o → %s', (value, expected) => {
    expect(isObject(value)).toBe(expected);
  });
});

describe('groupLines', () => {
  it('splits on empty lines', () => {
    expect(groupLines(['a', 'b', '', 'c'])).toEqual([['a', 'b'], ['c']]);
  });

  it('ignores leading, trailing and repeated empty lines', () => {
    expect(groupLines(['', 'a', '', '', 'b', ''])).toEqual([['a'], ['b']]);
  });

  it('returns no groups for empty or missing input', () => {
    expect(groupLines([])).toEqual([]);
    expect(groupLines(undefined)).toEqual([]);
  });
});

describe('renderImageTag', () => {
  it('renders a lazy image', () => {
    expect(renderImageTag('Alt', '/a.png')).toBe(
      '<img src="/a.png" alt="Alt" loading="lazy" decoding="async" fetchpriority="low">'
    );
  });

  it('adds the class and the size', () => {
    expect(renderImageTag('Alt', '/a.png', { className: 'c', width: 10, height: 20 })).toBe(
      '<img class="c" src="/a.png" alt="Alt" width="10" height="20" loading="lazy" decoding="async" fetchpriority="low">'
    );
  });

  it('adds the size only when both dimensions are known', () => {
    expect(renderImageTag('Alt', '/a.png', { width: 10 })).not.toContain('width=');
  });

  it('escapes the alt text', () => {
    expect(renderImageTag('a & "b"', '/a.png')).toContain('alt="a &amp; &quot;b&quot;"');
  });
});

describe('processTranslationLines', () => {
  const run = (...lines: string[]) => processTranslationLines(lines, 'P');

  it('returns no lines for missing input', () => {
    expect(processTranslationLines(undefined, 'P')).toEqual([]);
  });

  it('keeps plain lines as they are', () => {
    expect(run('one', 'two')).toEqual(['one', 'two']);
  });

  it('removes HTML tags', () => {
    expect(run('a <b>b</b> c')).toEqual(['a b c']);
  });

  it.each([
    ['***x***', '<i class="P__bold-italic">x</i>'],
    ['**x**', '<i class="P__bold">x</i>'],
    ['*x*', '<i>x</i>'],
    ['a **b** and *c*', 'a <i class="P__bold">b</i> and <i>c</i>']
  ])('converts markdown emphasis: %s', (line, expected) => {
    expect(run(line)).toEqual([expected]);
  });

  it('keeps escaped asterisks as literal asterisks', () => {
    expect(run('a \\*b\\* c')).toEqual(['a *b* c']);
  });

  it('converts a sized image', () => {
    expect(run('![Alt](/a.png =10x20)')).toEqual([
      renderImageTag('Alt', '/a.png', { className: 'P__image', width: '10', height: '20' })
    ]);
  });

  it('converts a link', () => {
    expect(run('[text](https://example.com/)')).toEqual([
      '<a href="https://example.com/" target="_blank">text</a>'
    ]);
  });

  it('joins a line that ends with a backslash to the next one', () => {
    expect(run('a\\', 'b')).toEqual(['a<br />b']);
  });
});

describe('isMobile', () => {
  it('is false on the server', () => {
    expect(isMobile()).toBe(false);
  });
});
