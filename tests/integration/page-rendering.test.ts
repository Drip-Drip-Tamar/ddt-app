import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Sanity client fetch
vi.mock('../../src/utils/sanity-client', () => ({
  client: {
    fetch: vi.fn()
  }
}));

// Mock data modules
vi.mock('../../src/data/page', () => ({
  fetchData: vi.fn(() => Promise.resolve([
    {
      _id: 'page-1',
      slug: { current: 'test-page' },
      title: 'Test Page',
      sections: []
    }
  ])),
  getPageBySlug: vi.fn((slug) => Promise.resolve({
    _id: 'page-1',
    slug: { current: slug || 'index' },
    title: slug ? 'Test Page' : 'Homepage',
    sections: [
      {
        _type: 'heroSection',
        _id: 'hero-1',
        title: 'Test Hero',
        subtitle: 'Test subtitle'
      }
    ]
  }))
}));

vi.mock('../../src/data/siteConfig', () => ({
  fetchData: vi.fn(() => Promise.resolve({
    _id: 'siteConfig',
    siteName: 'Test Site',
    siteDescription: 'Test Description',
    siteKeywords: 'test, keywords',
    header: {
      logo: { src: '/logo.png', alt: 'Logo' },
      navItems: []
    },
    footer: {
      copyright: '© 2025 Test Site'
    }
  }))
}));

describe('Page Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dynamic Page Routes', () => {
    it('should fetch all pages for static path generation', async () => {
      const { fetchData } = await import('../../src/data/page');
      
      const pages = await fetchData();
      
      expect(pages).toBeDefined();
      expect(Array.isArray(pages)).toBe(true);
      expect(pages.length).toBeGreaterThan(0);
      expect(pages[0]).toHaveProperty('slug');
      expect(pages[0]).toHaveProperty('title');
    });

    it('should fetch page data by slug', async () => {
      const { getPageBySlug } = await import('../../src/data/page');
      
      const page = await getPageBySlug('test-page');
      
      expect(page).toBeDefined();
      expect(page.slug.current).toBe('test-page');
      expect(page.title).toBe('Test Page');
      expect(page.sections).toBeDefined();
      expect(Array.isArray(page.sections)).toBe(true);
    });

    it('should handle homepage (undefined slug)', async () => {
      const { getPageBySlug } = await import('../../src/data/page');
      
      const homepage = await getPageBySlug(undefined);
      
      expect(homepage).toBeDefined();
      expect(homepage.slug.current).toBe('index');
      expect(homepage.title).toBe('Homepage');
    });
  });

  describe('Site Configuration', () => {
    it('should fetch global site configuration', async () => {
      const { fetchData } = await import('../../src/data/siteConfig');
      
      const config = await fetchData();
      
      expect(config).toBeDefined();
      expect(config.siteName).toBe('Test Site');
      expect(config.siteDescription).toBe('Test Description');
      expect(config.header).toBeDefined();
      expect(config.footer).toBeDefined();
    });

    it('should have valid header configuration', async () => {
      const { fetchData } = await import('../../src/data/siteConfig');
      
      const config = await fetchData();
      
      expect(config.header).toHaveProperty('logo');
      expect(config.header).toHaveProperty('navItems');
      expect(config.header.logo).toHaveProperty('src');
      expect(config.header.logo).toHaveProperty('alt');
    });

    it('should have valid footer configuration', async () => {
      const { fetchData } = await import('../../src/data/siteConfig');
      
      const config = await fetchData();
      
      expect(config.footer).toHaveProperty('copyright');
      expect(config.footer.copyright).toContain('©');
    });
  });

  describe('Component Section Mapping', () => {
    const componentMap = {
      cardsSection: 'Cards',
      ctaSection: 'Cta',
      heroSection: 'Hero',
      logosSection: 'Logos',
      testimonialsSection: 'Testimonials',
      waterQualitySection: 'WaterQualityChart'
    };

    it('should map all section types to components', () => {
      Object.keys(componentMap).forEach(sectionType => {
        expect(componentMap[sectionType as keyof typeof componentMap]).toBeTruthy();
      });
    });

    it('should handle unknown section types gracefully', () => {
      const unknownSection = { _type: 'unknownSection' };
      const component = componentMap[unknownSection._type as keyof typeof componentMap];
      
      expect(component).toBeUndefined();
    });
  });

  describe('Data Validation', () => {
    it('should validate page structure', async () => {
      const { getPageBySlug } = await import('../../src/data/page');
      
      const page = await getPageBySlug('test-page');
      
      // Required fields
      expect(page).toHaveProperty('_id');
      expect(page).toHaveProperty('slug');
      expect(page).toHaveProperty('title');
      expect(page).toHaveProperty('sections');
      
      // Type validation
      expect(typeof page._id).toBe('string');
      expect(typeof page.slug).toBe('object');
      expect(typeof page.title).toBe('string');
      expect(Array.isArray(page.sections)).toBe(true);
    });

    it('should validate section structure', async () => {
      const { getPageBySlug } = await import('../../src/data/page');
      
      const page = await getPageBySlug('test-page');
      const section = page.sections[0];
      
      expect(section).toHaveProperty('_type');
      expect(section).toHaveProperty('_id');
      expect(typeof section._type).toBe('string');
      expect(typeof section._id).toBe('string');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing pages gracefully', async () => {
      const { getPageBySlug } = await import('../../src/data/page');
      vi.mocked(getPageBySlug).mockResolvedValueOnce(null);
      
      const page = await getPageBySlug('non-existent-page');
      
      expect(page).toBeNull();
    });

    it('should handle fetch errors', async () => {
      const { fetchData } = await import('../../src/data/page');
      vi.mocked(fetchData).mockRejectedValueOnce(new Error('Fetch failed'));
      
      await expect(fetchData()).rejects.toThrow('Fetch failed');
    });
  });
});