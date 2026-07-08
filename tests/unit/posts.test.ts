import { describe, it, expect } from 'vitest';
import { POSTS_QUERY, POST_QUERY, POST_SLUGS_QUERY } from '../../src/data/posts';

describe('GROQ post queries', () => {
  it('POSTS_QUERY filters to published posts with a slug, newest first', () => {
    expect(POSTS_QUERY).toContain('_type == "post"');
    expect(POSTS_QUERY).toContain('defined(slug.current)');
    expect(POSTS_QUERY).toContain('order(publishedAt desc)');
  });

  it('POST_QUERY selects a single post by the $slug param', () => {
    expect(POST_QUERY).toContain('slug.current == $slug');
    expect(POST_QUERY).toContain('[0]');
  });

  it('shares the canonical author and featuredImage projection across list and detail queries', () => {
    const authorProjection = '"author": author->';
    const featuredImageProjection = 'featuredImage {';

    for (const query of [POSTS_QUERY, POST_QUERY]) {
      expect(query).toContain(authorProjection);
      expect(query).toContain(featuredImageProjection);
      // Author is always an object (name/title/image), never a bare string,
      // so templates don't have to special-case the shape per page.
      expect(query).toMatch(/"author": author->\{\s*name,/);
    }
  });

  it('only POST_QUERY (the detail page) fetches SEO fields', () => {
    expect(POST_QUERY).toContain('seoTitle');
    expect(POST_QUERY).toContain('seoDescription');
    expect(POST_QUERY).toContain('seoKeywords');
    expect(POSTS_QUERY).not.toContain('seoTitle');
  });

  it('POST_SLUGS_QUERY fetches only slugs, for static path generation', () => {
    expect(POST_SLUGS_QUERY).toContain('"slug": slug.current');
    expect(POST_SLUGS_QUERY).not.toContain('featuredImage');
  });
});
