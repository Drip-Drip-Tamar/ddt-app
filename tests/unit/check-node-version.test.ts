import { describe, expect, it } from 'vitest';

import {
  checkNodeVersion,
  formatNodeMismatch,
  normalizeNodeVersion
} from '../../scripts/check-node-version.mjs';

describe('Node version guard', () => {
  it('normalizes plain and nvm-style Node versions', () => {
    expect(normalizeNodeVersion('22.18.0')).toBe('22.18.0');
    expect(normalizeNodeVersion('v22.18.0')).toBe('22.18.0');
    expect(normalizeNodeVersion('  v22.18.0\n')).toBe('22.18.0');
  });

  it('accepts the exact version declared in .nvmrc', () => {
    expect(
      checkNodeVersion({
        actualVersion: '22.18.0',
        expectedVersion: 'v22.18.0'
      })
    ).toEqual({
      actualVersion: '22.18.0',
      expectedVersion: '22.18.0',
      matches: true
    });
  });

  it('rejects unsupported or drifted Node versions', () => {
    const result = checkNodeVersion({
      actualVersion: '20.20.2',
      expectedVersion: '22.18.0'
    });

    expect(result).toEqual({
      actualVersion: '20.20.2',
      expectedVersion: '22.18.0',
      matches: false
    });
    expect(formatNodeMismatch(result)).toContain('Expected Node.js 22.18.0 from .nvmrc');
    expect(formatNodeMismatch(result)).toContain('current Node.js is 20.20.2');
    expect(formatNodeMismatch(result)).toContain('nvm install && nvm use');
  });
});
