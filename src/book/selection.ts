import type { TextRange } from '../lib/types';

/**
 * Maps the current browser selection inside `root` to a chapter character range.
 * Book text lives in spans carrying `data-s` (their start offset); anything else
 * (notes, collapsed markers) is resolved to the nearest book span.
 */
export function selectionRange(root: HTMLElement): TextRange | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const r = sel.getRangeAt(0);
  if (!root.contains(r.commonAncestorContainer)) return null;
  const a = boundary(root, r.startContainer, r.startOffset);
  const b = boundary(root, r.endContainer, r.endOffset);
  return a !== null && b !== null && b > a ? [a, b] : null;
}

function boundary(root: HTMLElement, node: Node, offset: number): number | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const span = node.parentElement?.closest<HTMLElement>('[data-s]');
    if (span && root.contains(span)) return Number(span.dataset.s) + Math.min(offset, span.textContent?.length ?? 0);
  }
  const point = document.createRange();
  point.setStart(node, offset);
  point.collapse(true);
  let lastEnd: number | null = null;
  for (const span of Array.from(root.querySelectorAll<HTMLElement>('[data-s]'))) {
    // comparePoint >= 0: the span starts at or after the selection boundary.
    if (point.comparePoint(span, 0) >= 0) return Number(span.dataset.s);
    lastEnd = Number(span.dataset.s) + (span.textContent?.length ?? 0);
  }
  return lastEnd;
}

/** The block a right-click belongs to: the one under the pointer, else the last one above it. */
export function blockAt(root: HTMLElement, target: EventTarget | null, clientY: number): number {
  const direct = (target as Element | null)?.closest?.<HTMLElement>('[data-block]');
  if (direct && root.contains(direct)) return Number(direct.dataset.block);
  let found = -1;
  for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-block]'))) {
    if (el.getBoundingClientRect().top <= clientY) found = Number(el.dataset.block);
    else break;
  }
  return found;
}
