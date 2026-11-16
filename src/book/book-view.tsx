import { useEffect, useState } from 'react';
import { getBook } from '../lib/db';
import type { Book } from '../lib/types';
import { BookScreen } from './book-screen';
import { useAnnotations } from './use-annotations';

interface Props {
  bookId: string;
  onBack: () => void;
  /** The book's files changed underneath (re-parse): reopen it. */
  onReload: () => void;
}

/** Loads a book and its annotations, then shows the reading screen. */
export function BookView({ bookId, onBack, onReload }: Props) {
  const [book, setBook] = useState<Book | null | undefined>(undefined);
  const api = useAnnotations(bookId);

  useEffect(() => {
    getBook(bookId).then(setBook, () => setBook(null));
  }, [bookId]);

  if (book === null) {
    return (
      <div className="empty-state">
        <p>Không mở được sách này.</p>
        <button onClick={onBack}>Về thư viện</button>
      </div>
    );
  }
  if (!book || !api.ann) return <div className="empty-state">Đang mở sách…</div>;
  return <BookScreen book={book} api={api} onBack={onBack} onReload={onReload} />;
}
