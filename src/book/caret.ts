/**
 * Maps the browser caret to the book model and back. Book text spans carry `data-s`
 * (chapter offset), paragraphs `data-block` and `data-start`, sections `data-chapter`,
 * and the reader's own text `data-note`.
 */
export type Caret =
  | { kind: 'book'; chapterId: string; block: number; offset: number }
  | { kind: 'note'; noteId: string; offset: number };

export const noteElementOf = (node: Node | null): HTMLElement | null =>
  (node?.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element | null))?.closest<HTMLElement>('[data-note]') ?? null;

/** Characters from the start of `el` up to the DOM point. */
export function textOffsetIn(el: Element, node: Node, offset: number): number {
  const r = document.createRange();
  r.selectNodeContents(el);
  r.setEnd(node, offset);
  return r.toString().length;
}

export function caretAt(root: HTMLElement, node: Node, offset: number): Caret | null {
  if (!root.contains(node)) return null;
  const noteEl = noteElementOf(node);
  if (noteEl) return { kind: 'note', noteId: noteEl.dataset.note!, offset: textOffsetIn(noteEl, node, offset) };

  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
  const blockEl = el?.closest<HTMLElement>('[data-block]');
  const chapterId = blockEl?.closest<HTMLElement>('[data-chapter]')?.dataset.chapter;
  if (!blockEl || !chapterId) return null;
  const block = Number(blockEl.dataset.block);

  const span = el?.closest<HTMLElement>('[data-s]');
  if (span && node.nodeType === Node.TEXT_NODE) return { kind: 'book', chapterId, block, offset: Number(span.dataset.s) + offset };

  // Between elements: take the start of the next book span, else the end of the last one.
  const probe = document.createRange();
  probe.setStart(node, offset);
  let last = Number(blockEl.dataset.start);
  for (const s of Array.from(blockEl.querySelectorAll<HTMLElement>('[data-s]'))) {
    if (probe.comparePoint(s, 0) >= 0) return { kind: 'book', chapterId, block, offset: Number(s.dataset.s) };
    last = Number(s.dataset.s) + (s.textContent?.length ?? 0);
  }
  return { kind: 'book', chapterId, block, offset: last };
}

export function selectionCaret(root: HTMLElement, end: 'start' | 'end' = 'start'): Caret | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0);
  return end === 'start' ? caretAt(root, r.startContainer, r.startOffset) : caretAt(root, r.endContainer, r.endOffset);
}

/** Puts the browser caret at a model position (after a re-render). */
export function placeCaret(root: HTMLElement, caret: Caret): void {
  const sel = window.getSelection();
  if (!sel) return;
  if (caret.kind === 'note') {
    const el = root.querySelector<HTMLElement>(`[data-note="${caret.noteId}"]`);
    if (!el) return;
    const text = el.firstChild;
    if (text?.nodeType === Node.TEXT_NODE) sel.collapse(text, Math.min(caret.offset, (text as Text).length));
    else sel.collapse(el, 0);
    return;
  }
  const blockEl = root.querySelector<HTMLElement>(`[data-chapter="${caret.chapterId}"] [data-block="${caret.block}"]`);
  if (!blockEl) return;
  const spans = Array.from(blockEl.querySelectorAll<HTMLElement>('[data-s]'));
  const start = (s: HTMLElement) => Number(s.dataset.s);
  const len = (s: HTMLElement) => s.textContent?.length ?? 0;
  // Prefer the end of the text before the caret, so typing continues after it.
  const target =
    spans.find((s) => start(s) < caret.offset && caret.offset <= start(s) + len(s)) ??
    spans.find((s) => start(s) >= caret.offset) ??
    spans[spans.length - 1];
  if (!target?.firstChild) return void sel.collapse(blockEl, 0);
  sel.collapse(target.firstChild, Math.max(0, Math.min(len(target), caret.offset - start(target))));
}
