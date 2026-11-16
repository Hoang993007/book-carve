import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { addRange } from '../lib/ranges';
import type { Annotations, Book, Note } from '../lib/types';
import { caretAt, noteElementOf, placeCaret, selectionCaret, textOffsetIn, type Caret } from './caret';
import { backwardRange, chapterText, forwardRange } from './editor-ops';
import { selectionRanges } from './selection';
import type { AnnotationsApi } from './use-annotations';

type BookCaret = Extract<Caret, { kind: 'book' }>;
type Edit = (a: Annotations) => Annotations;

/**
 * Makes the carved book behave like a document you edit. The surface is contentEditable,
 * but book text never changes in the DOM: every edit on it is intercepted (beforeinput)
 * and turned into the model — Backspace/Delete hide characters, typing creates your own
 * inline text, Enter starts your own paragraph. Inside your own text, editing is native
 * and the model follows. After each model edit the caret is put back where it belongs.
 */
export function useEditor(root: RefObject<HTMLElement | null>, book: Book, api: AnnotationsApi, remount: (chapterId: string) => void) {
  const { update, undo, redo } = api;
  const pending = useRef<Caret | null>(null);
  const annRef = useRef(api.ann);
  annRef.current = api.ann;
  const texts = useMemo(() => new Map(book.chapters.map((c) => [c.id, chapterText(c)])), [book]);
  const chapters = useMemo(() => new Map(book.chapters.map((c) => [c.id, c])), [book]);

  useLayoutEffect(() => {
    if (pending.current && root.current) placeCaret(root.current, pending.current);
    pending.current = null;
  });

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const commit = (fn: Edit, caret: Caret | null, undoable: boolean | string = true) => {
      pending.current = caret;
      update(fn, { undoable });
    };
    const newNote = (at: BookCaret, text: string, inline: boolean): Note => ({
      id: crypto.randomUUID(),
      chapterId: at.chapterId,
      afterBlock: at.block,
      ...(inline ? { at: at.offset } : {}),
      text,
      createdAt: Date.now(),
    });
    const setNoteText = (id: string, text: string): Edit => (a) => ({ ...a, notes: a.notes.map((n) => (n.id === id ? { ...n, text } : n)) });

    /** Hides the selected book text and cuts the selected part of your own text. */
    const cutSelection = (r: Range): Edit => {
      const parts = selectionRanges(el, book.chapters);
      const cuts = Array.from(el.querySelectorAll<HTMLElement>('[data-note]'))
        .filter((n) => r.intersectsNode(n))
        .map((n) => ({
          id: n.dataset.note!,
          s: n.contains(r.startContainer) ? textOffsetIn(n, r.startContainer, r.startOffset) : 0,
          e: n.contains(r.endContainer) ? textOffsetIn(n, r.endContainer, r.endOffset) : (n.textContent ?? '').length,
        }));
      return (a) => {
        const deleted = { ...a.deleted };
        for (const p of parts) deleted[p.chapterId] = addRange(deleted[p.chapterId] ?? [], p.range);
        const notes = a.notes
          .map((n) => {
            const c = cuts.find((x) => x.id === n.id);
            return c ? { ...n, text: n.text.slice(0, c.s) + n.text.slice(c.e) } : n;
          })
          .filter((n) => n.text || !cuts.some((c) => c.id === n.id));
        return { ...a, deleted, notes };
      };
    };

    const blockOfCaret = (c: Caret | null): BookCaret | null => {
      if (!c) return null;
      if (c.kind === 'book') return c;
      const n = annRef.current?.notes.find((x) => x.id === c.noteId);
      return n ? { kind: 'book', chapterId: n.chapterId, block: n.afterBlock, offset: n.at ?? 0 } : null;
    };

    const newParagraph = (r: Range) => {
      const at = blockOfCaret(caretAt(el, r.endContainer, r.endOffset));
      if (!at) return;
      const note = newNote(at, '', false);
      // Same undo key as typing into it: creating and writing a paragraph undo as one step.
      commit((a) => ({ ...a, notes: [...a.notes, note] }), { kind: 'note', noteId: note.id, offset: 0 }, `note:${note.id}`);
    };

    /** Your own inline text touching the caret on the side being deleted, if any. */
    const adjacentNote = (r: Range, back: boolean): HTMLElement | null => {
      const node = r.startContainer;
      let sib: Node | null = null;
      if (node.nodeType === Node.TEXT_NODE) {
        const span = node.parentElement;
        if (back && r.startOffset === 0) sib = span?.previousSibling ?? null;
        if (!back && r.startOffset === (node as Text).length) sib = span?.nextSibling ?? null;
      } else sib = node.childNodes[back ? r.startOffset - 1 : r.startOffset] ?? null;
      return sib instanceof HTMLElement && sib.classList.contains('note-inline') ? sib : null;
    };

    const deleteAtCaret = (r: Range, back: boolean, word: boolean) => {
      const c = caretAt(el, r.startContainer, r.startOffset);
      if (!c || c.kind !== 'book') return;
      const near = adjacentNote(r, back);
      const n = near && annRef.current?.notes.find((x) => x.id === near.dataset.note);
      if (n) {
        const text = back ? n.text.slice(0, -1) : n.text.slice(1);
        const fn: Edit = text ? setNoteText(n.id, text) : (a) => ({ ...a, notes: a.notes.filter((x) => x.id !== n.id) });
        return commit(fn, text ? { kind: 'note', noteId: n.id, offset: back ? text.length : 0 } : c);
      }
      const ch = chapters.get(c.chapterId)!;
      const ranges = annRef.current?.deleted[ch.id] ?? [];
      const range = (back ? backwardRange : forwardRange)(ch, texts.get(ch.id)!, ranges, c.block, c.offset, word);
      if (!range) return;
      commit(
        (a) => ({ ...a, deleted: { ...a.deleted, [ch.id]: addRange(a.deleted[ch.id] ?? [], range) } }),
        { ...c, offset: back ? range[0] : c.offset },
      );
    };

    const onBeforeInput = (e: InputEvent) => {
      const sel = window.getSelection();
      if (!sel?.rangeCount) return;
      const r = sel.getRangeAt(0);
      if (!el.contains(r.commonAncestorContainer)) return;
      const t = e.inputType;
      if (t === 'historyUndo' || t === 'historyRedo') {
        e.preventDefault();
        return void (t === 'historyUndo' ? undo() : redo());
      }
      const noteEl = noteElementOf(r.startContainer);
      if (noteEl && noteEl === noteElementOf(r.endContainer)) {
        // Inside your own text: native editing, except line breaks and rich formatting.
        if (t.startsWith('format') || t === 'insertFromDrop') e.preventDefault();
        if (t !== 'insertParagraph' && t !== 'insertLineBreak') return;
        e.preventDefault();
        if (noteEl.classList.contains('note-inline')) return newParagraph(r);
        const id = noteEl.dataset.note!;
        const s = textOffsetIn(noteEl, r.startContainer, r.startOffset);
        const end = textOffsetIn(noteEl, r.endContainer, r.endOffset);
        const text = noteEl.textContent ?? '';
        return commit(setNoteText(id, `${text.slice(0, s)}\n${text.slice(end)}`), { kind: 'note', noteId: id, offset: s + 1 }, `note:${id}`);
      }
      if (e.isComposing || t.includes('Composition')) return; // handled at compositionend
      e.preventDefault();
      if (t === 'insertParagraph' || t === 'insertLineBreak') return newParagraph(r);
      if (t.startsWith('insert') && t !== 'insertFromDrop') {
        const text = e.data ?? e.dataTransfer?.getData('text/plain') ?? '';
        const at = blockOfCaret(caretAt(el, r.startContainer, r.startOffset));
        if (!text || !at) return;
        const note = newNote(at, text, true);
        const cut = r.collapsed ? null : cutSelection(r);
        const add: Edit = (a) => {
          const b = cut ? cut(a) : a;
          return { ...b, notes: [...b.notes, note] };
        };
        return commit(add, { kind: 'note', noteId: note.id, offset: text.length }, `note:${note.id}`);
      }
      if (t.startsWith('delete') && t !== 'deleteByDrag') {
        if (!r.collapsed) return commit(cutSelection(r), caretAt(el, r.startContainer, r.startOffset));
        deleteAtCaret(r, t.includes('Backward'), t.includes('Word'));
      }
    };

    // Typing in your own text: the DOM leads, the model follows (one undo step per burst).
    const onInput = () => {
      const noteEl = noteElementOf(window.getSelection()?.anchorNode ?? null);
      if (!noteEl || !el.contains(noteEl)) return;
      const id = noteEl.dataset.note!;
      const text = noteEl.textContent ?? '';
      if (annRef.current?.notes.find((n) => n.id === id)?.text !== text) update(setNoteText(id, text), { undoable: `note:${id}` });
    };

    // An input method composing in book text writes into the DOM; restore it and keep the result as your text.
    let composingAt: BookCaret | null = null;
    const onCompositionStart = () => {
      const c = selectionCaret(el);
      composingAt = c?.kind === 'book' ? c : null;
    };
    const onCompositionEnd = (e: CompositionEvent) => {
      const at = composingAt;
      composingAt = null;
      if (!at) return;
      remount(at.chapterId);
      if (!e.data) return;
      const note = newNote(at, e.data, true);
      commit((a) => ({ ...a, notes: [...a.notes, note] }), { kind: 'note', noteId: note.id, offset: e.data.length }, `note:${note.id}`);
    };

    // Your own text left empty disappears once the caret moves away from it.
    const onSelectionChange = () => {
      const a = annRef.current;
      if (!a || composingAt) return;
      const here = noteElementOf(window.getSelection()?.anchorNode ?? null)?.dataset.note;
      const now = Date.now();
      const empty = a.notes.filter((n) => !n.text.trim() && n.id !== here && now - n.createdAt > 1500);
      if (empty.length) update((x) => ({ ...x, notes: x.notes.filter((n) => !empty.some((m) => m.id === n.id)) }));
    };

    el.addEventListener('beforeinput', onBeforeInput);
    el.addEventListener('input', onInput);
    el.addEventListener('compositionstart', onCompositionStart);
    el.addEventListener('compositionend', onCompositionEnd);
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      el.removeEventListener('beforeinput', onBeforeInput);
      el.removeEventListener('input', onInput);
      el.removeEventListener('compositionstart', onCompositionStart);
      el.removeEventListener('compositionend', onCompositionEnd);
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [root, book, chapters, texts, update, undo, redo, remount]);
}
