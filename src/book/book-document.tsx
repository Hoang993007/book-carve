import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import type { Book, Note } from '../lib/types';
import { ChapterSection } from './chapter-section';
import type { ViewMode } from './chapter-text';
import { ContextMenu } from './context-menu';
import type { AnnotationsApi } from './use-annotations';
import { useEditCommands } from './use-edit-commands';

interface Props {
  book: Book;
  api: AnnotationsApi;
  mode: ViewMode;
  /** Chapters shown in full; the rest are folded to one line. */
  openChapters: ReadonlySet<string>;
  onOpenChapter: (index: number) => void;
  surface: RefObject<HTMLDivElement | null>;
}

const NO_EXPANDED: ReadonlySet<number> = new Set();
const NO_NOTES: Note[] = [];

/** The whole book as one carved document: every chapter in order, edits in place. */
export function BookDocument({ book, api, mode, openChapters, onOpenChapter, surface }: Props) {
  const { ann, update } = api;
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const editingRef = useRef<string | null>(null);
  const [expanded, setExpanded] = useState<Map<string, ReadonlySet<number>>>(new Map());

  const onEditNote = useCallback(
    (id: string | null) => {
      const current = editingRef.current;
      // Leaving an empty paragraph removes it.
      if (current && current !== id) update((a) => ({ ...a, notes: a.notes.filter((n) => n.id !== current || n.text.trim()) }));
      editingRef.current = id;
      setEditingNote(id);
    },
    [update],
  );

  const { menu, closeMenu, onContextMenu } = useEditCommands(surface, book, api, onEditNote);

  // Per-chapter note lists that keep their identity while unchanged, so memoized chapters skip re-rendering.
  const previous = useRef(new Map<string, Note[]>());
  const notesByChapter = useMemo(() => {
    const next = new Map<string, Note[]>();
    for (const ch of book.chapters) {
      const list = ann?.notes.filter((n) => n.chapterId === ch.id) ?? [];
      const old = previous.current.get(ch.id);
      const same = old && old.length === list.length && old.every((n, i) => n === list[i]);
      next.set(ch.id, same ? old : list.length ? list : NO_NOTES);
    }
    previous.current = next;
    return next;
  }, [ann?.notes, book]);

  const onNoteChange = useCallback(
    (id: string, text: string) => update((a) => ({ ...a, notes: a.notes.map((n) => (n.id === id ? { ...n, text } : n)) })),
    [update],
  );

  const onToggleExpand = useCallback((chapterId: string, start: number) => {
    setExpanded((prev) => {
      const set = new Set(prev.get(chapterId) ?? []);
      if (set.has(start)) set.delete(start);
      else set.add(start);
      return new Map(prev).set(chapterId, set);
    });
  }, []);

  if (!ann) return null;
  return (
    <div className="document" ref={surface} onContextMenu={onContextMenu}>
      {book.chapters.map((ch, i) => (
        <ChapterSection
          key={ch.id}
          chapter={ch}
          index={i}
          open={openChapters.has(ch.id)}
          ranges={ann.deleted[ch.id]}
          notes={notesByChapter.get(ch.id) ?? NO_NOTES}
          mode={mode}
          expanded={expanded.get(ch.id) ?? NO_EXPANDED}
          onToggleExpand={onToggleExpand}
          onOpen={onOpenChapter}
          editingNote={editingNote}
          onEditNote={onEditNote}
          onNoteChange={onNoteChange}
        />
      ))}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeMenu} />}
    </div>
  );
}
