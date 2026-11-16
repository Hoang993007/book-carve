import { useEffect, useRef } from 'react';
import { chapterStatus } from '../lib/progress';
import type { Annotations, Book } from '../lib/types';

interface Props {
  book: Book;
  ann: Annotations;
  current: number;
  onJump: (index: number) => void;
  onClose: () => void;
}

/** Table of contents shown over the text on demand, with reading progress per chapter. */
export function TocOverlay({ book, ann, current, onJump, onClose }: Props) {
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('.toc-item.current')?.scrollIntoView({ block: 'center' });
    const onDown = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [onClose]);

  return (
    <nav className="toc-overlay" ref={panel} aria-label="Mục lục">
      {book.chapters.map((ch, i) => {
        const s = chapterStatus(ch, ann.progress[ch.id], ann, book.format === 'pdf');
        const meta = s.done ? 'Xong' : s.started ? `Đã đọc ${s.readLabel}` : '';
        return (
          <button key={ch.id} className={`toc-item${i === current ? ' current' : ''}${s.started ? '' : ' not-started'}`} onClick={() => onJump(i)}>
            <span className="toc-mark" aria-hidden="true">{s.done ? '✓' : s.started ? '◐' : ''}</span>
            <span className="toc-title">{ch.title}</span>
            <span className="toc-meta">
              {meta}
              {s.keptPct !== null && ` · giữ ${s.keptPct}%`}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
