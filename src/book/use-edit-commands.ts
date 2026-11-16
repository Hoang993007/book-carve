import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';
import { addRange, overlaps, removeRange } from '../lib/ranges';
import type { Annotations, Book, Note } from '../lib/types';
import type { MenuItem } from './context-menu';
import { blockAtPointer, blockAtSelection, selectionRanges, type BlockRef, type ChapterRange } from './selection';
import type { AnnotationsApi } from './use-annotations';

export interface MenuState {
  x: number;
  y: number;
  items: MenuItem[];
}

const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (/^(TEXTAREA|INPUT)$/.test(t.tagName) || t.isContentEditable);

/**
 * Editing gestures on the reading surface:
 * select + Backspace/Delete deletes · Enter inserts an own paragraph after the current one ·
 * Ctrl+Z / Ctrl+Y undo and redo · right-click restores, deletes or inserts.
 */
export function useEditCommands(
  root: RefObject<HTMLElement | null>,
  book: Book,
  api: AnnotationsApi,
  onNoteCreated: (id: string) => void,
) {
  const { ann, update, undo, redo } = api;
  const [menu, setMenu] = useState<MenuState | null>(null);

  const apply = useCallback(
    (parts: ChapterRange[], cut: boolean) => {
      update(
        (a) => {
          const deleted = { ...a.deleted };
          for (const { chapterId, range } of parts) {
            deleted[chapterId] = cut ? addRange(deleted[chapterId] ?? [], range) : removeRange(deleted[chapterId] ?? [], range);
          }
          return { ...a, deleted };
        },
        { undoable: true },
      );
      window.getSelection()?.removeAllRanges();
    },
    [update],
  );

  const insertNote = useCallback(
    (at: BlockRef) => {
      const note: Note = { id: crypto.randomUUID(), chapterId: at.chapterId, afterBlock: at.block, text: '', createdAt: Date.now() };
      update((a) => ({ ...a, notes: [...a.notes, note] }), { undoable: true });
      window.getSelection()?.removeAllRanges();
      onNoteCreated(note.id);
    },
    [update, onNoteCreated],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const el = root.current;
      if (!el) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        const parts = selectionRanges(el, book.chapters);
        if (!parts.length) return;
        e.preventDefault();
        apply(parts, true);
      } else if (e.key === 'Enter' && !mod) {
        const at = blockAtSelection(el);
        if (!at) return;
        e.preventDefault();
        insertNote(at);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [root, book, apply, insertNote, undo, redo]);

  const onContextMenu = useCallback(
    (e: ReactMouseEvent) => {
      const el = root.current;
      if (!el || !ann || isTyping(e.target)) return;
      e.preventDefault();
      const items: MenuItem[] = [];
      const noteEl = (e.target as Element).closest<HTMLElement>('[data-note]');
      const parts = selectionRanges(el, book.chapters);
      if (parts.length) {
        if (parts.some((p) => overlaps(ann.deleted[p.chapterId] ?? [], p.range))) {
          items.push({ label: 'Khôi phục', run: () => apply(parts, false) });
        }
        items.push({ label: 'Xóa', run: () => apply(parts, true) });
      } else if (noteEl) {
        const id = noteEl.dataset.note;
        items.push({
          label: 'Xóa đoạn của tôi',
          run: () => update((a: Annotations) => ({ ...a, notes: a.notes.filter((n) => n.id !== id) }), { undoable: true }),
        });
      } else {
        const at = blockAtPointer(el, e.target, e.clientY);
        if (at) items.push({ label: 'Chèn ý của tôi ở đây', run: () => insertNote(at) });
      }
      if (items.length) setMenu({ x: e.clientX, y: e.clientY, items });
    },
    [root, ann, book, apply, update, insertNote],
  );

  const closeMenu = useCallback(() => setMenu(null), []);
  return { menu, closeMenu, onContextMenu };
}
