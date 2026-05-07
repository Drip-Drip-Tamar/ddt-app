import { describe, expect, it } from 'vitest';
import {
  getNewsImageBackgroundStyle,
  getNewsImageSizingClasses,
  normalizeNewsImageBackgroundColor,
  normalizeNewsImageSizingMode
} from '../../src/utils/news-image-sizing';

describe('news image sizing', () => {
  it('normalizes missing and unknown sizing modes to cover', () => {
    expect(normalizeNewsImageSizingMode(undefined)).toBe('cover');
    expect(normalizeNewsImageSizingMode(null)).toBe('cover');
    expect(normalizeNewsImageSizingMode('invalid')).toBe('cover');
  });

  it('accepts all supported sizing modes', () => {
    expect(normalizeNewsImageSizingMode('cover')).toBe('cover');
    expect(normalizeNewsImageSizingMode('container')).toBe('container');
    expect(normalizeNewsImageSizingMode('fill')).toBe('fill');
    expect(normalizeNewsImageSizingMode('stretch')).toBe('stretch');
  });

  it('accepts sizing modes with Sanity stega marker characters', () => {
    expect(normalizeNewsImageSizingMode('container\u200b\u200c\ufeff\u200d')).toBe('container');
  });

  it('normalizes background colors with placement defaults', () => {
    expect(normalizeNewsImageBackgroundColor(undefined, 'banner')).toBe('#e5e7eb');
    expect(normalizeNewsImageBackgroundColor(undefined, 'card')).toBe('#f3f4f6');
    expect(normalizeNewsImageBackgroundColor('not-a-color', 'banner')).toBe('#e5e7eb');
    expect(normalizeNewsImageBackgroundColor('#000000', 'banner')).toBe('#000000');
    expect(normalizeNewsImageBackgroundColor('#000\u200b\u200c\ufeff\u200d', 'card')).toBe('#000');
  });

  it('maps background colors to inline style strings', () => {
    expect(getNewsImageBackgroundStyle('#000000', 'banner')).toBe('background-color: #000000;');
    expect(getNewsImageBackgroundStyle(undefined, 'card')).toBe('background-color: #f3f4f6;');
  });

  it('maps article banner sizing modes to the expected frame behavior', () => {
    expect(getNewsImageSizingClasses('banner', 'cover')).toContain('h-64 md:h-[28rem] object-cover');
    expect(getNewsImageSizingClasses('banner', 'container')).toContain('h-64 md:h-[28rem] object-contain');
    expect(getNewsImageSizingClasses('banner', 'fill')).toContain('h-auto object-contain');
    expect(getNewsImageSizingClasses('banner', 'stretch')).toContain('h-64 md:h-[28rem] object-fill');
  });

  it('keeps banner background colour on the frame instead of the image', () => {
    expect(getNewsImageSizingClasses('banner', 'container')).not.toContain('bg-gray');
  });

  it('maps news card sizing modes to the expected frame behavior', () => {
    expect(getNewsImageSizingClasses('card', 'cover').image).toContain('h-48 sm:h-full object-cover');
    expect(getNewsImageSizingClasses('card', 'container').image).toContain('h-48 sm:h-full object-contain');
    expect(getNewsImageSizingClasses('card', 'fill').image).toContain('h-auto object-contain');
    expect(getNewsImageSizingClasses('card', 'stretch').image).toContain('h-48 sm:h-full object-fill');
  });
});
