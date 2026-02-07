import { describe, it, expect } from 'vitest';
import { normalizeColumns } from '../../src/utils/columns';

describe('normalizeColumns', () => {
  it('normalizes named values', () => {
    expect(normalizeColumns('one')).toBe('one');
    expect(normalizeColumns('two')).toBe('two');
    expect(normalizeColumns('three')).toBe('three');
    expect(normalizeColumns('four')).toBe('four');
  });

  it('normalizes numeric values', () => {
    expect(normalizeColumns('1')).toBe('one');
    expect(normalizeColumns(2)).toBe('two');
    expect(normalizeColumns('3')).toBe('three');
    expect(normalizeColumns(4)).toBe('four');
  });

  it('strips zero-width and bidi control characters', () => {
    const polluted = 'two\u200B\u200C\u200D\u200E\u200F\u2060\u2066\u202A\u202E';
    expect(normalizeColumns(polluted)).toBe('two');
  });

  it('returns undefined for unknown values', () => {
    expect(normalizeColumns('five')).toBeUndefined();
    expect(normalizeColumns(null)).toBeUndefined();
    expect(normalizeColumns(undefined)).toBeUndefined();
  });
});
