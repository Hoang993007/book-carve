import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent, type RefObject } from 'react';
import { addRange, overlaps, removeRange } from '../lib/ranges';
import type { Book } from '../lib/types';
import type { MenuItem } from './context-menu';
import { selectionRanges, type ChapterRange } from './selection';
import type { AnnotationsApi } from './use-annotations';

export interface MenuState {
  x: number;
  y: number;
  items: MenuItem[];
}

/** Ctrl+Z / Ctrl+Y everywhere on the surface, and the right-click menu (restore, delete, remove own text). */
export function useEditCommands(root: RefObject<HTMLElement | null>, book: Book, api: AnnotationsApi) {
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.target instanceof HTMLInputElement) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (k === 'y' || (k === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const onContextMenu = useCallback(
    (e: ReactMouseEvent) => {
      const el = root.current;
      if (!el || !ann) return;
      const items: MenuItem[] = [];
      const parts = selectionRanges(el, book.chapters);
      const noteEl = (e.target as Element).closest<HTMLElement>('[data-note]');
      if (parts.length) {
        if (parts.some((p) => overlaps(ann.deleted[p.chapterId] ?? [], p.range))) items.push({ label: 'Khôi phục', run: () => apply(parts, false) });
        items.push({ label: 'Xóa', run: () => apply(parts, true) });
      } else if (noteEl) {
        const id = noteEl.dataset.note;
        items.push({ label: 'Xóa ý này', run: () => update((a) => ({ ...a, notes: a.notes.filter((n) => n.id !== id) }), { undoable: true }) });
      }
      if (!items.length) return;
      e.preventDefault();
      setMenu({ x: e.clientX, y: e.clientY, items });
    },
    [root, ann, book, apply, update],
  );

  const closeMenu = useCallback(() => setMenu(null), []);
  return { menu, closeMenu, onContextMenu };
}
