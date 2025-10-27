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

    it('should transform h1 heading', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'h1',
          children: [
            {
              _type: 'span',
              text: 'Main heading'
            }
          ]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<h1>Main heading</h1>');
    });

    it('should transform h2 heading', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'h2',
          children: [
            {
              _type: 'span',
              text: 'Subheading'
            }
          ]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<h2>Subheading</h2>');
    });

    it('should transform h3 heading', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'h3',
          children: [
            {
              _type: 'span',
              text: 'Sub-subheading'
            }
          ]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<h3>Sub-subheading</h3>');
    });

    it('should transform h4 heading', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'h4',
          children: [
            {
              _type: 'span',
              text: 'Minor heading'
            }
          ]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<h4>Minor heading</h4>');
    });

    it('should transform blockquote', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'blockquote',
          children: [
            {
              _type: 'span',
              text: 'Quoted text'
            }
          ]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<blockquote>Quoted text</blockquote>');
    });

    it('should apply strong mark', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          children: [
            {
              _type: 'span',
              text: 'Bold text',
              marks: ['strong']
            }
          ]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<p><strong>Bold text</strong></p>');
    });

    it('should apply em mark', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          children: [
            {
              _type: 'span',
              text: 'Italic text',
              marks: ['em']
            }
          ]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<p><em>Italic text</em></p>');
    });

    it('should apply underline mark', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          children: [
            {
              _type: 'span',
              text: 'Underlined text',
              marks: ['underline']
            }
          ]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<p><u>Underlined text</u></p>');
    });

    it('should apply code mark', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          children: [
            {
              _type: 'span',
              text: 'const x = 1',
              marks: ['code']
            }
          ]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<p><code>const x = 1</code></p>');
    });

    it('should apply multiple marks in array order', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          children: [
            {
              _type: 'span',
              text: 'Bold and italic',
              marks: ['strong', 'em']
            }
          ]
        }
      ];

      const result = portableTextToHtml(blocks);
      // Marks are applied in order: strong first, then em wraps it
      expect(result).toBe('<p><em><strong>Bold and italic</strong></em></p>');
    });

    it('should handle multiple children with different marks', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          children: [
            {
              _type: 'span',
              text: 'Normal ',
              marks: []
            },
            {
              _type: 'span',
              text: 'bold ',
              marks: ['strong']
            },
            {
              _type: 'span',
              text: 'italic',
              marks: ['em']
            }
          ]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<p>Normal <strong>bold </strong><em>italic</em></p>');
    });

    it('should transform multiple blocks', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'h1',
          children: [
            {
              _type: 'span',
              text: 'Title'
            }
          ]
        },
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

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<h1>Title</h1><p>First paragraph</p><p>Second paragraph</p>');
    });

    it('should filter out non-block types', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          children: [
            {
              _type: 'span',
              text: 'Text block'
            }
          ]
        },
        {
          _type: 'image',
          asset: { _ref: 'image-123' }
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<p>Text block</p>');
    });

    it('should handle empty children array', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          children: []
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<p></p>');
    });

    it('should handle missing children property', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal'
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<p></p>');
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

    it('should ignore non-span children', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'normal',
          children: [
            {
              _type: 'span',
              text: 'Valid'
            },
            {
              _type: 'otherType',
              text: 'Invalid'
            } as any
          ]
        }
      ];

      const result = portableTextToHtml(blocks);
      expect(result).toBe('<p>Valid</p>');
    });

    it('should handle complex nested structure', () => {
      const blocks: PortableTextBlock[] = [
        {
          _type: 'block',
          style: 'h2',
          children: [
            {
              _type: 'span',
              text: 'Introduction'
            }
          ]
        },
        {
          _type: 'block',
          style: 'normal',
          children: [
            {
              _type: 'span',
              text: 'This is '
            },
            {
              _type: 'span',
              text: 'important',
              marks: ['strong', 'em']
            },
            {
              _type: 'span',
              text: ' information.'
            }
          ]
        },
        {
          _type: 'block',
          style: 'blockquote',
          children: [
            {
              _type: 'span',
              text: 'A wise quote',
              marks: ['em']
            }
          ]
        }
      ];

      const result = portableTextToHtml(blocks);
      // Marks are applied in array order: strong first, then em wraps it
      expect(result).toBe(
        '<h2>Introduction</h2>' +
        '<p>This is <em><strong>important</strong></em> information.</p>' +
        '<blockquote><em>A wise quote</em></blockquote>'
      );
    });
  });
});
