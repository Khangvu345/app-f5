import type { GiftStatus } from '../types/gifts.types';

import {
  canTransition,
  GIFT_STATUS_TRANSITIONS,
  getNextStatuses,
  getTransitionPath,
  tabOfStatus,
} from './giftStatus';

describe('gift status transitions', () => {
  it('allows only the steps accepted by the gifts_check_status trigger', () => {
    expect(getNextStatuses('IDEA')).toEqual(['CONSIDERING', 'SELECTED', 'CANCELLED']);
    expect(getNextStatuses('SELECTED')).toEqual(['CONSIDERING', 'PURCHASED', 'CANCELLED']);
    expect(getNextStatuses('PURCHASED')).toEqual(['GIVEN', 'RETURNED', 'CANCELLED']);
    expect(getNextStatuses('GIVEN')).toEqual(['RETURNED']);
  });

  it('has no way out of the final states', () => {
    expect(getNextStatuses('RETURNED')).toEqual([]);
    expect(getNextStatuses('CANCELLED')).toEqual([]);
  });

  it('rejects skipping straight to PURCHASED or GIVEN', () => {
    expect(canTransition('IDEA', 'PURCHASED')).toBe(false);
    expect(canTransition('SELECTED', 'GIVEN')).toBe(false);
    expect(canTransition('PURCHASED', 'GIVEN')).toBe(true);
  });

  it('never lists a status as its own next step', () => {
    const statuses = Object.keys(GIFT_STATUS_TRANSITIONS) as GiftStatus[];
    for (const status of statuses) {
      expect(canTransition(status, status)).toBe(false);
    }
  });

  it('finds the shortest valid path to GIVEN', () => {
    expect(getTransitionPath('IDEA', 'GIVEN')).toEqual(['SELECTED', 'PURCHASED', 'GIVEN']);
    expect(getTransitionPath('CONSIDERING', 'PURCHASED')).toEqual(['SELECTED', 'PURCHASED']);
    expect(getTransitionPath('PURCHASED', 'GIVEN')).toEqual(['GIVEN']);
  });

  it('returns an empty path for the same status and null when unreachable', () => {
    expect(getTransitionPath('SELECTED', 'SELECTED')).toEqual([]);
    expect(getTransitionPath('CANCELLED', 'GIVEN')).toBeNull();
    expect(getTransitionPath('GIVEN', 'PURCHASED')).toBeNull();
  });

  it('maps statuses to collection tabs', () => {
    expect(tabOfStatus('CONSIDERING')).toBe('IDEA');
    expect(tabOfStatus('RETURNED')).toBe('GIVEN');
    expect(tabOfStatus('CANCELLED')).toBeNull();
  });
});
