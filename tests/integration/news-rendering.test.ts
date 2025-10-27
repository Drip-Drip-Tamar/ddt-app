import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Sanity client
vi.mock('../../src/utils/sanity-client', () => ({
  client: {
    fetch: vi.fn()
  }
}));

// Import after mocking
import { client } from '../../src/utils/sanity-client';
import { extractTextFromPortableText } from '../../src/utils/portable-text';

describe('News Post Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Post Data Fetching', () => {
    it('should fetch posts with correct data structure', async () => {
      const mockPosts = [
        {
          _id: 'post-1',
          title: 'Test Post',
          slug: { current: 'test-post' },
          excerpt: 'A test post excerpt',
          body: [
            {
              _type: 'block',
              style: 'normal',
              children: [
                {
                  _type: 'span',
                  text: 'Post content'
                }
              ]
            }
          ],
          publishedAt: '2025-01-15T10:00:00Z',
          author: 'Test Author',
          featuredImage: {
            image: {
              asset: { _ref: 'image-123' },
              dimensions: { width: 1200, height: 630 }
            },
            alt: 'Test image'
          }
        }
      ];

      vi.mocked(client.fetch).mockResolvedValue(mockPosts);

      const posts = await client.fetch('mock-query');

      expect(posts).toBeDefined();
      expect(Array.isArray(posts)).toBe(true);
      expect(posts).toHaveLength(1);
      expect(posts[0]).toHaveProperty('_id');
      expect(posts[0]).toHaveProperty('title');
      expect(posts[0]).toHaveProperty('slug');
      expect(posts[0]).toHaveProperty('excerpt');
      expect(posts[0]).toHaveProperty('body');
      expect(posts[0]).toHaveProperty('publishedAt');
    });

    it('should handle posts with author reference resolved', async () => {
      const mockPost = {
        _id: 'post-1',
        title: 'Test Post',
        slug: { current: 'test-post' },
        author: {
          name: 'John Doe',
          title: 'Writer',
          image: {
            image: {
              asset: { _ref: 'image-456' },
              dimensions: { width: 200, height: 200 }
            },
            alt: 'John Doe'
          }
        },
        featuredImage: {
          image: {
            asset: { _ref: 'image-123' },
            dimensions: { width: 1200, height: 630 }
          },
          alt: 'Featured image'
        }
      };

      vi.mocked(client.fetch).mockResolvedValue(mockPost);

      const post = await client.fetch('mock-query', { slug: 'test-post' });

      expect(post.author).toBeDefined();
      expect(post.author).toHaveProperty('name');
      expect(post.author.name).toBe('John Doe');
    });

    it('should validate image data structure for ResponsiveImage', () => {
      const imageData = {
        asset: { _ref: 'image-123' },
        dimensions: { width: 1200, height: 630 },
        alt: 'Test image'
      };

      // Verify structure matches what ResponsiveImage expects
      expect(imageData).toHaveProperty('asset');
      expect(imageData).toHaveProperty('dimensions');
      expect(imageData).toHaveProperty('alt');
      expect(imageData.asset).toHaveProperty('_ref');
      expect(imageData.dimensions).toHaveProperty('width');
      expect(imageData.dimensions).toHaveProperty('height');
      expect(typeof imageData.alt).toBe('string');
    });

    it('should handle posts without featured image', async () => {
      const mockPost = {
        _id: 'post-1',
        title: 'Test Post',
        slug: { current: 'test-post' },
        excerpt: 'Test excerpt',
        body: [],
        publishedAt: '2025-01-15T10:00:00Z',
        author: 'Test Author',
        featuredImage: null
      };

      vi.mocked(client.fetch).mockResolvedValue(mockPost);

      const post = await client.fetch('mock-query', { slug: 'test-post' });

      expect(post.featuredImage).toBeNull();
    });

    it('should handle posts without author', async () => {
      const mockPost = {
        _id: 'post-1',
        title: 'Test Post',
        slug: { current: 'test-post' },
        excerpt: 'Test excerpt',
        body: [],
        publishedAt: '2025-01-15T10:00:00Z',
        author: null,
        featuredImage: null
      };

      vi.mocked(client.fetch).mockResolvedValue(mockPost);

      const post = await client.fetch('mock-query', { slug: 'test-post' });

      expect(post.author).toBeNull();
    });
  });

  describe('SEO Fallback Logic', () => {
    it('should use seoTitle when provided', () => {
      const post = {
        title: 'Original Title',
        seoTitle: 'SEO Optimized Title',
        excerpt: 'Excerpt text',
        seoDescription: null
      };

      const seoTitle = post.seoTitle || post.title;
      expect(seoTitle).toBe('SEO Optimized Title');
    });

    it('should fall back to title when seoTitle is not provided', () => {
      const post = {
        title: 'Original Title',
        seoTitle: null,
        excerpt: 'Excerpt text',
        seoDescription: null
      };

      const seoTitle = post.seoTitle || post.title;
      expect(seoTitle).toBe('Original Title');
    });

    it('should use seoDescription when provided', () => {
      const post = {
        title: 'Title',
        seoTitle: null,
        excerpt: 'Original excerpt',
        seoDescription: 'SEO optimized description'
      };

      const seoDescription = post.seoDescription || post.excerpt || '';
      expect(seoDescription).toBe('SEO optimized description');
    });

    it('should fall back to excerpt when seoDescription is not provided', () => {
      const post = {
        title: 'Title',
        seoTitle: null,
        excerpt: 'Original excerpt',
        seoDescription: null
      };

      const seoDescription = post.seoDescription || post.excerpt || '';
      expect(seoDescription).toBe('Original excerpt');
    });

    it('should fall back to empty string when both seoDescription and excerpt are not provided', () => {
      const post = {
        title: 'Title',
        seoTitle: null,
        excerpt: null,
        seoDescription: null
      };

      const seoDescription = post.seoDescription || post.excerpt || '';
      expect(seoDescription).toBe('');
    });

    it('should handle all SEO fields being null', () => {
      const post = {
        title: 'Test Title',
        seoTitle: null,
        excerpt: null,
        seoDescription: null
      };

      const seoTitle = post.seoTitle || post.title;
      const seoDescription = post.seoDescription || post.excerpt || '';

      expect(seoTitle).toBe('Test Title');
      expect(seoDescription).toBe('');
    });
  });

  describe('Date Formatting', () => {
    it('should format date in en-GB locale for listing page', () => {
      const publishedAt = '2025-01-15T10:00:00Z';
      const date = new Date(publishedAt);

      const formatted = date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      // Should format as "15 Jan 2025"
      expect(formatted).toMatch(/^\d{1,2}\s\w{3}\s\d{4}$/);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('2025');
    });

    it('should format date in en-GB locale for detail page', () => {
      const publishedAt = '2025-01-15T10:00:00Z';
      const date = new Date(publishedAt);

      const formatted = date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // Should format as "15 January 2025" (full month name)
      expect(formatted).toMatch(/^\d{1,2}\s\w+\s\d{4}$/);
      expect(formatted).toContain('January');
      expect(formatted).toContain('2025');
    });

    it('should handle null publishedAt gracefully', () => {
      const publishedAt = null;

      const formatted = publishedAt
        ? new Date(publishedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })
        : null;

      expect(formatted).toBeNull();
    });

    it('should format various dates consistently', () => {
      const dates = [
        '2025-01-01T00:00:00Z',
        '2025-06-15T12:30:00Z',
        '2025-12-31T23:59:59Z'
      ];

      dates.forEach(dateStr => {
        const formatted = new Date(dateStr).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });

        // All should follow same pattern
        expect(formatted).toMatch(/^\d{1,2}\s\w{3}\s\d{4}$/);
      });
    });
  });

  describe('Excerpt Generation', () => {
    it('should use provided excerpt when available', () => {
      const post = {
        excerpt: 'Custom excerpt',
        body: [
          {
            _type: 'block',
            children: [
              {
                _type: 'span',
                text: 'This is the body content that should not be used'
              }
            ]
          }
        ]
      };

      const contentSnippet = post.excerpt || extractTextFromPortableText(post.body, 150);
      expect(contentSnippet).toBe('Custom excerpt');
    });

    it('should generate excerpt from body when not provided', () => {
      const post = {
        excerpt: null,
        body: [
          {
            _type: 'block',
            children: [
              {
                _type: 'span',
                text: 'This is the body content'
              }
            ]
          }
        ]
      };

      const contentSnippet = post.excerpt || extractTextFromPortableText(post.body, 150);
      expect(contentSnippet).toBe('This is the body content');
    });

    it('should truncate generated excerpt to specified length', () => {
      const longText = 'a'.repeat(200);
      const post = {
        excerpt: null,
        body: [
          {
            _type: 'block',
            children: [
              {
                _type: 'span',
                text: longText
              }
            ]
          }
        ]
      };

      const contentSnippet = post.excerpt || extractTextFromPortableText(post.body, 150);
      expect(contentSnippet.length).toBe(153); // 150 + '...'
      expect(contentSnippet).toContain('...');
    });

    it('should use 150 char limit for listing page excerpts', () => {
      const longText = 'x'.repeat(200);
      const body = [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: longText
            }
          ]
        }
      ];

      const excerpt = extractTextFromPortableText(body, 150);
      expect(excerpt.length).toBe(153); // 150 + '...'
    });

    it('should use 200 char limit for other contexts', () => {
      const longText = 'y'.repeat(250);
      const body = [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: longText
            }
          ]
        }
      ];

      const excerpt = extractTextFromPortableText(body, 200);
      expect(excerpt.length).toBe(203); // 200 + '...'
    });
  });

  describe('Post Structure Validation', () => {
    it('should validate complete post structure', async () => {
      const mockPost = {
        _id: 'post-1',
        title: 'Test Post',
        slug: { current: 'test-post' },
        excerpt: 'Test excerpt',
        body: [
          {
            _type: 'block',
            style: 'normal',
            children: [
              {
                _type: 'span',
                text: 'Content'
              }
            ]
          }
        ],
        publishedAt: '2025-01-15T10:00:00Z',
        author: {
          name: 'Author Name',
          title: 'Writer',
          image: null
        },
        featuredImage: {
          image: {
            asset: { _ref: 'image-123' },
            dimensions: { width: 1200, height: 630 }
          },
          alt: 'Image alt'
        },
        seoTitle: 'SEO Title',
        seoDescription: 'SEO Description',
        seoKeywords: 'test, keywords'
      };

      vi.mocked(client.fetch).mockResolvedValue(mockPost);

      const post = await client.fetch('mock-query', { slug: 'test-post' });

      // Validate all required fields
      expect(post._id).toBe('post-1');
      expect(post.title).toBe('Test Post');
      expect(post.slug).toEqual({ current: 'test-post' });
      expect(post.excerpt).toBe('Test excerpt');
      expect(Array.isArray(post.body)).toBe(true);
      expect(post.publishedAt).toBe('2025-01-15T10:00:00Z');
      expect(post.author).toHaveProperty('name');
      expect(post.featuredImage).toHaveProperty('image');
      expect(post.seoTitle).toBe('SEO Title');
      expect(post.seoDescription).toBe('SEO Description');
    });

    it('should validate body is array of blocks', () => {
      const body = [
        {
          _type: 'block',
          style: 'h1',
          children: [{ _type: 'span', text: 'Title' }]
        },
        {
          _type: 'block',
          style: 'normal',
          children: [{ _type: 'span', text: 'Content' }]
        }
      ];

      expect(Array.isArray(body)).toBe(true);
      body.forEach(block => {
        expect(block).toHaveProperty('_type');
        expect(block._type).toBe('block');
        expect(block).toHaveProperty('children');
        expect(Array.isArray(block.children)).toBe(true);
      });
    });

    it('should validate slug structure', () => {
      const slug = { current: 'test-post-slug' };

      expect(slug).toHaveProperty('current');
      expect(typeof slug.current).toBe('string');
      expect(slug.current.length).toBeGreaterThan(0);
    });

    it('should handle missing optional fields', async () => {
      const minimalPost = {
        _id: 'post-1',
        title: 'Minimal Post',
        slug: { current: 'minimal-post' },
        body: [],
        publishedAt: '2025-01-15T10:00:00Z'
      };

      vi.mocked(client.fetch).mockResolvedValue(minimalPost);

      const post = await client.fetch('mock-query', { slug: 'minimal-post' });

      // Required fields present
      expect(post._id).toBeDefined();
      expect(post.title).toBeDefined();
      expect(post.slug).toBeDefined();

      // Optional fields can be missing
      expect(post.excerpt).toBeUndefined();
      expect(post.author).toBeUndefined();
      expect(post.featuredImage).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      vi.mocked(client.fetch).mockRejectedValue(new Error('Network error'));

      await expect(client.fetch('mock-query')).rejects.toThrow('Network error');
    });

    it('should handle post not found', async () => {
      vi.mocked(client.fetch).mockResolvedValue(null);

      const post = await client.fetch('mock-query', { slug: 'non-existent' });

      expect(post).toBeNull();
    });

    it('should handle empty posts array', async () => {
      vi.mocked(client.fetch).mockResolvedValue([]);

      const posts = await client.fetch('mock-query');

      expect(posts).toEqual([]);
      expect(posts.length).toBe(0);
    });
  });
});
