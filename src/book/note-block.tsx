import { useEffect, useRef } from 'react';
import type { Note } from '../lib/types';

interface Props {
  note: Note;
  editing: boolean;
  onEdit: () => void;
  onChange: (text: string) => void;
  onDone: () => void;
}

/** One of the reader's own paragraphs, sitting inside the book text. */
export function NoteBlock({ note, editing, onEdit, onChange, onDone }: Props) {
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [editing, note.text]);

  useEffect(() => {
    if (editing) area.current?.focus();
  }, [editing]);

  if (editing) {
    return (
      <div className="note editing" data-note={note.id}>
        <textarea
          ref={area}
          value={note.text}
          placeholder="Viết ý của bạn ngay tại đây"
          onChange={(e) => onChange(e.target.value)}
          onBlur={onDone}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) e.currentTarget.blur();
          }}
        />
      </div>
    );
  }
  return (
    <div className="note" data-note={note.id} onClick={onEdit} title="Bấm để sửa">
      {note.text}
    </div>
  );
}
