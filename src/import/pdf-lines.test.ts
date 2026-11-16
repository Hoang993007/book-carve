import { describe, expect, it } from 'vitest';
import { toLines, toParagraphs, type PdfItem } from './pdf-lines';

const item = (str: string, x: number, y: number, h = 10, eol = false): PdfItem => ({ str, x, y, h, eol });

describe('toLines', () => {
  it('groups runs on the same baseline and drops bare page numbers', () => {
    const lines = toLines([item('Hello ', 50, 700), item('world', 80, 700, 10, true), item('Next', 50, 688), item('12', 300, 40)]);
    expect(lines.map((l) => l.text)).toEqual(['Hello world', 'Next']);
  });
});

describe('toParagraphs', () => {
  it('joins wrapped lines, splits on larger gaps, fixes hyphenation and detects headings', () => {
    const lines = toLines([
      item('Chapter One', 50, 760, 18, true),
      item('Small habits compound over', 50, 720, 10, true),
      item('time. Keep them in-', 50, 708, 10, true),
      item('visible friction low.', 50, 696, 10, true),
      item('A new paragraph starts here.', 50, 670, 10, true),
      item('Indented start of another one.', 62, 658, 10, true),
    ]);
    const blocks = toParagraphs(lines, 3, 10);
    expect(blocks).toEqual([
      { kind: 'h', text: 'Chapter One', page: 3 },
      { kind: 'p', text: 'Small habits compound over time. Keep them invisible friction low.', page: 3 },
      { kind: 'p', text: 'A new paragraph starts here.', page: 3 },
      { kind: 'p', text: 'Indented start of another one.', page: 3 },
    ]);
  });
});
