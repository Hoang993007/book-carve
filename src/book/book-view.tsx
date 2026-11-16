import { useCallback, useEffect, useState } from 'react';
import { downloadMarkdown } from '../export/export-markdown';
import { getBook } from '../lib/db';
import type { Book } from '../lib/types';
import type { ViewMode } from './chapter-text';
import { Reader, type Jump } from './reader';
import { TakenView } from './taken-view';
import { Toc } from './toc';
import { useAnnotations } from './use-annotations';

interface Props {
  bookId: string;
  onBack: () => void;
}

type Tab = 'taken' | 'read';

export function BookView({ bookId, onBack }: Props) {
  const [book, setBook] = useState<Book | null>(null);
  const [ann, update] = useAnnotations(bookId);
  const [tab, setTab] = useState<Tab | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [mode, setMode] = useState<ViewMode>('compact');
  const [jump, setJump] = useState<Jump | null>(null);

  useEffect(() => {
    getBook(bookId).then((b) => setBook(b ?? null));
  }, [bookId]);

  // First screen: what I took, if anything was read yet; otherwise start reading.
  useEffect(() => {
    if (!ann || tab) return;
    const started = Object.values(ann.progress).some((p) => p.furthestEnd > 0) || ann.notes.length > 0;
    setChapterIndex(ann.lastChapter);
    setTab(started ? 'taken' : 'read');
  }, [ann, tab]);

  const openChapter = useCallback(
    (index: number, block: number | null = null) => {
      setChapterIndex(index);
      setJump(block === null ? null : { block, nonce: Date.now() });
      setTab('read');
      update((a) => (a.lastChapter === index ? a : { ...a, lastChapter: index }));
    },
    [update],
  );

  if (!book || !ann || !tab) return <div className="loading">Đang mở sách…</div>;
  const chapter = book.chapters[Math.min(chapterIndex, book.chapters.length - 1)];

  return (
    <div className="book-view">
      <header className="topbar">
        <button className="ghost" onClick={onBack}>← Thư viện</button>
        <h1 className="book-title">{book.title}</h1>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'taken'} className={tab === 'taken' ? 'on' : ''} onClick={() => setTab('taken')}>
            Những gì tôi lấy được
          </button>
          <button role="tab" aria-selected={tab === 'read'} className={tab === 'read' ? 'on' : ''} onClick={() => openChapter(chapterIndex)}>
            Đọc
          </button>
        </div>
        {tab === 'read' && (
          <div className="tabs" aria-label="Chế độ xem">
            <button className={mode === 'compact' ? 'on' : ''} onClick={() => setMode('compact')}>Đọc gọn</button>
            <button className={mode === 'original' ? 'on' : ''} onClick={() => setMode('original')}>Hiện bản gốc</button>
          </div>
        )}
        <button className="ghost" onClick={() => downloadMarkdown(book, ann)} title="Xuất bản của tôi ra Markdown">Xuất .md</button>
      </header>
      <div className="book-body">
        <Toc book={book} ann={ann} current={tab === 'read' ? chapterIndex : null} onOpen={(i) => openChapter(i)} />
        <main className="book-main">
          {tab === 'taken' ? (
            <TakenView book={book} ann={ann} onJump={(c, b) => openChapter(c, b)} />
          ) : (
            <Reader key={chapter.id} chapter={chapter} ann={ann} update={update} mode={mode} jump={jump} />
          )}
        </main>
      </div>
    </div>
  );
}
