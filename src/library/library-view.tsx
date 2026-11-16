import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { importBook } from '../import/import-book';
import { listAnnotations, listBooks, saveBook, storageLocation } from '../lib/db';
import { foldForSearch } from '../lib/taken';
import type { Annotations, BookMeta } from '../lib/types';
import { useConfirm } from '../ui/confirm';
import { SpaceTabs, type Space } from '../ui/space-tabs';
import { useToast } from '../ui/toast';
import { BookRow } from './book-row';

interface Props {
  onOpen: (id: string) => void;
  onSwitch: (space: Space) => void;
}

export function LibraryView({ onOpen, onSwitch }: Props) {
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [anns, setAnns] = useState<Map<string, Annotations>>(new Map());
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [location, setLocation] = useState('');
  const [confirmNode, confirm] = useConfirm();
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const filterInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const [b, a] = await Promise.all([listBooks(), listAnnotations()]);
    setBooks(b);
    setAnns(new Map(a.map((x) => [x.bookId, x])));
  }, []);

  useEffect(() => {
    void refresh();
    void storageLocation().then(setLocation);
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        filterInput.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [refresh]);

  const addFiles = async (files: File[]) => {
    const failures: string[] = [];
    for (const file of files) {
      setBusy(`Đang đọc ${file.name}…`);
      try {
        const { book, source } = await importBook(file);
        await saveBook(book, source);
      } catch (e) {
        failures.push(`${file.name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    setBusy(null);
    if (failures.length) toast(failures.join('\n'), true);
    else toast(files.length === 1 ? `Đã thêm "${files[0].name}"` : `Đã thêm ${files.length} sách`);
    if (input.current) input.current.value = '';
    await refresh();
  };

  // Most recently opened first, then most recently added.
  const rows = useMemo(() => {
    const q = foldForSearch(filter.trim());
    const recent = (b: BookMeta) => anns.get(b.id)?.lastOpenedAt ?? b.addedAt;
    return books.filter((b) => !q || foldForSearch(b.title).includes(q)).sort((a, b) => recent(b) - recent(a));
  }, [books, anns, filter]);

  return (
    <div
      className={`library${dragging ? ' dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const files = Array.from(e.dataTransfer.files).filter((f) => /\.(epub|pdf)$/i.test(f.name));
        if (files.length) void addFiles(files);
        else toast('Chỉ nhận file EPUB hoặc PDF', true);
      }}
    >
      <header className="library-head">
        <SpaceTabs space="books" onSwitch={onSwitch} />
        <span className="muted">{books.length} sách</span>
        <span className="spacer" />
        <input ref={filterInput} type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Lọc theo tên  (Ctrl+F)" aria-label="Lọc sách" />
        <label className="button primary">
          <input ref={input} type="file" accept=".epub,.pdf" multiple hidden onChange={(e) => e.target.files && void addFiles(Array.from(e.target.files))} />
          Thêm sách
        </label>
      </header>
      {busy && <div className="progress-line">{busy}</div>}
      {books.length > 0 && (
        <div className="book-table" role="table" aria-label="Sách">
          <div className="book-row head" role="row">
            <span>Tên</span>
            <span>Tiến độ</span>
            <span className="num">Giữ lại</span>
            <span className="num">Ý của bạn</span>
            <span />
          </div>
          {rows.map((b) => (
            <BookRow key={b.id} book={b} ann={anns.get(b.id)} onOpen={onOpen} ctx={{ confirm, toast, changed: () => void refresh() }} />
          ))}
          {!rows.length && <p className="muted pad">Không có sách nào khớp "{filter}".</p>}
        </div>
      )}
      {!books.length && !busy && (
        <div className="empty-state">
          <p>Kéo thả file EPUB hoặc PDF có chữ vào đây, hoặc bấm "Thêm sách".</p>
        </div>
      )}
      <footer className="library-foot muted">
        Kéo thả file vào cửa sổ để thêm · Dữ liệu: {location}
      </footer>
      {dragging && <div className="drop-hint">Thả để thêm sách</div>}
      {confirmNode}
    </div>
  );
}
