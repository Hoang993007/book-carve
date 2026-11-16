import { useState } from 'react';
import { BookView } from './book/book-view';
import { LibraryView } from './library/library-view';

interface Open {
  id: string;
  /** Bumped to reload the book after its files changed (re-parse). */
  version: number;
}

export function App() {
  const [open, setOpen] = useState<Open | null>(null);
  if (!open) return <LibraryView onOpen={(id) => setOpen({ id, version: 0 })} />;
  return (
    <BookView
      key={`${open.id}:${open.version}`}
      bookId={open.id}
      onBack={() => setOpen(null)}
      onReload={() => setOpen({ id: open.id, version: open.version + 1 })}
    />
  );
}
