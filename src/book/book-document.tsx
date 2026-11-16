import { useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import type { Book, Note } from '../lib/types';
import { ChapterSection } from './chapter-section';
import type { ViewMode } from './chapter-text';
import { ContextMenu } from './context-menu';
import { cutKey } from './cut-runs';
import type { AnnotationsApi } from './use-annotations';
import { useCutRuns } from './use-cut-runs';
import { useEditCommands } from './use-edit-commands';
import { useEditor } from './use-editor';

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

/** The whole book as one editable, carved document: every chapter in order, edits in place. */
export function BookDocument({ book, api, mode, openChapters, onOpenChapter, surface }: Props) {
  const { ann } = api;
  const [expanded, setExpanded] = useState<Map<string, ReadonlySet<number>>>(new Map());
  // Bumping a chapter's revision re-renders it from scratch (after an input method wrote into it).
  const [revisions, setRevisions] = useState<Map<string, number>>(new Map());
  const remount = useCallback((chapterId: string) => setRevisions((r) => new Map(r).set(chapterId, (r.get(chapterId) ?? 0) + 1)), []);

  useEditor(surface, book, api, remount);
  const { menu, closeMenu, onContextMenu } = useEditCommands(surface, book, api);

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

  const { shown, runs } = useCutRuns(book, ann?.deleted, notesByChapter, openChapters, mode);
  const followers = useRef(runs.followers);
  followers.current = runs.followers;

  // A "⋯" that stands for cuts in later chapters too opens and closes all of them.
  const onToggleExpand = useCallback((chapterId: string, start: number) => {
    setExpanded((prev) => {
      const open = !prev.get(chapterId)?.has(start);
      const next = new Map(prev);
      for (const c of [{ chapterId, start }, ...(followers.current.get(cutKey(chapterId, start)) ?? [])]) {
        const set = new Set(next.get(c.chapterId) ?? []);
        if (open) set.add(c.start);
        else set.delete(c.start);
        next.set(c.chapterId, set);
      }
      return next;
    });
  }, []);

  if (!ann) return null;
  return (
    <>
      <div
        className="document"
        ref={surface}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        onContextMenu={onContextMenu}
        onDragStart={(e) => e.preventDefault()}
      >
        {book.chapters.map((ch, i) => (
          <ChapterSection
            key={`${ch.id}:${revisions.get(ch.id) ?? 0}`}
            chapter={ch}
            index={i}
            open={openChapters.has(ch.id)}
            ranges={mode === 'compact' ? shown.get(ch.id) : ann.deleted[ch.id]}
            notes={notesByChapter.get(ch.id) ?? NO_NOTES}
            mode={mode}
            expanded={expanded.get(ch.id) ?? NO_EXPANDED}
            onToggleExpand={onToggleExpand}
            onOpen={onOpenChapter}
            hideLead={runs.hideLead.has(ch.id)}
            joinsNext={runs.joinsNext.has(ch.id)}
          />
        ))}
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeMenu} />}
    </>
  );
}
