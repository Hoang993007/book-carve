import { blockEnd } from './chapter';
import { segmentsOf } from './ranges';
import type { Annotations, Book } from './types';

export type TakenItem =
  | { kind: 'kept'; block: number; text: string; heading: boolean }
  | { kind: 'note'; block: number; text: string; noteId: string };

export interface TakenChapter {
  chapterIndex: number;
  title: string;
  items: TakenItem[];
}

/**
 * What the reader took from a book: the kept text of the part already read, plus every
 * paragraph they wrote, in book order. Unread, untouched chapters are left out.
 */
export function takenChapters(book: Book, ann: Annotations): TakenChapter[] {
  const out: TakenChapter[] = [];
  book.chapters.forEach((chapter, chapterIndex) => {
    const prog = ann.progress[chapter.id];
    const lastRead = prog?.done ? chapter.blocks.length - 1 : (prog?.furthestEnd ? prog.furthestBlock : -1);
    const ranges = ann.deleted[chapter.id] ?? [];
    const notes = ann.notes
      .filter((n) => n.chapterId === chapter.id && n.text.trim())
      .sort((a, b) => a.afterBlock - b.afterBlock || a.createdAt - b.createdAt);

    const items: TakenItem[] = [];
    const pushNotes = (after: number) => {
      for (const n of notes) if (n.afterBlock === after) items.push({ kind: 'note', block: Math.max(after, 0), text: n.text, noteId: n.id });
    };
    pushNotes(-1);
    chapter.blocks.forEach((b, i) => {
      if (i <= lastRead) {
        const kept = segmentsOf(ranges, b.start, blockEnd(b))
          .filter((s) => !s.deleted)
          .map((s) => b.text.slice(s.start - b.start, s.end - b.start).trim())
          .filter(Boolean);
        const repeatsTitle = b.kind === 'h' && b.text === chapter.title;
        if (kept.length && !repeatsTitle) items.push({ kind: 'kept', block: i, text: kept.join(' … '), heading: b.kind === 'h' });
      }
      pushNotes(i);
    });

    const hasContent = items.some((it) => it.kind === 'note' || !it.heading);
    if (hasContent) out.push({ chapterIndex, title: chapter.title, items });
  });
  return out;
}

/** Lowercase, no Vietnamese diacritics, same length as the NFC input so match indexes line up. */
export function foldForSearch(text: string): string {
  return text
    .normalize('NFC')
    .split('')
    .map((ch) => ch.normalize('NFD').replace(/[̀-ͯ]/g, ''))
    .join('')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
}
