import type { RawBlock } from '../lib/chapter';

/** One text run from pdf.js, in page coordinates (y grows upward). */
export interface PdfItem {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
  eol: boolean;
}

export interface PdfLine {
  text: string;
  x: number;
  right: number;
  y: number;
  /** Height of most of the line's characters, so a drop cap does not make it a heading. */
  h: number;
}

export interface PdfPage {
  lines: PdfLine[];
  width: number;
  height: number;
}

/** A line that starts a list item: "1.", "12)", "a.", "•", "-", "–". */
const LIST_START = /^(\d{1,3}[.)]|[a-zA-Z][.)]|[•●▪◦‣\-–—*])\s/;

/** Groups text runs into visual lines. */
export function toLines(items: PdfItem[]): PdfLine[] {
  const lines: { text: string; x: number; right: number; y: number; heights: Map<number, number> }[] = [];
  let current: (typeof lines)[number] | null = null;
  let breakNext = false;
  for (const it of items) {
    const tallest = current ? Math.max(...current.heights.keys(), 0) : 0;
    const sameLine = current && !breakNext && Math.abs(it.y - current.y) <= Math.max(tallest, it.h) * 0.5;
    if (!current || !sameLine) {
      current = { text: '', x: it.x, right: it.x, y: it.y, heights: new Map() };
      lines.push(current);
    }
    current.text += it.str;
    if (it.str.trim()) {
      current.right = Math.max(current.right, it.x + it.w);
      const h = Math.round(it.h * 10) / 10;
      current.heights.set(h, (current.heights.get(h) ?? 0) + it.str.length);
    }
    breakNext = it.eol;
  }
  return lines
    .map((l) => ({ text: l.text.replace(/\s+/g, ' ').trim(), x: l.x, right: l.right, y: l.y, h: dominant(l.heights) }))
    .filter((l) => l.text && !/^\d{1,4}$/.test(l.text));
}

function dominant(heights: Map<number, number>): number {
  let best = 0;
  let count = -1;
  for (const [h, n] of heights) if (n > count) [best, count] = [h, n];
  return best;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/**
 * Drops running headers and footers: lines near the top or bottom edge whose text
 * (digits ignored) repeats on many pages, like a site URL or the book title.
 */
export function dropRunningLines(pages: PdfPage[]): PdfLine[][] {
  const key = (l: PdfLine) => l.text.replace(/\d+/g, '#').toLowerCase();
  const nearEdge = (l: PdfLine, p: PdfPage) => p.height > 0 && (l.y > p.height * 0.88 || l.y < p.height * 0.12);
  const counts = new Map<string, number>();
  for (const p of pages) {
    for (const k of new Set(p.lines.filter((l) => nearEdge(l, p)).map(key))) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const threshold = Math.max(3, pages.length * 0.3);
  return pages.map((p) => p.lines.filter((l) => !(nearEdge(l, p) && (counts.get(key(l)) ?? 0) >= threshold)));
}

/** Joins the lines of one page into paragraphs and headings. `bodySize` is the usual text height. */
export function toParagraphs(lines: PdfLine[], page: number, bodySize: number, pageWidth = 0): RawBlock[] {
  if (!lines.length) return [];
  const gaps = lines.slice(1).map((l, i) => lines[i].y - l.y).filter((g) => g > 0);
  const lineGap = median(gaps) || bodySize * 1.2;
  const left = Math.min(...lines.map((l) => l.x));
  const right = Math.max(...lines.map((l) => l.right));
  const textWidth = right - left;
  const isHeading = (l: PdfLine) => bodySize > 0 && l.h > bodySize * 1.2 && l.text.length < 120;
  const centered = (l: PdfLine) => pageWidth > 0 && Math.abs((l.x + l.right) / 2 - pageWidth / 2) < bodySize;
  // A line that stops well before the right edge ends its paragraph (list entries, last lines).
  const endsShort = (l: PdfLine) => textWidth > 0 && right - l.right > textWidth * 0.3;

  const out: RawBlock[] = [];
  let cur: RawBlock | null = null;
  let prev: PdfLine | null = null;
  for (const line of lines) {
    const heading = isHeading(line);
    const bothCentered = prev !== null && centered(prev) && centered(line);
    const startsNew =
      !cur ||
      !prev ||
      heading !== (cur.kind === 'h') ||
      prev.y - line.y > lineGap * 1.4 ||
      prev.y - line.y < 0 ||
      LIST_START.test(line.text) ||
      endsShort(prev) ||
      (!heading && !bothCentered && line.x - left > bodySize * 0.8);
    if (startsNew) {
      if (cur) out.push(cur);
      cur = { kind: heading ? 'h' : 'p', text: line.text, page };
    } else if (cur) {
      cur.text = joinLine(cur.text, line.text);
    }
    prev = line;
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Mends paragraphs cut by a page break: when a page ends mid-sentence and the next page
 * starts with a lowercase word, the two pieces are one paragraph.
 */
export function joinAcrossPages(pages: RawBlock[][]): RawBlock[] {
  const out: RawBlock[] = [];
  for (const page of pages) {
    page.forEach((block, i) => {
      const prev = out[out.length - 1];
      const continues =
        i === 0 && prev && prev.kind === 'p' && block.kind === 'p' && !/[.!?…:;”"»)\]]$/.test(prev.text) && /^[a-zà-ỹđ(“"«]/.test(block.text);
      if (continues) out[out.length - 1] = { ...prev, text: joinLine(prev.text, block.text) };
      else out.push(block);
    });
  }
  return out;
}

function joinLine(text: string, next: string): string {
  if (/[A-Za-zÀ-ỹ]-$/.test(text) && /^[a-zà-ỹ]/.test(next)) return text.slice(0, -1) + next;
  return `${text} ${next}`;
}
