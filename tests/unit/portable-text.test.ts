import { describe, it, expect } from 'vitest';
import {
  extractTextFromPortableText,
  portableTextToHtml,
  type PortableTextBlock
} from '../../src/utils/portable-text';

describe('Portable Text Utilities', () => {
  describe('extractTextFromPortableText', () => {
    it('should extract plain text from simple block', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          children: [
            {
              _type: 'span',
              text: 'Hello world'
            }
          ]
        }
      ];

      const result = extractTextFromPortableText(blocks);
      expect(result).toBe('Hello world');
    });

    it('should extract and join text from multiple blocks', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          children: [
            {
              _type: 'span',
              text: 'First paragraph'
            }
          ]
        },
        {
          _type: 'block',
          style: 'normal',
          children: [
            {
              _type: 'span',
              text: 'Second paragraph'
            }
          ]
        }
      ];

      const result = extractTextFromPortableText(blocks);
      expect(result).toBe('First paragraph Second paragraph');
    });

    it('should ignore non-block types', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'Valid text'
            }
          ]
        },
        {
          _type: 'image',
          asset: { _ref: 'image-123' }
        }
      ];

      const result = extractTextFromPortableText(blocks);
      expect(result).toBe('Valid text');
    });

    it('should extract from all children in a block', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'Hello '
            },
            {
              _type: 'span',
              text: 'beautiful '
            },
            {
              _type: 'span',
              text: 'world'
            }
          ]
        }
      ];

      const result = extractTextFromPortableText(blocks);
      expect(result).toBe('Hello beautiful world');
    });

    it('should ignore marks when extracting text', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'Bold text',
              marks: ['strong']
            },
            {
              _type: 'span',
              text: ' and italic text',
              marks: ['em']
            }
          ]
        }
      ];

      const result = extractTextFromPortableText(blocks);
      expect(result).toBe('Bold text and italic text');
    });

    it('should truncate text longer than maxLength', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'This is a very long text that exceeds the maximum length and should be truncated'
            }
          ]
        }
      ];

      const result = extractTextFromPortableText(blocks, 50);
      expect(result.length).toBeLessThanOrEqual(53); // 50 + '...'
      expect(result).toContain('...');
      expect(result).toMatch(/^This is a very long text that exceeds the maxim.*\.\.\.$/);
    });

    it('should not add ellipsis if text is shorter than maxLength', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'Short text'
            }
          ]
        }
      ];

      const result = extractTextFromPortableText(blocks, 100);
      expect(result).toBe('Short text');
      expect(result).not.toContain('...');
    });

    it('should use default maxLength of 200', () => {
      const longText = 'a'.repeat(250);
      const blocks: PortableTextBlock[] = [
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

      const result = extractTextFromPortableText(blocks);
      expect(result.length).toBe(203); // 200 + '...'
    });

    it('should return empty string for empty array', () => {
      const result = extractTextFromPortableText([]);
      expect(result).toBe('');
    });

    it('should return empty string for null input', () => {
      const result = extractTextFromPortableText(null as any);
      expect(result).toBe('');
    });

    it('should return empty string for undefined input', () => {
      const result = extractTextFromPortableText(undefined as any);
      expect(result).toBe('');
    });

    it('should handle blocks with no children', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal'
        }
      ];

      const result = extractTextFromPortableText(blocks);
      expect(result).toBe('');
    });

    it('should handle blocks with empty children array', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          children: []
        }
      ];

      const result = extractTextFromPortableText(blocks);
      expect(result).toBe('');
    });

    it('should ignore children that are not spans', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          children: [
            {
              _type: 'span',
              text: 'Valid span'
            },
            {
              _type: 'otherType',
              text: 'Invalid type'
            } as any
          ]
        }
      ];

      const result = extractTextFromPortableText(blocks);
      expect(result).toBe('Valid span');
    });
  });

  describe('portableTextToHtml', () => {
    it('should transform normal paragraph', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          children: [
            {
              _type: 'span',
              text: 'Hello world'
            }
          ]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<p>Hello world</p>');
    });

    it('should transform headings and blockquote', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'h1',
          children: [{ _type: 'span', text: 'Main heading' }]
        },
        {
          _type: 'block',
          style: 'h2',
          children: [{ _type: 'span', text: 'Subheading' }]
        },
        {
          _type: 'block',
          style: 'blockquote',
          children: [{ _type: 'span', text: 'Quoted text' }]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe(
        '<h1>Main heading</h1><h2>Subheading</h2><blockquote>Quoted text</blockquote>'
      );
    });

    it('should apply strong, em and code marks', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          children: [
            { _type: 'span', text: 'Bold ', marks: ['strong'] },
            { _type: 'span', text: 'italic ', marks: ['em'] },
            { _type: 'span', text: 'code', marks: ['code'] }
          ]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<p><strong>Bold </strong><em>italic </em><code>code</code></p>');
    });

    it('should render underline mark as <u>, not the library default <span>', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          children: [{ _type: 'span', text: 'Underlined text', marks: ['underline'] }]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<p><u>Underlined text</u></p>');
    });

    it('should render a link mark as an <a> tag (previously silently dropped)', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          markDefs: [{ _type: 'link', _key: 'link1', href: 'https://example.com' }],
          children: [{ _type: 'span', text: 'a link', marks: ['link1'] }]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toContain('<a href="https://example.com"');
      expect(result).toContain('a link</a>');
      // External links open safely in a new tab
      expect(result).toContain('rel="noopener noreferrer"');
      expect(result).toContain('target="_blank"');
    });

    it('should render an internal link without target/rel attributes', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          markDefs: [{ _type: 'link', _key: 'link1', href: '/news' }],
          children: [{ _type: 'span', text: 'internal link', marks: ['link1'] }]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<p><a href="/news">internal link</a></p>');
    });

    it('should drop unsafe link protocols (eg. javascript:)', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          markDefs: [{ _type: 'link', _key: 'link1', href: 'javascript:alert(1)' }],
          children: [{ _type: 'span', text: 'unsafe', marks: ['link1'] }]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<p>unsafe</p>');
    });

    it('should render a bullet list as <ul>/<li> (previously unsupported)', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          listItem: 'bullet',
          level: 1,
          children: [{ _type: 'span', text: 'First item' }]
        },
        {
          _type: 'block',
          style: 'normal',
          listItem: 'bullet',
          level: 1,
          children: [{ _type: 'span', text: 'Second item' }]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<ul><li>First item</li><li>Second item</li></ul>');
    });

    it('should render a numbered list as <ol>/<li>', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          listItem: 'number',
          level: 1,
          children: [{ _type: 'span', text: 'Step one' }]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<ol><li>Step one</li></ol>');
    });

    it('should transform multiple blocks', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'h1',
          children: [{ _type: 'span', text: 'Title' }]
        },
        {
          _type: 'block',
          style: 'normal',
          children: [{ _type: 'span', text: 'First paragraph' }]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<h1>Title</h1><p>First paragraph</p>');
    });

    it('should return empty string for empty array', () => {
      const result = portableTextToHtml([]);
      expect(result).toBe('');
    });

    it('should return empty string for null input', () => {
      const result = portableTextToHtml(null as any);
      expect(result).toBe('');
    });

    it('should return empty string for undefined input', () => {
      const result = portableTextToHtml(undefined as any);
      expect(result).toBe('');
    });
  });
});
