import type { EventFormFields } from '../types/events.types';

import { draftFromFields, emptyFormFields, hasErrors, validateEventDraft } from './eventDraft';

function fields(overrides: Partial<EventFormFields> = {}): EventFormFields {
  return {
    ...emptyFormFields('2026-11-27'),
    title: 'Sinh nhật mẹ',
    recipientIds: ['1'],
    primaryRecipientId: '1',
    day: '15',
    month: '6',
    ...overrides,
  };
}

describe('validateEventDraft', () => {
  it('accepts a complete form', () => {
    expect(hasErrors(validateEventDraft(draftFromFields(fields())))).toBe(false);
  });

  it('requires a title and a recipient with a primary one', () => {
    const errors = validateEventDraft(
      draftFromFields(fields({ title: '  ', recipientIds: [], primaryRecipientId: '' })),
    );
    expect(errors.title).toBeDefined();
    expect(errors.recipients).toBeDefined();
    expect(
      validateEventDraft(
        draftFromFields(fields({ recipientIds: ['1', '2'], primaryRecipientId: '3' })),
      ).recipients,
    ).toBeDefined();
  });

  it('rejects impossible solar and lunar dates', () => {
    expect(
      validateEventDraft(draftFromFields(fields({ day: '31', month: '4' }))).date,
    ).toBeDefined();
    expect(validateEventDraft(draftFromFields(fields({ day: 'ab' }))).date).toBeDefined();
    expect(
      validateEventDraft(draftFromFields(fields({ calendarType: 'LUNAR', day: '31' }))).date,
    ).toBeDefined();
    expect(
      validateEventDraft(draftFromFields(fields({ calendarType: 'LUNAR', day: '30' }))).date,
    ).toBeUndefined();
  });

  it('allows Feb 29 only when the year is unknown or leap', () => {
    const feb29 = fields({ day: '29', month: '2' });
    expect(validateEventDraft(draftFromFields({ ...feb29, year: '' })).date).toBeUndefined();
    expect(validateEventDraft(draftFromFields({ ...feb29, year: '2025' })).date).toBeDefined();
  });

  it('needs a year for one-off events and parses the budget', () => {
    const once = validateEventDraft(draftFromFields(fields({ isRecurring: false, year: '' })));
    expect(once.year).toBeDefined();
    expect(draftFromFields(fields({ budget: '1.500.000' })).defaultBudget).toBe(1500000);
    expect(validateEventDraft(draftFromFields(fields({ budget: '0' }))).budget).toBeDefined();
  });
});
