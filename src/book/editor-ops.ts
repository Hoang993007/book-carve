import { blockEnd } from '../lib/chapter';
import type { Chapter, TextRange } from '../lib/types';

/**
 * Text-editor moves over book text that can only be hidden, never changed. A caret sits
 * at a chapter offset inside one block; Backspace/Delete hide the nearest visible
 * character (or word) and never cross into another paragraph.
 */
const isDeleted = (ranges: TextRange[], i: number) => ranges.some(([a, b]) => i >= a && i < b);
const isSpace = (ch: string) => /\s/.test(ch);

export function chapterText(chapter: Chapter): string {
  return chapter.blocks.map((b) => b.text).join('');
}

/** What Backspace (word: Ctrl+Backspace) at `offset` hides, or null at the start of the paragraph. */
export function backwardRange(chapter: Chapter, text: string, ranges: TextRange[], block: number, offset: number, word: boolean): TextRange | null {
  const start = chapter.blocks[block].start;
  let q = offset - 1;
  while (q >= start && isDeleted(ranges, q)) q--;
  if (q < start) return null;
  if (!word) return [q, q + 1];
  const visible = (i: number) => !isDeleted(ranges, i);
  while (q >= start && (!visible(q) || isSpace(text[q]))) q--;
  while (q >= start && (!visible(q) || !isSpace(text[q]))) q--;
  return [q + 1, offset];
}

/** What Delete (word: Ctrl+Delete) at `offset` hides, or null at the end of the paragraph. */
export function forwardRange(chapter: Chapter, text: string, ranges: TextRange[], block: number, offset: number, word: boolean): TextRange | null {
  const end = blockEnd(chapter.blocks[block]);
  let q = offset;
  while (q < end && isDeleted(ranges, q)) q++;
  if (q >= end) return null;
  if (!word) return [q, q + 1];
  const visible = (i: number) => !isDeleted(ranges, i);
  while (q < end && (!visible(q) || isSpace(text[q]))) q++;
  while (q < end && (!visible(q) || !isSpace(text[q]))) q++;
  return [offset, q];
}
