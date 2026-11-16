import { bookStats, relativeTime } from '../lib/progress';
import type { Annotations, BookMeta } from '../lib/types';
import { MoreMenu } from '../ui/menu';
import { bookActions, type ActionContext } from './book-actions';

interface Props {
  book: BookMeta;
  ann: Annotations | undefined;
  onOpen: (id: string) => void;
  ctx: ActionContext;
}

/** One library row: what the book is, how far you got, how much you kept, how much you wrote. */
export function BookRow({ book, ann, onOpen, ctx }: Props) {
  const s = bookStats(ann);
  const opened = ann?.lastOpenedAt ? `mở ${relativeTime(ann.lastOpenedAt)}` : 'chưa mở';
  return (
    <div className="book-row" role="row">
      <button className="book-name" onClick={() => onOpen(book.id)}>
        <span className="title">{book.title}</span>
        <span className="muted">
          {book.format.toUpperCase()} · {opened}
        </span>
      </button>
      <span className="book-progress">
        <span className="bar">
          <span style={{ width: `${Math.round((s.doneChapters / Math.max(1, book.chapterCount)) * 100)}%` }} />
        </span>
        <span className="muted">
          {s.startedChapters ? `${s.doneChapters}/${book.chapterCount} chương` : 'Chưa đọc'}
        </span>
      </span>
      <span className="num">{s.keptPct === null ? '—' : `${s.keptPct}%`}</span>
      <span className="num">{s.notes || '—'}</span>
      <MoreMenu label={`Thao tác với ${book.title}`} items={bookActions(book.id, book.title, ctx, { includeDelete: true })} />
    </div>
  );
}
