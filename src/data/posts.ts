/**
 * Shared GROQ projections and queries for the `post` document type.
 *
 * Follows the fragment-composition pattern used in `src/data/blocks.js`
 * (see `IMAGE`/`SECTIONS`): small reusable fragments are composed into a
 * single canonical post projection so `news.astro`, `news/[slug].astro`
 * and `posts/index.astro` all fetch the same shape of data.
 */

import type { PortableTextBlock } from '@utils/portable-text';

export interface PostImageAsset {
  // Sanity asset reference; left as `any` to match ResponsiveImage's
  // `asset?: any` prop, which resolves the actual asset shape internally.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  asset: any;
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface PostFeaturedImage {
  image: PostImageAsset;
  alt?: string;
  sizingMode?: string;
  backgroundColor?: string;
}

export interface PostAuthorImage {
  image: PostImageAsset;
  alt?: string;
}

export interface PostAuthor {
  name: string;
  title?: string;
  image?: PostAuthorImage;
}

export interface PostSlug {
  current: string;
}

/**
 * Canonical `post` shape shared by all three consuming pages. Fields not
 * relevant to a given page (eg. `body` on the listing pages, used only for
 * excerpt fallback) are simply left unused rather than fetched with a
 * separate, divergent projection.
 */
export interface Post {
  _id: string;
  title: string;
  slug: PostSlug;
  excerpt?: string;
  body: PortableTextBlock[];
  publishedAt?: string;
  author?: PostAuthor;
  featuredImage?: PostFeaturedImage;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}

const AUTHOR_FIELDS = `{
  name,
  title,
  image {
    image {
      asset,
      "dimensions": asset->metadata.dimensions
    },
    alt
  }
}`;

const FEATURED_IMAGE_FIELDS = `{
  image {
    asset,
    "dimensions": asset->metadata.dimensions
  },
  alt,
  sizingMode,
  backgroundColor
}`;

/** Fields shared by every post query. Interpolated into the queries below. */
const POST_CORE_FIELDS = `
  _id,
  title,
  slug,
  excerpt,
  body,
  publishedAt,
  "author": author->${AUTHOR_FIELDS},
  featuredImage ${FEATURED_IMAGE_FIELDS}
`;

/** Published posts, newest first. Used by the news listing pages. */
export const POSTS_QUERY = `*[
  _type == "post"
  && defined(slug.current)
]|order(publishedAt desc){
  ${POST_CORE_FIELDS}
}`;

/** A single post by slug, plus SEO fields only needed on the detail page. */
export const POST_QUERY = `*[_type == "post" && slug.current == $slug][0]{
  ${POST_CORE_FIELDS},
  seoTitle,
  seoDescription,
  seoKeywords
}`;

/** Slugs only, for static path generation. */
export const POST_SLUGS_QUERY = `*[
  _type == "post"
  && defined(slug.current)
]{
  "slug": slug.current
}`;
