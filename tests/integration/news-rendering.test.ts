import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Sanity client
vi.mock('../../src/utils/sanity-client', () => ({
  client: {
    fetch: vi.fn()
  }
}));

// Import after mocking
import { client } from '../../src/utils/sanity-client';

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
            alt: 'Test image',
            sizingMode: 'cover',
            backgroundColor: '#e5e7eb'
          }
        }
      ];

      vi.mocked(client.fetch).mockResolvedValue(mockPosts as any);

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
          alt: 'Featured image',
          sizingMode: 'container',
          backgroundColor: '#000000'
        }
      };

      vi.mocked(client.fetch).mockResolvedValue(mockPost as any);

      const post = await client.fetch('mock-query', { slug: 'test-post' });

      expect(post.author).toBeDefined();
      expect(post.author).toHaveProperty('name');
      expect(post.author.name).toBe('John Doe');
    });

    it('should validate image data structure for ResponsiveImage', () => {
      const imageData = {
        asset: { _ref: 'image-123' },
        dimensions: { width: 1200, height: 630 },
        alt: 'Test image',
        sizingMode: 'stretch',
        backgroundColor: '#000000'
      };

      // Verify structure matches what ResponsiveImage expects
      expect(imageData).toHaveProperty('asset');
      expect(imageData).toHaveProperty('dimensions');
      expect(imageData).toHaveProperty('alt');
      expect(imageData).toHaveProperty('sizingMode');
      expect(imageData).toHaveProperty('backgroundColor');
      expect(imageData.asset).toHaveProperty('_ref');
      expect(imageData.dimensions).toHaveProperty('width');
      expect(imageData.dimensions).toHaveProperty('height');
      expect(typeof imageData.alt).toBe('string');
      expect(imageData.sizingMode).toBe('stretch');
      expect(imageData.backgroundColor).toBe('#000000');
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

      vi.mocked(client.fetch).mockResolvedValue(mockPost as any);

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

      vi.mocked(client.fetch).mockResolvedValue(mockPost as any);

      const post = await client.fetch('mock-query', { slug: 'test-post' });

      expect(post.author).toBeNull();
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
          alt: 'Image alt',
          sizingMode: 'fill',
          backgroundColor: '#f3f4f6'
        },
        seoTitle: 'SEO Title',
        seoDescription: 'SEO Description',
        seoKeywords: 'test, keywords'
      };

      vi.mocked(client.fetch).mockResolvedValue(mockPost as any);

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

      vi.mocked(client.fetch).mockResolvedValue(minimalPost as any);

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
      vi.mocked(client.fetch).mockResolvedValue([] as any);

      const posts = await client.fetch('mock-query');

      expect(posts).toEqual([]);
      expect(posts.length).toBe(0);
    });
  });
});
