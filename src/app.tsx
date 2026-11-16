import { useEffect, useState } from 'react';
import { BookView } from './book/book-view';
import { LibraryView } from './library/library-view';
import type { Space } from './ui/space-tabs';
import { WorkView } from './writing/work-view';
import { WritingView } from './writing/writing-view';

type Open =
  /** `version` is bumped to reload the book after its files changed (re-parse). */
  | { kind: 'book'; id: string; version: number }
  | { kind: 'work'; id: string };

const SPACE_KEY = 'bookcarve.space';

function readSpace(): Space {
  try {
    return localStorage.getItem(SPACE_KEY) === 'writing' ? 'writing' : 'books';
  } catch {
    return 'books';
  }
}

export function App() {
  const [space, setSpace] = useState<Space>(readSpace);
  const [open, setOpen] = useState<Open | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(SPACE_KEY, space);
    } catch {
      // Not remembered this time.
    }
  }, [space]);

  if (open?.kind === 'book') {
    return (
      <BookView
        key={`${open.id}:${open.version}`}
        bookId={open.id}
        onBack={() => setOpen(null)}
        onReload={() => setOpen({ ...open, version: open.version + 1 })}
      />
    );
  }
  if (open?.kind === 'work') return <WorkView key={open.id} workId={open.id} onBack={() => setOpen(null)} />;
  if (space === 'writing') return <WritingView onSwitch={setSpace} onOpen={(id) => setOpen({ kind: 'work', id })} />;
  return <LibraryView onSwitch={setSpace} onOpen={(id) => setOpen({ kind: 'book', id, version: 0 })} />;
}
