import { keptLength } from './ranges';
import type { Annotations, Chapter, ChapterProgress } from './types';

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

export interface BookStats {
  doneChapters: number;
  startedChapters: number;
  /** Share of the read text still kept, or null when nothing is read. */
  keptPct: number | null;
  notes: number;
}

/** Library-row numbers, computed from annotations alone (no need to load the book text). */
export function bookStats(ann: Annotations | undefined): BookStats {
  if (!ann) return { doneChapters: 0, startedChapters: 0, keptPct: null, notes: 0 };
  let read = 0;
  let kept = 0;
  let done = 0;
  let started = 0;
  for (const [id, p] of Object.entries(ann.progress)) {
    if (p.done) done++;
    if (p.done || p.furthestEnd > 0) started++;
    read += p.furthestEnd;
    kept += keptLength(ann.deleted[id] ?? [], p.furthestEnd);
  }
  return {
    doneChapters: done,
    startedChapters: started,
    keptPct: read > 0 ? Math.round((kept / read) * 100) : null,
    notes: ann.notes.filter((n) => n.text.trim()).length,
  };
}

/** "vừa xong", "5 phút trước", "hôm qua", "3 ngày trước", or a date. */
export function relativeTime(at: number, now = Date.now()): string {
  const minutes = Math.floor((now - at) / 60000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hôm qua';
  if (days < 7) return `${days} ngày trước`;
  return new Date(at).toLocaleDateString('vi-VN');
}
