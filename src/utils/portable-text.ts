/**
 * Portable Text utilities for transforming Sanity's portable text format
 * into HTML and plain text.
 */

export interface PortableTextBlock {
  _type: string;
  style?: string;
  children?: PortableTextSpan[];
  [key: string]: any;
}

export interface PortableTextSpan {
  _type: string;
  text: string;
  marks?: string[];
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
 * Apply text marks (formatting) to a text string
 */
function applyMarks(text: string, marks: string[] = []): string {
  let result = text;
  marks.forEach((mark: string) => {
    switch (mark) {
      case 'strong':
        result = `<strong>${result}</strong>`;
        break;
      case 'em':
        result = `<em>${result}</em>`;
        break;
      case 'underline':
        result = `<u>${result}</u>`;
        break;
      case 'code':
        result = `<code>${result}</code>`;
        break;
    }
  });
  return result;
}

/**
 * Transform a single portable text block to HTML
 */
function transformBlock(block: PortableTextBlock): string {
  if (block._type !== 'block') return '';

  const children = (block.children || [])
    .map((child: PortableTextSpan) => {
      if (child._type === 'span') {
        return applyMarks(child.text, child.marks);
      }
      return '';
    })
    .join('');

  switch (block.style) {
    case 'h1':
      return `<h1>${children}</h1>`;
    case 'h2':
      return `<h2>${children}</h2>`;
    case 'h3':
      return `<h3>${children}</h3>`;
    case 'h4':
      return `<h4>${children}</h4>`;
    case 'blockquote':
      return `<blockquote>${children}</blockquote>`;
    default:
      return `<p>${children}</p>`;
  }
}

/**
 * Transform portable text blocks array to HTML string
 * This is a custom implementation for simple portable text rendering
 */
export function portableTextToHtml(blocks: PortableTextBlock[]): string {
  if (!blocks || !Array.isArray(blocks)) return '';

  return blocks.map((block) => transformBlock(block)).join('');
}
