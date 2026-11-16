import { memo, useLayoutEffect, useRef } from 'react';
import type { Note } from '../lib/types';

/**
 * The reader's own text, edited in place like any text. React never renders its
 * children: while you type, the DOM is the source and the model follows it (input
 * events); the DOM is only rewritten when the model changes from elsewhere (undo).
 */
export const NoteEl = memo(function NoteEl({ note, inline }: { note: Note; inline: boolean }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && el.textContent !== note.text) el.textContent = note.text;
  }, [note.text]);

  return inline ? (
    <span ref={ref} className="note-inline" data-note={note.id} />
  ) : (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="note" data-note={note.id} data-placeholder="Viết ý của bạn…" />
  );
});
