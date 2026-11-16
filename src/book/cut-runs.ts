import { blockEnd } from '../lib/chapter';
import type { Chapter, Note, TextRange } from '../lib/types';

/** Cuts shorter than this leave no "⋯" behind. */
export const MARKER_MIN_CHARS = 20;

const long = (r: TextRange) => r[1] - r[0] >= MARKER_MIN_CHARS;

/** Chapter offset where a note shows up. */
export const notePos = (ch: Chapter, n: Note) => n.at ?? (n.afterBlock < 0 ? 0 : blockEnd(ch.blocks[n.afterBlock]));

/** Cuts as the reader sees them: cuts with only blank text and none of your own text between read as one. */
export function shownCuts(ch: Chapter, ranges: TextRange[], notes: Note[]): TextRange[] {
  if (ranges.length < 2) return ranges;
  const text = ch.blocks.map((b) => b.text).join('');
  const pos = notes.map((n) => notePos(ch, n));
  const out: TextRange[] = [];
  for (const [a, b] of ranges) {
    const last = out[out.length - 1];
    const blank = last && !text.slice(last[1], a).trim() && !pos.some((p) => p >= last[1] && p <= a);
    if (blank) last[1] = b;
    else out.push([a, b]);
  }
  return out;
}

/** The cut a chapter opens with (nothing visible before it) and the cut it ends with (nothing visible after). */
export interface CutEdges {
  lead: TextRange | null;
  tail: TextRange | null;
}

export function cutEdges(ch: Chapter, shown: TextRange[], notes: Note[], titleShown: boolean): CutEdges {
  const pos = notes.map((n) => notePos(ch, n));
  const first = shown[0];
  const last = shown[shown.length - 1];
  return {
    lead: !titleShown && first && first[0] === 0 && !pos.some((p) => p <= 0) ? first : null,
    tail: last && last[1] >= ch.length && !pos.some((p) => p > last[0]) ? last : null,
  };
}

export const cutKey = (chapterId: string, start: number) => `${chapterId}:${start}`;

export interface CutRuns {
  /** Chapters whose opening cut continues the previous chapter's: no "⋯" of their own. */
  hideLead: Set<string>;
  /** Chapters whose closing cut runs on into the next chapter: no gap after them. */
  joinsNext: Set<string>;
  /** Marker key → the cuts in later chapters that open and close with it. */
  followers: Map<string, { chapterId: string; start: number }[]>;
}

/**
 * Joins cuts across chapter breaks: a chapter that ends hidden, followed by one that starts
 * hidden (title included), shows a single "⋯" for both. `edges` is null for chapters that
 * show anything at their edges regardless (folded, or the original view).
 */
export function planCutRuns(chapters: { id: string; edges: CutEdges | null }[]): CutRuns {
  const runs: CutRuns = { hideLead: new Set(), joinsNext: new Set(), followers: new Map() };
  let carry: { chapterId: string; marker: string | null } | null = null;
  for (const { id, edges } of chapters) {
    const lead = edges?.lead ?? null;
    let leadMarker = lead && long(lead) ? cutKey(id, lead[0]) : null;
    if (carry && lead) {
      runs.joinsNext.add(carry.chapterId);
      if (carry.marker) {
        runs.hideLead.add(id);
        const list = runs.followers.get(carry.marker) ?? [];
        list.push({ chapterId: id, start: lead[0] });
        runs.followers.set(carry.marker, list);
        leadMarker = carry.marker;
      }
    }
    const tail = edges?.tail ?? null;
    if (!tail) carry = null;
    else carry = { chapterId: id, marker: tail === lead ? leadMarker : long(tail) ? cutKey(id, tail[0]) : null };
  }
  return runs;
}
