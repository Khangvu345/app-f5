import { planPreferenceSync, type ExistingPreference } from './preferenceSync';

const row = (id: string, value: string, polarity: string, isLive = true): ExistingPreference => ({
  id,
  value,
  polarity,
  isLive,
});

describe('planPreferenceSync', () => {
  it('removes live rows that are no longer wanted', () => {
    const plan = planPreferenceSync([row('1', 'A', 'LIKE')], [], []);
    expect(plan.remove).toEqual(['1']);
  });

  it('revives a previously removed value instead of inserting', () => {
    const plan = planPreferenceSync([row('1', 'A', 'LIKE', false)], ['a'], []);
    expect(plan.revive).toEqual(['1']);
    expect(plan.insert).toEqual([]);
  });

  it('inserts new values and leaves unchanged ones', () => {
    const plan = planPreferenceSync([row('1', 'A', 'LIKE')], ['A', 'B'], ['C']);
    expect(plan.insert).toEqual([
      { value: 'B', polarity: 'LIKE' },
      { value: 'C', polarity: 'AVOID' },
    ]);
    expect(plan.remove).toEqual([]);
  });

  it('ignores DISLIKE rows', () => {
    const plan = planPreferenceSync([row('1', 'X', 'DISLIKE')], [], []);
    expect(plan.remove).toEqual([]);
  });
});
