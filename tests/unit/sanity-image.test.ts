import { describe, it, expect, vi, beforeAll } from 'vitest';
import { 
  getImageUrl, 
  generateSrcSet, 
  isSanityImage,
  defaultSizes
} from '../../src/utils/sanity-image';

// Mock environment variables
beforeAll(() => {
  vi.stubEnv('SANITY_PROJECT_ID', 'test-project-id');
  vi.stubEnv('SANITY_DATASET', 'test-dataset');
});

// Mock the Sanity image URL builder module
vi.mock('@sanity/image-url', () => {
  const createMockBuilder = () => {
    let params = new URLSearchParams();
    
    const mockBuilder = {
      image: vi.fn().mockReturnThis(),
      width: vi.fn((w) => {
        params.set('w', w.toString());
        return mockBuilder;
      }),
      height: vi.fn((h) => {
        params.set('h', h.toString());
        return mockBuilder;
      }),
      format: vi.fn((f) => {
        params.set('fm', f);
        return mockBuilder;
      }),
      quality: vi.fn((q) => {
        params.set('q', q.toString());
        return mockBuilder;
      }),
      auto: vi.fn((mode) => {
        params.set('auto', mode);
        return mockBuilder;
      }),
      url: vi.fn(() => {
        const baseUrl = 'https://cdn.sanity.io/images/test-project-id/test-dataset/123-1024x768.jpg';
        const queryString = params.toString();
        return queryString ? `${baseUrl}?${queryString}` : baseUrl;
      })
    };
    
    return mockBuilder;
  };
  
  return {
    default: vi.fn(() => ({
      image: vi.fn(() => createMockBuilder())
    }))
  };
});

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

    it('should return true for objects with reference type', () => {
      const imageWithReference = {
        _type: 'reference',
        _ref: 'image-123-1024x768-jpg'
      };
      expect(isSanityImage(imageWithReference)).toBe(true);
    });

    it('should return true for objects with _type image even without asset', () => {
      const imageWithoutAsset = {
        _type: 'image'
      };
      expect(isSanityImage(imageWithoutAsset)).toBe(true);
    });

    it('should return false for non-objects', () => {
      expect(isSanityImage(null)).toBe(false);
      expect(isSanityImage(undefined)).toBe(false);
      expect(isSanityImage('not-an-image')).toBe(false);
      expect(isSanityImage(123)).toBe(false);
      expect(isSanityImage([])).toBe(false);
    });

    it('should return true for string containing image-', () => {
      expect(isSanityImage('image-123-1024x768-jpg')).toBe(true);
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
      expect(url).toContain('https://cdn.sanity.io/images/test-project-id/test-dataset/');
      expect(url).toContain('w=800');
      expect(url).toContain('q=80');
      expect(url).toContain('auto=format');
    });

    it('should generate URL with custom options', () => {
      const url = getImageUrl(mockSource, 800, {
        quality: 90,
        format: 'webp'
      });
      expect(url).toContain('https://cdn.sanity.io/images/test-project-id/test-dataset/');
      expect(url).toContain('w=800');
      expect(url).toContain('q=90');
      expect(url).toContain('fm=webp');
    });

    it('should handle width parameter', () => {
      const url = getImageUrl(mockSource, 1200);
      expect(url).toBeDefined();
      expect(url).toContain('w=1200');
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
      // Default widths from the function are [320, 480, 640, 768, 1024, 1200, 1920]
      expect(srcset).toContain('320w');
      expect(srcset).toContain('480w');
      expect(srcset).toContain('640w');
      expect(srcset).toContain('768w');
      expect(srcset).toContain('1024w');
      expect(srcset).toContain('1200w');
      expect(srcset).toContain('1920w');
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
      // Default widths are 7 values
      expect(srcset.split(',')).toHaveLength(7);
    });
  });

  describe('defaultSizes constant', () => {
    it('should have all required size configurations', () => {
      expect(defaultSizes).toHaveProperty('card');
      expect(defaultSizes).toHaveProperty('hero');
      expect(defaultSizes).toHaveProperty('logo');
      expect(defaultSizes).toHaveProperty('avatar');
    });

    it('should have valid size strings', () => {
      Object.values(defaultSizes).forEach(sizeString => {
        expect(typeof sizeString).toBe('string');
        expect(sizeString.length).toBeGreaterThan(0);
        // Should contain media query syntax
        expect(sizeString).toMatch(/\d+(vw|px)/); 
      });
    });
  });
});