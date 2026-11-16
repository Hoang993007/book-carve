import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Annotations, Chapter } from '../lib/types';
import { ChapterText, type ViewMode } from './chapter-text';
import { ContextMenu } from './context-menu';
import type { UpdateAnnotations } from './use-annotations';
import { useChapterProgress } from './use-chapter-progress';
import { useEditCommands } from './use-edit-commands';

interface Props {
  chapter: Chapter;
  ann: Annotations;
  update: UpdateAnnotations;
  mode: ViewMode;
  /** Block to scroll to (nonce makes repeat jumps work); null means "resume where I stopped". */
  jump: Jump | null;
}

export interface Jump {
  block: number;
  nonce: number;
}

export function Reader({ chapter, ann, update, mode, jump }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [editingNote, setEditingNote] = useState<string | null>(null);

  const { menu, closeMenu, onContextMenu } = useEditCommands(surface, chapter, ann, update, setEditingNote);
  useChapterProgress(scroller, chapter, update);

  useEffect(() => setExpanded(new Set()), [chapter.id, mode]);

  // Position once per chapter open: the requested block, else where reading stopped.
  const progress = ann.progress[chapter.id];
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const target = jump ? jump.block : progress && !progress.done ? progress.furthestBlock : null;
    el.scrollTop = 0;
    if (target === null || target <= 0) return;
    const blocks = Array.from(el.querySelectorAll<HTMLElement>('[data-block]'));
    const node = blocks.find((b) => Number(b.dataset.block) >= target) ?? blocks[blocks.length - 1];
    if (!node) return;
    node.scrollIntoView({ block: jump ? 'center' : 'start' });
    if (jump) {
      node.classList.add('flash');
      setTimeout(() => node.classList.remove('flash'), 1600);
    }
    // Only on chapter change or a new jump; progress updates must not move the page.
  }, [chapter.id, jump]);

  const onNoteChange = useCallback(
    (id: string, text: string) => update((a) => ({ ...a, notes: a.notes.map((n) => (n.id === id ? { ...n, text } : n)) })),
    [update],
  );

  const onEditNote = useCallback(
    (id: string | null) => {
      if (id === null && editingNote) {
        // Leaving an empty paragraph removes it.
        update((a) => ({ ...a, notes: a.notes.filter((n) => n.id !== editingNote || n.text.trim()) }));
      }
      setEditingNote(id);
    },
    [editingNote, update],
  );

  const toggleExpand = useCallback((start: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(start)) next.delete(start);
      else next.add(start);
      return next;
    });
  }, []);

  return (
    <div className="reader" ref={scroller}>
      <div className="reader-surface" ref={surface} onContextMenu={onContextMenu}>
        {chapter.blocks[0]?.text !== chapter.title && <h1 className="chapter-title">{chapter.title}</h1>}
        <ChapterText
          chapter={chapter}
          ranges={ann.deleted[chapter.id] ?? []}
          notes={ann.notes.filter((n) => n.chapterId === chapter.id)}
          mode={mode}
          expanded={expanded}
          onToggleExpand={toggleExpand}
          editingNote={editingNote}
          onEditNote={onEditNote}
          onNoteChange={onNoteChange}
        />
        <p className="reader-hint">Bôi đen + Backspace để xóa · Chuột phải để khôi phục hoặc chèn đoạn của bạn</p>
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={closeMenu} />}
    </div>
  );
}
