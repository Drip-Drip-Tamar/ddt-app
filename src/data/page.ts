import groq from 'groq';
import { client } from '@utils/sanity-client';
import { SECTIONS } from './blocks';
import type { PAGES_QUERY_RESULT, PAGE_BY_SLUG_QUERY_RESULT } from '../sanity.types';

export type PageData = PAGES_QUERY_RESULT[number];

const PAGE_PROJECTION = groq`{
  _id,
  slug,
  title,
  metaTitle,
  metaDescription,
  "socialImage": {
    "src": socialImage.asset->url
  },
  sections[] ${SECTIONS}
}`;

export const PAGES_QUERY = groq`*[_type == "page"] ${PAGE_PROJECTION}`;
export const PAGE_BY_SLUG_QUERY = groq`*[_type == "page" && slug.current == $slug] ${PAGE_PROJECTION}`;

/**
 * Error handling policy for this module (Task 12):
 * Page fetches are NOT caught here. A missing or failing page fetch at
 * request/build time should surface as a deliberate 404 (no page found) or
 * 500 (Sanity error) rather than degrading silently — unlike siteConfig/
 * locationConfig, there is no sensible fallback for "what page is this".
 * Callers (e.g. src/pages/[...slug].astro) are responsible for turning an
 * empty result into a 404 response.
 */

export async function fetchData(): Promise<PAGES_QUERY_RESULT> {
    return await client.fetch(PAGES_QUERY);
}

export async function getPageBySlug(slug?: string): Promise<PAGE_BY_SLUG_QUERY_RESULT> {
    return await client.fetch(PAGE_BY_SLUG_QUERY, { slug: slug || '/' });
}
