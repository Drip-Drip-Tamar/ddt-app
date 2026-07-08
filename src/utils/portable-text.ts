/**
 * Portable Text utilities for transforming Sanity's portable text format
 * into HTML and plain text.
 */

import { toHTML, escapeHTML, uriLooksSafe, type PortableTextComponents } from '@portabletext/to-html';

export interface PortableTextBlock {
  _type: string;
  style?: string;
  children?: PortableTextSpan[];
  markDefs?: PortableTextMarkDef[];
  [key: string]: unknown;
}

export interface PortableTextSpan {
  _type: string;
  text: string;
  marks?: string[];
}

export interface PortableTextMarkDef {
  _type: string;
  _key: string;
  href?: string;
  [key: string]: unknown;
}

/**
 * Extract plain text from portable text blocks
 * Used for generating excerpts when not explicitly provided
 */
export function extractTextFromPortableText(
  blocks: PortableTextBlock[],
  maxLength = 200
): string {
  if (!blocks || !Array.isArray(blocks)) return '';

  const textBlocks = blocks
    .filter((block) => block._type === 'block')
    .map((block) => {
      if (!block.children || !Array.isArray(block.children)) return '';
      return block.children
        .filter((child: PortableTextSpan) => child._type === 'span')
        .map((child: PortableTextSpan) => child.text || '')
        .join('');
    })
    .join(' ');

  // Truncate to maxLength and add ellipsis if needed
  if (textBlocks.length > maxLength) {
    return textBlocks.substring(0, maxLength).trim() + '...';
  }
  return textBlocks;
}

/**
 * Component overrides for @portabletext/to-html.
 *
 * The library's defaults already cover h1-h6/blockquote/normal blocks,
 * bullet/number lists, and strong/em/code/strike-through/link marks (matching
 * Sanity's default block editor config used for `post.body`). We only
 * override:
 * - `underline`: library default renders `<span style="text-decoration:underline">`;
 *   we keep the semantic `<u>` tag the previous hand-rolled renderer used.
 * - `link`: library default renders a plain `<a href>`; we additionally add
 *   `rel="noopener noreferrer" target="_blank"` for external links, while
 *   reusing the library's own protocol allowlist/escaping (`uriLooksSafe`,
 *   `escapeHTML`) so unsafe URIs (eg. `javascript:`) are still dropped.
 */
const components: PortableTextComponents = {
  marks: {
    underline: ({ children }) => `<u>${children}</u>`,
    link: ({ children, value }) => {
      const href = typeof value?.href === 'string' ? value.href : '';
      if (!href || !uriLooksSafe(href)) return children;

      const isExternal = /^https?:\/\//i.test(href);
      const externalAttrs = isExternal ? ' rel="noopener noreferrer" target="_blank"' : '';
      return `<a href="${escapeHTML(href)}"${externalAttrs}>${children}</a>`;
    }
  }
};

/**
 * Transform portable text blocks array to HTML string.
 * Backed by @portabletext/to-html; see `components` above for overrides.
 */
export function portableTextToHtml(blocks: PortableTextBlock[]): string {
  if (!blocks || !Array.isArray(blocks)) return '';

  return toHTML(blocks, { components });
}
