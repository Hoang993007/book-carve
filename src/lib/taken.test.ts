import { describe, expect, it } from 'vitest';
import { toMarkdown } from '../export/export-markdown';
import { makeChapter } from './chapter';
import { foldForSearch, takenChapters } from './taken';
import { emptyAnnotations, type Annotations, type Book } from './types';

const ch0 = makeChapter('c0', 'Một', [
  { kind: 'p', text: 'Chuyện kể dài dòng. ' },
  { kind: 'p', text: 'Ý chính ở đây.' },
  { kind: 'p', text: 'Chưa đọc tới.' },
]);
const ch1 = makeChapter('c1', 'Hai', [{ kind: 'p', text: 'Chương chưa mở.' }]);
const book: Book = { id: 'b', title: 'Sách', format: 'epub', addedAt: 0, chapterCount: 2, chapters: [ch0, ch1] };

function annotated(): Annotations {
  const a = emptyAnnotations('b');
  a.deleted.c0 = [[0, ch0.blocks[1].start]];
  a.progress.c0 = { furthestBlock: 1, furthestEnd: ch0.blocks[1].start + ch0.blocks[1].text.length, done: false };
  a.notes.push({ id: 'n1', chapterId: 'c0', afterBlock: 1, text: 'Dùng cho journal\nchi tiết', createdAt: 1 });
  return a;
}

describe('takenChapters', () => {
  it('keeps only read, undeleted text plus own paragraphs, and skips unread chapters', () => {
    expect(takenChapters(book, annotated())).toEqual([
      {
        chapterIndex: 0,
        title: 'Một',
        items: [
          { kind: 'kept', block: 1, text: 'Ý chính ở đây.', heading: false },
          { kind: 'note', block: 1, text: 'Dùng cho journal\nchi tiết', noteId: 'n1' },
        ],
      },
    ]);
  });

  it('exports the same content as Markdown with own paragraphs quoted', () => {
    expect(toMarkdown(book, annotated())).toBe('# Sách\n\n## Một\n\nÝ chính ở đây.\n\n> Dùng cho journal\n> chi tiết\n');
  });
});

describe('foldForSearch', () => {
  it('ignores case and Vietnamese diacritics while keeping length', () => {
    const s = 'Đường Thói QUEN';
    expect(foldForSearch(s)).toBe('duong thoi quen');
    expect(foldForSearch(s)).toHaveLength(s.normalize('NFC').length);
  });
});
