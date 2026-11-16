import { blockEnd } from './chapter';
import { segmentsOf, type Segment } from './ranges';
import type { Annotations, Block, Book, Note } from './types';

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
      for (const n of notes) {
        if (n.at === undefined && n.afterBlock === after) items.push({ kind: 'note', block: Math.max(after, 0), text: n.text, noteId: n.id });
      }
    };
    pushNotes(-1);
    chapter.blocks.forEach((b, i) => {
      const inline = notes.filter((n) => n.at !== undefined && n.afterBlock === i).sort((x, y) => x.at! - y.at!);
      if (i <= lastRead || inline.length) {
        const text = keptWithInline(b, segmentsOf(ranges, b.start, blockEnd(b)), inline);
        const repeatsTitle = b.kind === 'h' && b.text === chapter.title;
        if (text && !repeatsTitle) items.push({ kind: 'kept', block: i, text, heading: b.kind === 'h' });
      }
      pushNotes(i);
    });

    const hasContent = items.some((it) => it.kind === 'note' || !it.heading);
    if (hasContent) out.push({ chapterIndex, title: chapter.title, items });
  });
  return out;
}

/** A paragraph's kept text with your inline text set in as *(…)* and cuts shown as "…". */
function keptWithInline(b: Block, segments: Segment[], inline: Note[]): string {
  const parts: string[] = [];
  let next = 0;
  let cut = false;
  for (const seg of segments) {
    while (next < inline.length && inline[next].at! <= seg.start) parts.push(`*(${inline[next++].text.trim()})*`);
    if (seg.deleted) {
      cut = parts.length > 0;
      continue;
    }
    if (cut) parts.push('…');
    cut = false;
    parts.push(b.text.slice(seg.start - b.start, seg.end - b.start).trim());
  }
  while (next < inline.length) parts.push(`*(${inline[next++].text.trim()})*`);
  return parts.filter(Boolean).join(' ');
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
