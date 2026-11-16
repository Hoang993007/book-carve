import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { downloadMarkdown } from '../export/export-markdown';
import { bookActions } from '../library/book-actions';
import type { Book } from '../lib/types';
import { useConfirm } from '../ui/confirm';
import { MoreMenu } from '../ui/menu';
import { useToast } from '../ui/toast';
import { BookDocument } from './book-document';
import type { ViewMode } from './chapter-text';
import { SearchBar } from './search-bar';
import { StatusBar } from './status-bar';
import { TocOverlay } from './toc-overlay';
import type { AnnotationsApi } from './use-annotations';
import { useDocumentProgress } from './use-document-progress';
import { useSearch } from './use-search';
import { useViewKeys } from './use-view-keys';
import { IconBack } from '../ui/icons';

interface Props {
  book: Book;
  api: AnnotationsApi;
  onBack: () => void;
  onReload: () => void;
}

/** One reading surface: the whole book carved, with the table of contents and search on demand. */
export function BookScreen({ book, api, onBack, onReload }: Props) {
  const ann = api.ann!;
  const { update } = api;
  const scroller = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<ViewMode>('compact');
  const [tocOpen, setTocOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [current, setCurrent] = useState(0);
  const [confirmNode, confirm] = useConfirm();
  const toast = useToast();

  // Chapters with anything in them are open; untouched ones stay folded until asked for.
  const [openChapters, setOpenChapters] = useState<ReadonlySet<string>>(
    () => new Set(book.chapters.filter((c) => ann.progress[c.id] || ann.deleted[c.id]?.length || ann.notes.some((n) => n.chapterId === c.id)).map((c) => c.id)),
  );

  useEffect(() => update((a) => ({ ...a, lastOpenedAt: Date.now() })), [update]);
  useDocumentProgress(scroller, book, update, setCurrent);
  useEffect(() => update((a) => (a.lastChapter === current ? a : { ...a, lastChapter: current })), [current, update]);

  const scrollToChapter = useCallback((index: number, block?: number) => {
    requestAnimationFrame(() => {
      const section = document.getElementById(`chapter-${index}`);
      const target = block !== undefined ? section?.querySelector(`[data-block="${block}"]`) : null;
      (target ?? section)?.scrollIntoView({ block: target ? 'center' : 'start' });
    });
  }, []);

  const openChapter = useCallback(
    (index: number) => {
      setOpenChapters((prev) => new Set(prev).add(book.chapters[index].id));
      scrollToChapter(index);
    },
    [book, scrollToChapter],
  );

  const jumpTo = useCallback(
    (index: number) => {
      setTocOpen(false);
      openChapter(index);
    },
    [openChapter],
  );

  // Where reading stopped: the last chapter in progress that is not finished.
  const resume = useMemo(() => {
    const order = [ann.lastChapter, ...book.chapters.map((_, i) => i)];
    const index = order.find((i) => {
      const p = ann.progress[book.chapters[i]?.id];
      return p && !p.done;
    });
    return index === undefined ? null : { index, block: ann.progress[book.chapters[index].id].furthestBlock };
  }, [ann.lastChapter, ann.progress, book]);

  // Search again whenever what is on screen changes.
  const shown = useMemo(() => ({}), [ann.deleted, ann.notes, mode, openChapters]);
  const search = useSearch(surface, scroller, searchOpen ? query : '', shown);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useViewKeys({
    toggleMode: () => setMode((m) => (m === 'compact' ? 'original' : 'compact')),
    toggleToc: () => setTocOpen((o) => !o),
    openSearch: () => setSearchOpen(true),
    escape: () => {
      setTocOpen(false);
      setSearchOpen(false);
    },
  });

  const menuItems = [
    { label: 'Mục lục', shortcut: '[', run: () => setTocOpen(true) },
    { label: mode === 'compact' ? 'Hiện bản gốc' : 'Về bản gọn', shortcut: 'O', run: () => setMode((m) => (m === 'compact' ? 'original' : 'compact')) },
    { label: 'Tìm trong sách', shortcut: 'Ctrl+F', run: () => setSearchOpen(true) },
    ...bookActions(book.id, book.title, {
      confirm,
      toast,
      changed: (kind) => (kind === 'deleted' ? onBack() : onReload()),
      beforeChange: api.flushAndClose,
      exportNow: () => downloadMarkdown(book, api.ann!),
    }, { includeDelete: false }),
  ];

  return (
    <div className="book-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Về thư viện" title="Về thư viện"><IconBack /></button>
        <button className="crumb" onClick={() => setTocOpen((o) => !o)} title="Mục lục ( [ )">
          <span className="crumb-book">{book.title}</span>
          <span className="crumb-chapter">{book.chapters[current]?.title}</span>
        </button>
        <span className="spacer" />
        {resume && resume.index !== current && (
          <button className="pill" onClick={() => { openChapter(resume.index); scrollToChapter(resume.index, resume.block); }}>
            Tiếp tục: {book.chapters[resume.index].title}
          </button>
        )}
        {mode === 'original' && <span className="mode-badge">Bản gốc</span>}
        <MoreMenu label="Thêm" items={menuItems} />
      </header>
      {searchOpen && (
        <SearchBar query={query} onQuery={setQuery} count={search.count} index={search.index} onNext={search.next} onPrev={search.prev} onClose={closeSearch} />
      )}
      <div className="reader-wrap">
        <div className="reader" ref={scroller}>
          <BookDocument book={book} api={api} mode={mode} openChapters={openChapters} onOpenChapter={openChapter} surface={surface} />
        </div>
        {tocOpen && <TocOverlay book={book} ann={ann} current={current} onJump={jumpTo} onClose={() => setTocOpen(false)} />}
      </div>
      <StatusBar saving={api.saving} />
      {confirmNode}
    </div>
  );
}
