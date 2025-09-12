import { describe, it, expect, vi } from 'vitest';
import { 
  urlFor, 
  getImageUrl, 
  generateSrcSet, 
  isSanityImage,
  IMAGE_SIZES,
  IMAGE_WIDTHS
} from '../../src/utils/sanity-image';

// Mock the Sanity image URL builder
vi.mock('../../src/utils/sanity-client', () => ({
  client: {
    image: {
      url: vi.fn(() => ({
        image: vi.fn().mockReturnThis(),
        width: vi.fn().mockReturnThis(),
        height: vi.fn().mockReturnThis(),
        format: vi.fn().mockReturnThis(),
        quality: vi.fn().mockReturnThis(),
        auto: vi.fn().mockReturnThis(),
        url: vi.fn(() => 'https://cdn.sanity.io/images/test-project/test-dataset/test-image.jpg')
      }))
    }
  }
}));

describe('sanity-image utilities', () => {
  describe('isSanityImage', () => {
    it('should return true for valid Sanity image objects', () => {
      const validImage = {
        _type: 'image',
        asset: {
          _ref: 'image-123-1024x768-jpg',
          _type: 'reference'
        }
      };
      expect(isSanityImage(validImage)).toBe(true);
    });

    it('should return false for objects without _type image', () => {
      const invalidImage = {
        _type: 'customImage',
        asset: {
          _ref: 'image-123-1024x768-jpg',
          _type: 'reference'
        }
      };
      expect(isSanityImage(invalidImage)).toBe(false);
    });

    it('should return false for objects without asset', () => {
      const invalidImage = {
        _type: 'image'
      };
      expect(isSanityImage(invalidImage)).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(isSanityImage(null)).toBe(false);
      expect(isSanityImage(undefined)).toBe(false);
      expect(isSanityImage('string')).toBe(false);
      expect(isSanityImage(123)).toBe(false);
      expect(isSanityImage([])).toBe(false);
    });
  });

  describe('getImageUrl', () => {
    const mockSource = {
      _type: 'image',
      asset: {
        _ref: 'image-123-1024x768-jpg',
        _type: 'reference'
      }
    };

    it('should generate URL with default quality', () => {
      const url = getImageUrl(mockSource, 800);
      expect(url).toBe('https://cdn.sanity.io/images/test-project/test-dataset/test-image.jpg');
    });

    it('should generate URL with custom options', () => {
      const url = getImageUrl(mockSource, 800, {
        quality: 90,
        format: 'webp'
      });
      expect(url).toBe('https://cdn.sanity.io/images/test-project/test-dataset/test-image.jpg');
    });

    it('should handle missing width by using default', () => {
      const url = getImageUrl(mockSource, undefined);
      expect(url).toBeDefined();
    });
  });

  describe('generateSrcSet', () => {
    const mockSource = {
      _type: 'image',
      asset: {
        _ref: 'image-123-1024x768-jpg',
        _type: 'reference'
      }
    };

    it('should generate srcset with default widths', () => {
      const srcset = generateSrcSet(mockSource);
      expect(srcset).toContain('640w');
      expect(srcset).toContain('750w');
      expect(srcset).toContain('828w');
      expect(srcset).toContain('1080w');
      expect(srcset).toContain('1200w');
      expect(srcset).toContain('1920w');
      expect(srcset).toContain('2048w');
      expect(srcset).toContain('3840w');
    });

    it('should generate srcset with custom widths', () => {
      const customWidths = [400, 800, 1200];
      const srcset = generateSrcSet(mockSource, customWidths);
      expect(srcset).toContain('400w');
      expect(srcset).toContain('800w');
      expect(srcset).toContain('1200w');
    });

    it('should apply custom options to all URLs', () => {
      const srcset = generateSrcSet(mockSource, undefined, { format: 'webp' });
      expect(srcset).toBeDefined();
      expect(srcset.split(',').length).toBe(IMAGE_WIDTHS.default.length);
    });
  });

  describe('IMAGE_SIZES constant', () => {
    it('should have all required size configurations', () => {
      expect(IMAGE_SIZES).toHaveProperty('card');
      expect(IMAGE_SIZES).toHaveProperty('hero');
      expect(IMAGE_SIZES).toHaveProperty('logo');
      expect(IMAGE_SIZES).toHaveProperty('avatar');
      expect(IMAGE_SIZES).toHaveProperty('testimonial');
    });

    it('should have valid dimensions for each size', () => {
      Object.values(IMAGE_SIZES).forEach(size => {
        expect(size).toHaveProperty('width');
        expect(size).toHaveProperty('height');
        expect(typeof size.width).toBe('number');
        expect(typeof size.height).toBe('number');
        expect(size.width).toBeGreaterThan(0);
        expect(size.height).toBeGreaterThan(0);
      });
    });
  });

  describe('IMAGE_WIDTHS constant', () => {
    it('should have default and card width arrays', () => {
      expect(IMAGE_WIDTHS).toHaveProperty('default');
      expect(IMAGE_WIDTHS).toHaveProperty('card');
      expect(Array.isArray(IMAGE_WIDTHS.default)).toBe(true);
      expect(Array.isArray(IMAGE_WIDTHS.card)).toBe(true);
    });

    it('should have sorted width values', () => {
      const defaultSorted = [...IMAGE_WIDTHS.default].sort((a, b) => a - b);
      const cardSorted = [...IMAGE_WIDTHS.card].sort((a, b) => a - b);
      
      expect(IMAGE_WIDTHS.default).toEqual(defaultSorted);
      expect(IMAGE_WIDTHS.card).toEqual(cardSorted);
    });
  });
});