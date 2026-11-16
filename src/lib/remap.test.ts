import { describe, expect, it } from 'vitest';
import { makeChapter, type RawBlock } from './chapter';
import { remapAnnotations } from './remap';
import { emptyAnnotations, type Book, type Chapter } from './types';

const p = (text: string): RawBlock => ({ kind: 'p', text });
const book = (chapters: Chapter[]): Book => ({ id: 'b', title: 'T', format: 'pdf', addedAt: 0, chapterCount: chapters.length, chapters });
const slice = (ch: Chapter, [a, b]: [number, number]) => ch.blocks.map((x) => x.text).join('').slice(a, b);

const toc = '1. Lời giới thiệu 2. Lời mở đầu 3. Phần một';
const body1 = 'Làng Bollingen nằm gần bờ bắc Hồ Zurich. Năm 1922 Carl Jung chọn nơi này để xây nhà ở ẩn.';
const footer = 'https://thuviensach.vn';
const body2 = 'Ông viết mỗi sáng trong văn phòng riêng. Buổi chiều ông đi bộ quanh hồ.';

// Old parse: TOC glued into one paragraph, footer in the text, everything in one chapter.
const oldBook = book([makeChapter('c0', 'Mở đầu', [p(toc), p(body1), p(footer), p(body2)])]);
// New parse: TOC split, footer gone, body moved to its own chapter.
const newBook = book([
  makeChapter('c0', 'Mở đầu', [p('1. Lời giới thiệu'), p('2. Lời mở đầu'), p('3. Phần một')]),
  makeChapter('c1', 'Lời mở đầu', [p(body1), p(body2)]),
]);

describe('remapAnnotations', () => {
  it('re-finds deletions, notes and progress in a differently split parse', () => {
    const old = oldBook.chapters[0];
    const text = old.blocks.map((b) => b.text).join('');
    const ann = emptyAnnotations('b');
    const cut = text.indexOf('Năm 1922');
    ann.deleted.c0 = [[cut, cut + 'Năm 1922 Carl Jung chọn nơi này'.length]];
    ann.notes.push({ id: 'n1', chapterId: 'c0', afterBlock: 1, text: 'Ý của tôi', createdAt: 1 });
    ann.progress.c0 = { furthestBlock: 1, furthestEnd: old.blocks[1].start + old.blocks[1].text.length, done: false };
    ann.lastChapter = 0;

    const { ann: out, report } = remapAnnotations(oldBook, newBook, ann);

    expect(report).toEqual({ deletionsKept: 1, deletionsGone: 0, deletionsLost: 0, notesKept: 1, notesApprox: 0 });
    expect(out.deleted.c0).toBeUndefined();
    expect(out.deleted.c1).toHaveLength(1);
    expect(slice(newBook.chapters[1], out.deleted.c1[0])).toBe('Năm 1922 Carl Jung chọn nơi này');
    expect(out.notes).toEqual([{ id: 'n1', chapterId: 'c1', afterBlock: 0, text: 'Ý của tôi', createdAt: 1 }]);
    expect(out.progress.c0.done).toBe(true);
    expect(out.progress.c1).toMatchObject({ furthestBlock: 0, done: false });
  });

  it('reports a deletion of text the new parse dropped (a footer) as gone, and keeps notes placed', () => {
    const ann = emptyAnnotations('b');
    const text = oldBook.chapters[0].blocks.map((b) => b.text).join('');
    const at = text.indexOf(footer);
    ann.deleted.c0 = [[at, at + footer.length]];
    ann.notes.push({ id: 'n2', chapterId: 'c0', afterBlock: 2, text: 'Sau chân trang', createdAt: 2 });

    const { ann: out, report } = remapAnnotations(oldBook, newBook, ann);
    expect(report.deletionsGone).toBe(1);
    expect(report.deletionsLost).toBe(0);
    expect(report.notesKept + report.notesApprox).toBe(1);
    expect(out.notes).toHaveLength(1);
  });
});
