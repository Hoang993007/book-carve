import { describe, expect, it } from 'vitest';
import { dropRunningLines, toLines, toParagraphs, type PdfItem, type PdfLine } from './pdf-lines';

const item = (str: string, x: number, y: number, h = 10, eol = false, w = str.length * 5): PdfItem => ({ str, x, y, w, h, eol });
const texts = (lines: PdfLine[], page = 1, body = 10, width = 0) => toParagraphs(lines, page, body, width).map((b) => `${b.kind}:${b.text}`);

describe('toLines', () => {
  it('groups runs on the same baseline and drops bare page numbers', () => {
    const lines = toLines([item('Hello ', 50, 700), item('world', 80, 700, 10, true), item('Next', 50, 688), item('12', 300, 40)]);
    expect(lines.map((l) => l.text)).toEqual(['Hello world', 'Next']);
  });

  it('takes the height of most characters, so a drop cap does not make a heading', () => {
    const [line] = toLines([item('L', 78, 650, 27.5), item('àng Bollingen thuộc bang St. Gallen', 95, 650, 15, true)]);
    expect(line.text).toBe('Làng Bollingen thuộc bang St. Gallen');
    expect(line.h).toBe(15);
  });
});

describe('toParagraphs', () => {
  it('joins wrapped lines, splits on larger gaps, fixes hyphenation and detects headings', () => {
    const lines = toLines([
      item('Chapter One', 50, 760, 18, true),
      item('Small habits compound over time and', 50, 720, 10, true, 300),
      item('keep them in-', 50, 708, 10, true, 300),
      item('visible friction low.', 50, 696, 10, true, 120),
      item('A new paragraph starts here and runs', 50, 670, 10, true, 300),
      item('on.', 50, 658, 10, true, 20),
      item('Indented start of another one.', 62, 646, 10, true, 288),
    ]);
    expect(texts(lines, 3)).toEqual([
      'h:Chapter One',
      'p:Small habits compound over time and keep them invisible friction low.',
      'p:A new paragraph starts here and runs on.',
      'p:Indented start of another one.',
    ]);
  });

  it('keeps evenly spaced list entries apart (a table of contents)', () => {
    const lines = toLines([
      item('1. Lời giới thiệu', 93, 603, 15, true, 97),
      item('2. Lời mở đầu', 93, 579, 15, true, 85),
      item('5. Chương hai: Trạng thái làm việc sâu rất ít khi xuất hiện', 93, 555, 15, true, 347),
      item('10. Quy tắc số 3: Thoát khỏi truyền thông xã hội', 85.5, 531, 15, true, 292),
      item('12. Kết luận', 85.5, 507, 15, false, 74),
    ]);
    expect(texts(lines, 3, 15)).toHaveLength(5);
  });

  it('does not split centered text on uneven left edges', () => {
    const lines = toLines([
      item('In accordance with the Copyright Act, the scanning and sharing of any part of', 57.9, 507, 11, true, 496),
      item('this book without the permission of the publisher is unlawful, so', 63.5, 489, 11, true, 485),
      item('must be obtained by contacting the publisher. Thank you for your support', 67.6, 471, 11, true, 476.5),
    ]);
    expect(texts(lines, 3, 11, 612)).toHaveLength(1);
  });

  it('keeps short centered lines (front-matter links) apart', () => {
    const lines = toLines([
      item('Begin Reading', 260.3, 608, 15, true, 91.5),
      item('Table of Contents', 253.5, 582.8, 15, true, 104.8),
      item('In accordance with the Copyright Act, the scanning and sharing of any part of', 57.9, 557.3, 11, true, 496),
      item('this book without the permission of the publisher is unlawful, so', 63.5, 539.3, 11, true, 485),
    ]);
    expect(texts(lines, 3, 15, 612)).toEqual([
      'p:Begin Reading',
      'p:Table of Contents',
      'p:In accordance with the Copyright Act, the scanning and sharing of any part of this book without the permission of the publisher is unlawful, so',
    ]);
  });
});

describe('dropRunningLines', () => {
  it('removes a footer repeated near the page edge on many pages, keeping body text', () => {
    const page = (n: number) => ({
      width: 612,
      height: 792,
      lines: toLines([item(`Body text ${n}`, 72, 400, 10, true), item('https://thuviensach.vn', 500, 17, 10, true), item(`Page ${n}`, 300, 770)]),
    });
    const pages = dropRunningLines([1, 2, 3, 4].map(page));
    expect(pages.map((p) => p.map((l) => l.text))).toEqual([1, 2, 3, 4].map((n) => [`Body text ${n}`]));
  });
});
