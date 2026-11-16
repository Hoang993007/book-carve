import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';
import { addRange, overlaps, removeRange } from '../lib/ranges';
import type { Annotations, Chapter, Note, TextRange } from '../lib/types';
import type { MenuItem } from './context-menu';
import { blockAt, selectionRange } from './selection';
import type { UpdateAnnotations } from './use-annotations';

export interface MenuState {
  x: number;
  y: number;
  items: MenuItem[];
}

/**
 * Editing gestures on the reading surface:
 * select + Backspace/Delete deletes; right-click restores, deletes, or inserts a paragraph.
 */
export function useEditCommands(
  root: RefObject<HTMLElement | null>,
  chapter: Chapter,
  ann: Annotations,
  update: UpdateAnnotations,
  onNoteCreated: (id: string) => void,
) {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const ranges = ann.deleted[chapter.id] ?? [];

  const setRanges = useCallback(
    (fn: (r: TextRange[]) => TextRange[]) =>
      update((a) => ({ ...a, deleted: { ...a.deleted, [chapter.id]: fn(a.deleted[chapter.id] ?? []) } })),
    [update, chapter.id],
  );

  const applyToSelection = useCallback(
    (range: TextRange, cut: boolean) => {
      setRanges((r) => (cut ? addRange(r, range) : removeRange(r, range)));
      window.getSelection()?.removeAllRanges();
    },
    [setRanges],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      const target = e.target as HTMLElement | null;
      if (target && /^(TEXTAREA|INPUT)$/.test(target.tagName)) return;
      const el = root.current;
      const range = el ? selectionRange(el) : null;
      if (!range) return;
      e.preventDefault();
      applyToSelection(range, true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [root, applyToSelection]);

  const insertNote = useCallback(
    (afterBlock: number) => {
      const note: Note = { id: crypto.randomUUID(), chapterId: chapter.id, afterBlock, text: '', createdAt: Date.now() };
      update((a) => ({ ...a, notes: [...a.notes, note] }));
      onNoteCreated(note.id);
    },
    [update, chapter.id, onNoteCreated],
  );

  const onContextMenu = useCallback(
    (e: ReactMouseEvent) => {
      const el = root.current;
      if (!el) return;
      e.preventDefault();
      const items: MenuItem[] = [];
      const noteEl = (e.target as Element).closest<HTMLElement>('[data-note]');
      const range = selectionRange(el);
      if (range) {
        if (overlaps(ranges, range)) items.push({ label: 'Khôi phục', run: () => applyToSelection(range, false) });
        items.push({ label: 'Xóa', run: () => applyToSelection(range, true) });
      } else if (noteEl) {
        const id = noteEl.dataset.note;
        items.push({ label: 'Xóa đoạn của tôi', run: () => update((a) => ({ ...a, notes: a.notes.filter((n) => n.id !== id) })) });
      } else {
        const block = blockAt(el, e.target, e.clientY);
        items.push({ label: 'Chèn đoạn của tôi ở đây', run: () => insertNote(block) });
      }
      setMenu({ x: e.clientX, y: e.clientY, items });
    },
    [root, ranges, applyToSelection, update, insertNote],
  );

  const closeMenu = useCallback(() => setMenu(null), []);
  return { menu, closeMenu, onContextMenu };
}
