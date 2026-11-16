import { useCallback, useEffect, useRef, useState } from 'react';
import { importBook } from '../import/import-book';
import { deleteBook, listAnnotations, listBooks, saveBook } from '../lib/db';
import { bookSummary } from '../lib/progress';
import type { Annotations, BookMeta } from '../lib/types';

interface Props {
  onOpen: (id: string) => void;
}

export function LibraryView({ onOpen }: Props) {
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [anns, setAnns] = useState<Map<string, Annotations>>(new Map());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const [b, a] = await Promise.all([listBooks(), listAnnotations()]);
    setBooks(b);
    setAnns(new Map(a.map((x) => [x.bookId, x])));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const failures: string[] = [];
    for (const file of Array.from(files)) {
      setBusy(`Đang đọc ${file.name}…`);
      try {
        await saveBook(await importBook(file));
      } catch (e) {
        failures.push(`${file.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    setBusy(null);
    if (failures.length) setError(failures.join('\n'));
    if (input.current) input.current.value = '';
    await refresh();
  };

  const remove = async (b: BookMeta) => {
    if (!window.confirm(`Xóa "${b.title}" khỏi thư viện? Mọi phần đã xóa và đoạn bạn viết trong sách này cũng mất, không khôi phục được.`)) return;
    await deleteBook(b.id);
    await refresh();
  };

  return (
    <div className="library">
      <header className="library-head">
        <h1>Book Carve</h1>
        <p className="tagline">Sách là quặng, không phải kinh thánh.</p>
        <label className="upload">
          <input ref={input} type="file" accept=".epub,.pdf" multiple onChange={(e) => void onFiles(e.target.files)} />
          Thêm sách (EPUB, PDF)
        </label>
        {busy && <p className="status">{busy}</p>}
        {error && <p className="error">{error}</p>}
      </header>
      {!books.length && !busy && <p className="empty">Chưa có sách nào. Thêm một file EPUB hoặc PDF có chữ để bắt đầu.</p>}
      <ul className="book-list">
        {books.map((b) => (
          <li key={b.id}>
            <button className="book-card" onClick={() => onOpen(b.id)}>
              <span className="book-card-title">{b.title}</span>
              <span className="book-card-meta">
                {b.format.toUpperCase()} · {b.chapterCount} chương · {bookSummary(b, anns.get(b.id))}
              </span>
            </button>
            <button className="ghost danger" onClick={() => void remove(b)} aria-label={`Xóa ${b.title}`}>Xóa</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
