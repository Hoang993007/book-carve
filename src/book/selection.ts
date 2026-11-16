import type { Chapter, TextRange } from '../lib/types';

/**
 * Book text lives in spans carrying `data-s` (start offset inside the chapter), each
 * inside a section carrying `data-chapter`. These helpers map browser selections and
 * pointer positions back to chapter offsets.
 */
export interface ChapterRange {
  chapterId: string;
  range: TextRange;
}

interface Point {
  chapterId: string;
  offset: number;
}

const chapterOf = (el: Element) => el.closest<HTMLElement>('[data-chapter]')?.dataset.chapter ?? null;

function pointOf(root: HTMLElement, node: Node, offset: number): Point | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const span = node.parentElement?.closest<HTMLElement>('[data-s]');
    const chapterId = span && root.contains(span) ? chapterOf(span) : null;
    if (span && chapterId) return { chapterId, offset: Number(span.dataset.s) + Math.min(offset, span.textContent?.length ?? 0) };
  }
  const probe = document.createRange();
  probe.setStart(node, offset);
  probe.collapse(true);
  let last: Point | null = null;
  for (const span of Array.from(root.querySelectorAll<HTMLElement>('[data-s]'))) {
    const chapterId = chapterOf(span);
    if (!chapterId) continue;
    // comparePoint >= 0: the span starts at or after the boundary.
    if (probe.comparePoint(span, 0) >= 0) return { chapterId, offset: Number(span.dataset.s) };
    last = { chapterId, offset: Number(span.dataset.s) + (span.textContent?.length ?? 0) };
  }
  return last;
}

/** The current selection as one range per chapter it covers. Chapters not on screen are skipped. */
export function selectionRanges(root: HTMLElement, chapters: Chapter[]): ChapterRange[] {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return [];
  const r = sel.getRangeAt(0);
  if (!root.contains(r.commonAncestorContainer)) return [];
  const a = pointOf(root, r.startContainer, r.startOffset);
  const b = pointOf(root, r.endContainer, r.endOffset);
  if (!a || !b) return [];
  const ia = chapters.findIndex((c) => c.id === a.chapterId);
  const ib = chapters.findIndex((c) => c.id === b.chapterId);
  if (ia < 0 || ib < ia) return [];

  const out: ChapterRange[] = [];
  for (let i = ia; i <= ib; i++) {
    const ch = chapters[i];
    if (!root.querySelector(`[data-chapter="${ch.id}"] [data-s]`)) continue;
    const start = i === ia ? a.offset : 0;
    const end = i === ib ? b.offset : ch.length;
    if (end > start) out.push({ chapterId: ch.id, range: [start, end] });
  }
  return out;
}

export interface BlockRef {
  chapterId: string;
  block: number;
}

function blockRefOf(el: Element | null | undefined): BlockRef | null {
  const block = el?.closest<HTMLElement>('[data-block]');
  const chapterId = block ? chapterOf(block) : null;
  return block && chapterId ? { chapterId, block: Number(block.dataset.block) } : null;
}

/** The block under the pointer, else the last block above it. */
export function blockAtPointer(root: HTMLElement, target: EventTarget | null, clientY: number): BlockRef | null {
  const direct = blockRefOf(target as Element | null);
  if (direct) return direct;
  let found: BlockRef | null = null;
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-block]'))) {
    if (el.getBoundingClientRect().top > clientY) break;
    found = blockRefOf(el);
  }
  return found;
}

/** The block where the selection (or caret) ends. */
export function blockAtSelection(root: HTMLElement): BlockRef | null {
  const sel = window.getSelection();
  const node = sel?.focusNode;
  if (!node || !root.contains(node)) return null;
  return blockRefOf(node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element));
}
