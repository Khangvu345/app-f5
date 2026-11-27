import type { RecipientListItem } from '../types/recipients.types';

import { filterRecipients } from './recipients.store';

jest.mock('../api/recipients.api', () => ({ listRecipientItems: jest.fn() }));

const item = (
  name: string,
  relationship: RecipientListItem['relationship'],
): RecipientListItem => ({
  id: name,
  name,
  relationship,
  nextOccasion: null,
});
const ITEMS = [item('Mẹ', 'FAMILY'), item('Hà Vy', 'FRIEND'), item('Anh Tuấn', 'COLLEAGUE')];

describe('filterRecipients', () => {
  it('filters by name ignoring case', () => {
    expect(filterRecipients(ITEMS, ' hà ', null).map((i) => i.id)).toEqual(['Hà Vy']);
  });

  it('filters by relationship', () => {
    expect(filterRecipients(ITEMS, '', 'FAMILY').map((i) => i.id)).toEqual(['Mẹ']);
  });

  it('returns everything without filters', () => {
    expect(filterRecipients(ITEMS, '', null)).toHaveLength(3);
  });
});
