import { blockEnd } from './chapter';
import { addRange } from './ranges';
import { emptyAnnotations, type Annotations, type Book, type Chapter, type Note } from './types';

/**
 * Carries annotations from one parse of a book to a new parse of the same original.
 * Positions are re-found by their surrounding text (whitespace ignored), so changes in
 * paragraph splitting, dropped footers or chapter boundaries do not lose them.
 */
export interface RemapReport {
  deletionsKept: number;
  /** The deleted text is not in the new parse at all, so there is nothing left to delete. */
  deletionsGone: number;
  deletionsLost: number;
  notesKept: number;
  /** Notes whose anchor text was not found; placed at the same relative position instead. */
  notesApprox: number;
}

interface Flat {
  text: string;
  bases: number[];
  sk: string;
  /** text offset -> number of non-space characters before it */
  skOf: Int32Array;
  /** skeleton index -> text offset */
  textOf: Int32Array;
}

function flatten(book: Book): Flat {
  const bases: number[] = [];
  let text = '';
  for (const ch of book.chapters) {
    bases.push(text.length);
    text += ch.blocks.map((b) => b.text).join('');
  }
  const skOf = new Int32Array(text.length + 1);
  const textOf: number[] = [];
  const chars: string[] = [];
  for (let i = 0; i < text.length; i++) {
    skOf[i] = chars.length;
    if (!/\s/.test(text[i])) {
      textOf.push(i);
      chars.push(text[i]);
    }
  }
  skOf[text.length] = chars.length;
  return { text, bases, sk: chars.join(''), skOf, textOf: Int32Array.from(textOf) };
}

const ANCHORS = [32, 12];

class PointMapper {
  private drift = 0;
  constructor(private from: Flat, private to: Flat) {}

  /** 'after': pos starts the text that follows it. 'before': pos ends the text before it. */
  map(pos: number, side: 'after' | 'before'): number | null {
    const k = this.from.skOf[pos];
    for (const len of ANCHORS) {
      const start = side === 'after' ? k : Math.max(0, k - len);
      const needle = this.from.sk.slice(start, side === 'after' ? k + len : k);
      if (!needle) return side === 'after' ? this.to.text.length : 0;
      const at = nearest(this.to.sk, needle, start + this.drift);
      if (at < 0) continue;
      if (needle.length >= 16) this.drift = at - start;
      return side === 'after' ? this.to.textOf[at] : this.to.textOf[at + needle.length - 1] + 1;
    }
    return null;
  }

  ratio(pos: number): number {
    return this.from.text.length ? Math.round((pos / this.from.text.length) * this.to.text.length) : 0;
  }
}

function nearest(hay: string, needle: string, expected: number): number {
  let best = -1;
  let bestDistance = Infinity;
  for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + 1)) {
    const d = Math.abs(i - expected);
    if (d < bestDistance) [best, bestDistance] = [i, d];
    else if (i > expected) break;
  }
  return best;
}

function chapterAt(flat: Flat, pos: number, preferPrevious = false): number {
  let index = 0;
  for (let i = 0; i < flat.bases.length; i++) {
    if (flat.bases[i] < pos || (!preferPrevious && flat.bases[i] === pos)) index = i;
  }
  return index;
}

/** Index of the block containing local offset `at` (the one ending at or after it). */
function blockAt(ch: Chapter, at: number): number {
  const i = ch.blocks.findIndex((b) => blockEnd(b) >= at);
  return i === -1 ? ch.blocks.length - 1 : i;
}

export function remapAnnotations(oldBook: Book, newBook: Book, ann: Annotations): { ann: Annotations; report: RemapReport } {
  const from = flatten(oldBook);
  const to = flatten(newBook);
  const out = emptyAnnotations(newBook.id);
  const report: RemapReport = { deletionsKept: 0, deletionsGone: 0, deletionsLost: 0, notesKept: 0, notesApprox: 0 };

  // Deletions: re-find each range's start and end, then split it over the new chapters.
  const ranges = oldBook.chapters
    .flatMap((ch, i) => (ann.deleted[ch.id] ?? []).map(([a, b]) => [from.bases[i] + a, from.bases[i] + b] as const))
    .sort((x, y) => x[0] - y[0]);
  const points = new PointMapper(from, to);
  for (const [a, b] of ranges) {
    const s = points.map(a, 'after');
    const e = points.map(b, 'before');
    if (s === null || e === null || e <= s || e - s > (b - a) * 1.5 + 300) {
      // Text the new parse dropped by itself (a footer, say) needs no deletion any more.
      const gone = !to.sk.includes(from.sk.slice(from.skOf[a], Math.min(from.skOf[b], from.skOf[a] + 24)));
      if (gone) report.deletionsGone++;
      else report.deletionsLost++;
      continue;
    }
    report.deletionsKept++;
    newBook.chapters.forEach((ch, i) => {
      const lo = Math.max(s, to.bases[i]) - to.bases[i];
      const hi = Math.min(e, to.bases[i] + ch.length) - to.bases[i];
      if (hi > lo) out.deleted[ch.id] = addRange(out.deleted[ch.id] ?? [], [lo, hi]);
    });
  }

  // Own paragraphs: anchored to the end of the block they follow (or the start of the chapter).
  const notePoints = new PointMapper(from, to);
  const oldIndex = new Map(oldBook.chapters.map((ch, i) => [ch.id, i]));
  const notes = [...ann.notes].sort((x, y) => notePos(x) - notePos(y));
  function notePos(n: Note): number {
    const i = oldIndex.get(n.chapterId) ?? 0;
    if (n.at !== undefined) return from.bases[i] + n.at;
    const block = oldBook.chapters[i]?.blocks[n.afterBlock];
    return from.bases[i] + (block ? blockEnd(block) : 0);
  }
  for (const n of notes) {
    // Inline text and paragraphs after a block are found by the text before them.
    const before = n.at !== undefined || n.afterBlock >= 0;
    let pos = notePoints.map(notePos(n), before ? 'before' : 'after');
    if (pos === null) {
      report.notesApprox++;
      pos = notePoints.ratio(notePos(n));
    } else report.notesKept++;
    const ci = chapterAt(to, pos, before);
    const ch = newBook.chapters[ci];
    const local = pos - to.bases[ci];
    if (n.at !== undefined) {
      out.notes.push({ ...n, chapterId: ch.id, afterBlock: blockAt(ch, local), at: local });
      continue;
    }
    const afterBlock = before ? blockAt(ch, local) : blockAt(ch, local + 1) - 1;
    out.notes.push({ ...n, chapterId: ch.id, afterBlock });
  }

  // Progress: map each read stretch, then see how far it reaches into each new chapter.
  const progPoints = new PointMapper(from, to);
  const read: [number, number][] = [];
  oldBook.chapters.forEach((ch, i) => {
    const p = ann.progress[ch.id];
    if (!p || (!p.done && p.furthestEnd <= 0)) return;
    const a = from.bases[i];
    const b = a + (p.done ? ch.length : p.furthestEnd);
    read.push([progPoints.map(a, 'after') ?? progPoints.ratio(a), progPoints.map(b, 'before') ?? progPoints.ratio(b)]);
  });
  newBook.chapters.forEach((ch, i) => {
    const base = to.bases[i];
    let reached = 0;
    for (const [s, e] of read) if (e > base && s < base + ch.length) reached = Math.max(reached, Math.min(e, base + ch.length) - base);
    if (reached <= 0 || !ch.blocks.length) return;
    const done = reached >= ch.length - 1;
    const furthestBlock = done ? ch.blocks.length - 1 : blockAt(ch, reached);
    out.progress[ch.id] = { furthestBlock, furthestEnd: blockEnd(ch.blocks[furthestBlock]), done };
  });

  const last = oldBook.chapters[ann.lastChapter] ? from.bases[ann.lastChapter] : 0;
  out.lastChapter = chapterAt(to, progPoints.map(last, 'after') ?? progPoints.ratio(last));
  return { ann: out, report };
}
