import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { matchesDateRange } from '../datePeriod';

describe('matchesDateRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for "all" even when timestamp is empty or invalid', () => {
    expect(matchesDateRange('', 'all')).toBe(true);
    expect(matchesDateRange('invalid', 'all')).toBe(true);
  });

  it('returns false for empty or invalid timestamps on non-"all" periods', () => {
    expect(matchesDateRange('', 'this-year')).toBe(false);
    expect(matchesDateRange('not-a-date', 'this-year')).toBe(false);
  });

  it('evaluates predefined periods correctly', () => {
    expect(matchesDateRange('2026-06-10T10:00:00.000Z', 'this-month')).toBe(true);
    expect(matchesDateRange('2026-05-10T10:00:00.000Z', 'this-month')).toBe(false);
    expect(matchesDateRange('2026-01-10T10:00:00.000Z', 'this-year')).toBe(true);
    expect(matchesDateRange('2025-12-31T23:59:59.000Z', 'this-year')).toBe(false);
    expect(matchesDateRange('2026-05-20T10:00:00.000Z', 'last-30')).toBe(true);
    expect(matchesDateRange('2026-04-01T10:00:00.000Z', 'last-30')).toBe(false);
    expect(matchesDateRange('2026-04-01T10:00:00.000Z', 'last-90')).toBe(true);
  });

  it('evaluates custom start and end date bounds inclusively', () => {
    expect(matchesDateRange('2026-06-10T12:00:00.000Z', 'custom', '2026-06-10', '2026-06-10')).toBe(true);
    expect(matchesDateRange('2026-06-09T12:00:00.000Z', 'custom', '2026-06-10', '2026-06-10')).toBe(false);
    expect(matchesDateRange('2026-06-10T12:00:00.000Z', 'custom', '2026-06-10', '')).toBe(true);
    expect(matchesDateRange('2026-06-10T12:00:00.000Z', 'custom', '', '2026-06-10')).toBe(true);
  });
});
