import { describe, it, expect } from 'vitest';
import { IMAGE, SECTIONS } from '../../src/data/blocks';

describe('GROQ block fragments', () => {
  it('defines core image fields', () => {
    expect(IMAGE).toContain('"asset"');
    expect(IMAGE).toContain('"dimensions"');
    expect(IMAGE).toContain('"alt"');
    expect(IMAGE).toContain('"hotspot"');
    expect(IMAGE).toContain('"crop"');
  });

  it('includes section-specific projections', () => {
    expect(SECTIONS).toContain('cardsSection');
    expect(SECTIONS).toContain('logosSection');
    expect(SECTIONS).toContain('testimonialsSection');
  });
});
