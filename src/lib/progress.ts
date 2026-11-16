import { keptLength } from './ranges';
import type { Annotations, Book, Chapter, ChapterProgress } from './types';

export interface ChapterStatus {
  /** "12/30 trang" for PDF, "45%" for EPUB; empty when not started. */
  readLabel: string;
  fraction: number;
  /** Share of the read part still kept, or null when nothing is read. */
  keptPct: number | null;
  done: boolean;
  started: boolean;
}

export function chapterStatus(chapter: Chapter, prog: ChapterProgress | undefined, ann: Annotations, isPdf: boolean): ChapterStatus {
  const end = prog?.furthestEnd ?? 0;
  const done = prog?.done ?? false;
  const fraction = done ? 1 : chapter.length ? end / chapter.length : 0;
  const keptPct = end > 0 ? Math.round((keptLength(ann.deleted[chapter.id] ?? [], end) / end) * 100) : null;

  let readLabel = '';
  if (end > 0 || done) {
    if (isPdf) {
      const first = chapter.blocks[0]?.page ?? 1;
      const last = chapter.blocks[chapter.blocks.length - 1]?.page ?? first;
      const reached = done ? last : (chapter.blocks[prog?.furthestBlock ?? 0]?.page ?? first);
      readLabel = `${reached - first + 1}/${last - first + 1} trang`;
    } else readLabel = `${Math.round(fraction * 100)}%`;
  }
  return { readLabel, fraction, keptPct, done, started: end > 0 || done };
}

export function bookSummary(book: Pick<Book, 'chapterCount'>, ann: Annotations | undefined): string {
  if (!ann) return 'Chưa đọc';
  const progress = Object.values(ann.progress);
  const done = progress.filter((p) => p.done).length;
  const started = progress.filter((p) => p.furthestEnd > 0 || p.done).length;
  if (!started) return 'Chưa đọc';
  const notes = ann.notes.length ? ` · ${ann.notes.length} đoạn của tôi` : '';
  return `${done}/${book.chapterCount} chương xong${notes}`;
}
