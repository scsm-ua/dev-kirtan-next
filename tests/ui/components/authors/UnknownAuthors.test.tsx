import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import UnknownAuthors, { SHOW_UNKNOWN_AUTHORS_KEY } from '@/components/authors/UnknownAuthors';

function renderUnknown() {
  return render(
    <UnknownAuthors>
      <p>unknown authors</p>
    </UnknownAuthors>
  );
}

const toggle = () =>
  act(() => {
    window.dispatchEvent(new CustomEvent('kirtan:toggleUnknownAuthors'));
  });

describe('UnknownAuthors', () => {
  it('is hidden by default', () => {
    expect(renderUnknown().queryByText('unknown authors')).toBeNull();
  });

  it('toggles on every kirtan:toggleUnknownAuthors event', () => {
    const { queryByText } = renderUnknown();

    toggle();
    expect(queryByText('unknown authors')).not.toBeNull();

    toggle();
    expect(queryByText('unknown authors')).toBeNull();
  });

  it('opens shown once when the hotkey was pressed on another page', () => {
    sessionStorage.setItem(SHOW_UNKNOWN_AUTHORS_KEY, '1');
    const first = renderUnknown();

    expect(first.queryByText('unknown authors')).not.toBeNull();
    expect(sessionStorage.getItem(SHOW_UNKNOWN_AUTHORS_KEY)).toBeNull();

    first.unmount();
    expect(renderUnknown().queryByText('unknown authors')).toBeNull();
  });
});
