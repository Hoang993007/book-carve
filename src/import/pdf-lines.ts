import type { RawBlock } from '../lib/chapter';

/** One text run from pdf.js, in page coordinates (y grows upward). */
export interface PdfItem {
  str: string;
  x: number;
  y: number;
  h: number;
  eol: boolean;
}

export interface PdfLine {
  text: string;
  x: number;
  y: number;
  h: number;
}

/** Groups text runs into visual lines. */
export function toLines(items: PdfItem[]): PdfLine[] {
  const lines: PdfLine[] = [];
  let current: PdfLine | null = null;
  let breakNext = false;
  for (const it of items) {
    const sameLine = current && !breakNext && Math.abs(it.y - current.y) <= Math.max(current.h, it.h) * 0.5;
    if (!current || !sameLine) {
      if (current) lines.push(current);
      current = { text: it.str, x: it.x, y: it.y, h: it.h };
    } else {
      current.text += it.str;
      current.h = Math.max(current.h, it.h);
    }
    breakNext = it.eol;
  }
  if (current) lines.push(current);
  return lines
    .map((l) => ({ ...l, text: l.text.replace(/\s+/g, ' ').trim() }))
    .filter((l) => l.text && !/^\d{1,4}$/.test(l.text));
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Joins the lines of one page into paragraphs and headings. `bodySize` is the usual text height. */
export function toParagraphs(lines: PdfLine[], page: number, bodySize: number): RawBlock[] {
  const gaps = lines.slice(1).map((l, i) => lines[i].y - l.y).filter((g) => g > 0);
  const lineGap = median(gaps) || bodySize * 1.2;
  const left = Math.min(...lines.map((l) => l.x));
  const isHeading = (l: PdfLine) => bodySize > 0 && l.h > bodySize * 1.2 && l.text.length < 120;

  const out: RawBlock[] = [];
  let cur: RawBlock | null = null;
  let prev: PdfLine | null = null;
  for (const line of lines) {
    const heading = isHeading(line);
    const startsNew =
      !cur ||
      !prev ||
      heading !== (cur.kind === 'h') ||
      prev.y - line.y > lineGap * 1.4 ||
      prev.y - line.y < 0 ||
      (!heading && line.x - left > bodySize * 0.8);
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

function joinLine(text: string, next: string): string {
  if (/[A-Za-zÀ-ỹ]-$/.test(text) && /^[a-zà-ỹ]/.test(next)) return text.slice(0, -1) + next;
  return `${text} ${next}`;
}
