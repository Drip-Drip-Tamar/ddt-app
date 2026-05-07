import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  NEWS_IMAGE_BACKGROUND_COLOR_VALIDATION_REGEX,
  NEWS_IMAGE_SIZING_OPTIONS,
  isNewsFeaturedImageControlHidden
} from '../../studio/schemaTypes/newsImageSizing';

describe('news image sizing schema helpers', () => {
  it('wires the background colour field to a native colour picker input', () => {
    const schemaSource = fs.readFileSync(
      path.resolve(process.cwd(), 'studio/schemaTypes/customImage.ts'),
      'utf8'
    );

    expect(schemaSource).toContain("import {HexColorInput} from './HexColorInput'");
    expect(schemaSource).toContain('components: {input: HexColorInput}');
  });

  it('defines the editor options for every supported mode', () => {
    expect(NEWS_IMAGE_SIZING_OPTIONS).toEqual([
      { title: 'Cover (fills the frame, may crop)', value: 'cover' },
      { title: 'Container (fits the full image inside the frame)', value: 'container' },
      { title: 'Fill (uses the image ratio, no fixed-height crop)', value: 'fill' },
      { title: 'Stretch (forces image to the frame)', value: 'stretch' }
    ]);
  });

  it('defines hex validation for featured image background colors', () => {
    expect(NEWS_IMAGE_BACKGROUND_COLOR_VALIDATION_REGEX.test('#000')).toBe(true);
    expect(NEWS_IMAGE_BACKGROUND_COLOR_VALIDATION_REGEX.test('#000000')).toBe(true);
    expect(NEWS_IMAGE_BACKGROUND_COLOR_VALIDATION_REGEX.test('black')).toBe(false);
  });

  it('shows featured image controls only for post featured images', () => {
    expect(isNewsFeaturedImageControlHidden({
      document: { _type: 'post' },
      path: ['featuredImage', 'sizingMode']
    })).toBe(false);
    expect(isNewsFeaturedImageControlHidden({
      document: { _type: 'post' },
      path: ['featuredImage', 'backgroundColor']
    })).toBe(false);
    expect(isNewsFeaturedImageControlHidden({
      document: { _type: 'post' },
      path: ['author', 'image', 'sizingMode']
    })).toBe(true);
    expect(isNewsFeaturedImageControlHidden({
      document: { _type: 'person' },
      path: ['image', 'sizingMode']
    })).toBe(true);
  });
});
