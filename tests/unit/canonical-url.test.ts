import { describe, expect, it } from 'vitest';
import { canonicalUrl } from '../../src/utils/canonical-url';

describe('canonicalUrl', () => {
    it('consolidates tracking URLs and trailing slashes on the configured public site', () => {
        expect(canonicalUrl(new URL('https://preview.example/results/?utm_source=facebook#chart'), new URL('https://example.org')))
            .toBe('https://example.org/results');
        expect(canonicalUrl(new URL('https://example.org/?ref=share'))).toBe('https://example.org/');
    });
});
