import { describe, expect, it } from 'vitest';

import { sortSingers } from '@/other/sortSingers';

const ids = (singers: Array<{ personSlug?: string; id?: string }>) =>
  sortSingers(singers).map((s) => s.personSlug || s.id);

describe('sortSingers', () => {
  it('puts the priority singers first, in the fixed order', () => {
    const singers = [
      { personSlug: 'zeta', title: 'Zeta' },
      { personSlug: 'manasa-krishna', title: 'Manasa' },
      { personSlug: 'some-maharaj', title: 'Maharaj' },
      { personSlug: 'kamal-krishna', title: 'Kamal' },
      { personSlug: 'nabadwip-temple', title: 'Nabadwip' },
      { personSlug: 'some-dev-goswami-maharaj', title: 'Dev-Goswami' }
    ];

    expect(ids(singers)).toEqual([
      'some-dev-goswami-maharaj',
      'nabadwip-temple',
      'some-maharaj',
      'kamal-krishna',
      'manasa-krishna',
      'zeta'
    ]);
  });

  it('sorts singers of the same priority by name', () => {
    const singers = [
      { personSlug: 'c', title: 'Charlie' },
      { personSlug: 'a', title: 'Alpha' },
      { personSlug: 'b', title: 'Bravo' }
    ];

    expect(ids(singers)).toEqual(['a', 'b', 'c']);
  });

  it('reads the name from `name`, a plain `title` or an i18n `title`', () => {
    const singers = [
      { id: 'c', title: { en: 'Charlie', ru: 'Альфа' } },
      { id: 'b', name: 'Bravo', title: 'Zulu' },
      { id: 'a', title: 'Alpha' }
    ];

    expect(ids(singers)).toEqual(['a', 'b', 'c']);
  });

  it('matches the priority term in any letter case', () => {
    const singers = [
      { personSlug: 'alpha', title: 'Alpha' },
      { personSlug: 'Nabadwip-Temple', title: 'Nabadwip' }
    ];

    expect(ids(singers)).toEqual(['Nabadwip-Temple', 'alpha']);
  });

  it('does not change the input array', () => {
    const singers = [
      { personSlug: 'b', title: 'Bravo' },
      { personSlug: 'a', title: 'Alpha' }
    ];
    const copy = [...singers];

    sortSingers(singers);

    expect(singers).toEqual(copy);
  });
});
