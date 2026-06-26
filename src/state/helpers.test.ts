import { describe, expect, it } from 'bun:test';
import { clamp, formatClock, formatTime, pick } from './helpers';

describe('clock formatting', () => {
  // A fixed instant: 2004-03-01T21:07 local time-independent fields are derived
  // from the Date, so assert on the shape rather than an exact zone.
  const at = (h: number, m: number): number => new Date(2004, 2, 1, h, m).getTime();

  it('formats afternoon as 12-hour PM', () => {
    expect(formatClock(at(21, 7))).toBe('9:07 PM');
  });

  it('formats midnight as 12 AM', () => {
    expect(formatClock(at(0, 5))).toBe('12:05 AM');
  });

  it('wraps timestamps in parentheses', () => {
    expect(formatTime(at(13, 0))).toBe('(1:00 PM)');
  });
});

describe('clamp', () => {
  it('bounds a value within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});

describe('pick', () => {
  it('uses the injected RNG deterministically', () => {
    expect(pick(['a', 'b', 'c'], () => 0)).toBe('a');
    expect(pick(['a', 'b', 'c'], () => 0.99)).toBe('c');
  });

  it('throws on an empty list', () => {
    expect(() => pick([], () => 0)).toThrow('empty list');
  });
});
