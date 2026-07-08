import { describe, it, expect } from 'vitest';
import { formatShortDateTime, formatDayHour, formatDurationMinutes, escapeHtml } from '../../../src/scripts/charts/format';

describe('format.ts', () => {
  describe('formatShortDateTime', () => {
    it('formats a date in en-GB short form with day/month/hour/minute', () => {
      const result = formatShortDateTime('2026-07-05T14:30:00Z');
      expect(result).toMatch(/5 Jul/);
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    it('accepts a number (epoch ms) and a Date instance', () => {
      const date = new Date('2026-01-01T00:00:00Z');
      expect(formatShortDateTime(date.getTime())).toBe(formatShortDateTime(date));
    });
  });

  describe('formatDayHour', () => {
    it('formats a date with day/month/hour precision (no minutes)', () => {
      const result = formatDayHour('2026-07-05T14:30:00Z');
      expect(result).toMatch(/5 Jul/);
      expect(result).not.toMatch(/:\d{2}:\d{2}/);
    });
  });

  describe('escapeHtml', () => {
    it('escapes ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('escapes angle brackets to prevent tag injection', () => {
      expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('escapes double and single quotes', () => {
      expect(escapeHtml(`"quoted" 'value'`)).toBe('&quot;quoted&quot; &#39;value&#39;');
    });

    it('escapes a full XSS payload safely', () => {
      const payload = `<img src=x onerror="alert('xss')">`;
      const escaped = escapeHtml(payload);
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
      expect(escaped).toBe('&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;');
    });

    it('returns an empty string unchanged', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('leaves plain text without special characters unchanged', () => {
      expect(escapeHtml('Calstock')).toBe('Calstock');
    });
  });

  describe('formatDurationMinutes', () => {
    it('formats minutes under an hour as "Xm"', () => {
      expect(formatDurationMinutes(45)).toBe('45m');
    });

    it('formats exact hours with 0 remaining minutes as "Xh 0m"', () => {
      expect(formatDurationMinutes(120)).toBe('2h 0m');
    });

    it('formats hours plus remaining minutes as "Xh Ym"', () => {
      expect(formatDurationMinutes(205)).toBe('3h 25m');
    });

    it('formats 0 minutes as "0m"', () => {
      expect(formatDurationMinutes(0)).toBe('0m');
    });

    it('formats 1 minute as "1m"', () => {
      expect(formatDurationMinutes(1)).toBe('1m');
    });
  });
});
