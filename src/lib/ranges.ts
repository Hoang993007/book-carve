import type { TextRange } from './types';

/** Adds [a, b) to a sorted, disjoint list, merging anything it touches. */
export function addRange(ranges: TextRange[], [a, b]: TextRange): TextRange[] {
  if (b <= a) return ranges;
  const out: TextRange[] = [];
  let s = a;
  let e = b;
  let placed = false;
  for (const [x, y] of ranges) {
    if (y < s) out.push([x, y]);
    else if (x > e) {
      if (!placed) {
        out.push([s, e]);
        placed = true;
      }
      out.push([x, y]);
    } else {
      s = Math.min(s, x);
      e = Math.max(e, y);
    }
  }
  if (!placed) out.push([s, e]);
  return out;
}

/** Removes [a, b) from the list, splitting ranges that straddle it. */
export function removeRange(ranges: TextRange[], [a, b]: TextRange): TextRange[] {
  const out: TextRange[] = [];
  for (const [x, y] of ranges) {
    if (y <= a || x >= b) {
      out.push([x, y]);
      continue;
    }
    if (x < a) out.push([x, a]);
    if (y > b) out.push([b, y]);
  }
  return out;
}

export function overlaps(ranges: TextRange[], [a, b]: TextRange): boolean {
  return ranges.some(([x, y]) => x < b && y > a);
}

/** Characters in [0, end) that are not deleted. */
export function keptLength(ranges: TextRange[], end: number): number {
  let removed = 0;
  for (const [x, y] of ranges) {
    const s = Math.max(0, x);
    const e = Math.min(end, y);
    if (e > s) removed += e - s;
  }
  return end - removed;
}

export interface Segment {
  start: number;
  end: number;
  deleted: boolean;
  /** For deleted segments: where the whole deleted range starts (its identity). */
  rangeStart?: number;
}

/** Splits [start, end) into kept and deleted pieces. */
export function segmentsOf(ranges: TextRange[], start: number, end: number): Segment[] {
  const out: Segment[] = [];
  let cursor = start;
  for (const [x, y] of ranges) {
    if (y <= start || x >= end) continue;
    if (x > cursor) out.push({ start: cursor, end: x, deleted: false });
    const s = Math.max(x, start);
    const e = Math.min(y, end);
    out.push({ start: s, end: e, deleted: true, rangeStart: x });
    cursor = e;
  }
  if (cursor < end) out.push({ start: cursor, end, deleted: false });
  return out;
}
