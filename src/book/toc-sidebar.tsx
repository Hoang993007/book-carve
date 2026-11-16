import { useEffect, useRef } from 'react';
import { chapterStatus } from '../lib/progress';
import type { Annotations, Book } from '../lib/types';
import { IconCollapse, IconExpand } from '../ui/icons';

interface Props {
  book: Book;
  ann: Annotations;
  current: number;
  open: boolean;
  onToggle: () => void;
  onJump: (index: number) => void;
}

/**
 * The book's structure, always at hand: chapters with reading progress, the one on
 * screen highlighted. Folds to a thin rail when you want only the text.
 */
export function TocSidebar({ book, ann, current, open, onToggle, onJump }: Props) {
  const list = useRef<HTMLElement>(null);

  // Keep the chapter being read in view as you scroll the text.
  useEffect(() => {
    list.current?.querySelector<HTMLElement>('.toc-item.current')?.scrollIntoView({ block: 'nearest' });
  }, [current, open]);

  if (!open) {
    return (
      <aside className="toc-side collapsed">
        <button className="icon-btn" onClick={onToggle} aria-label="Hiện mục lục" title="Hiện mục lục (Ctrl+B)">
          <IconExpand />
        </button>
      </aside>
    );
  }

  return (
    <aside className="toc-side">
      <div className="toc-head">
        <span>Mục lục</span>
        <button className="icon-btn" onClick={onToggle} aria-label="Thu gọn mục lục" title="Thu gọn mục lục (Ctrl+B)">
          <IconCollapse />
        </button>
      </div>
      <nav className="toc-list" ref={list} aria-label="Mục lục">
        {book.chapters.map((ch, i) => {
          const s = chapterStatus(ch, ann.progress[ch.id], ann, book.format === 'pdf');
          const meta = s.done ? 'Xong' : s.started ? `Đã đọc ${s.readLabel}` : '';
          return (
            <button
              key={ch.id}
              className={`toc-item${i === current ? ' current' : ''}${s.started ? '' : ' not-started'}`}
              aria-current={i === current ? 'location' : undefined}
              onClick={() => onJump(i)}
            >
              <span className="toc-mark" aria-hidden="true">{s.done ? '✓' : s.started ? '◐' : ''}</span>
              <span className="toc-title">{ch.title}</span>
              {(meta || s.keptPct !== null) && (
                <span className="toc-meta">
                  {meta}
                  {s.keptPct !== null && ` · giữ ${s.keptPct}%`}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
