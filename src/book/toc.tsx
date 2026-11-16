import { chapterStatus } from '../lib/progress';
import type { Annotations, Book } from '../lib/types';

interface Props {
  book: Book;
  ann: Annotations;
  current: number | null;
  onOpen: (index: number) => void;
}

/** Chapters with their reading progress and how much of the read part was kept. */
export function Toc({ book, ann, current, onOpen }: Props) {
  return (
    <nav className="toc" aria-label="Mục lục">
      {book.chapters.map((ch, i) => {
        const s = chapterStatus(ch, ann.progress[ch.id], ann, book.format === 'pdf');
        return (
          <button key={ch.id} className={`toc-item${i === current ? ' current' : ''}${s.done ? ' done' : ''}`} onClick={() => onOpen(i)}>
            <span className="toc-title">
              {s.done && <span className="toc-check" aria-label="Đã đọc xong">✓ </span>}
              {ch.title}
            </span>
            {s.started && (
              <>
                <span className="toc-bar">
                  <span style={{ width: `${Math.round(s.fraction * 100)}%` }} />
                </span>
                <span className="toc-meta">
                  {s.done ? 'Xong' : `Đã đọc ${s.readLabel}`}
                  {s.keptPct !== null && ` · giữ ${s.keptPct}%`}
                </span>
              </>
            )}
          </button>
        );
      })}
    </nav>
  );
}
