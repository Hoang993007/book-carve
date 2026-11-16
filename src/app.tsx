import { useEffect, useState } from 'react';
import { BookView } from './book/book-view';
import { LibraryView } from './library/library-view';
import { SPACES, type Space } from './ui/space-tabs';
import { WorldView } from './world/world-view';
import { WorldsView } from './world/worlds-view';
import { WorkView } from './writing/work-view';
import { WritingView } from './writing/writing-view';

type Open =
  /** `version` is bumped to reload the book after its files changed (re-parse). */
  | { kind: 'book'; id: string; version: number }
  /** `from` is where the back button returns (a world's atlas, when the chapter was opened from it). */
  | { kind: 'work'; id: string; part?: string; from?: Open }
  | { kind: 'world'; id: string };

const SPACE_KEY = 'bookcarve.space';

function readSpace(): Space {
  try {
    const s = localStorage.getItem(SPACE_KEY);
    return SPACES.includes(s as Space) ? (s as Space) : 'books';
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
  if (open?.kind === 'work') {
    return (
      <WorkView
        key={`${open.id}:${open.part ?? ''}`}
        workId={open.id}
        part={open.part}
        onBack={() => setOpen(open.from ?? null)}
        backLabel={open.from ? 'Về bản đồ thế giới' : undefined}
      />
    );
  }
  if (open?.kind === 'world') {
    const world = open;
    return (
      <WorldView
        key={world.id}
        worldId={world.id}
        onBack={() => setOpen(null)}
        onOpenWorkPart={(id, part) => setOpen({ kind: 'work', id, part, from: world })}
      />
    );
  }
  if (space === 'worlds') return <WorldsView onSwitch={setSpace} onOpen={(id) => setOpen({ kind: 'world', id })} />;
  if (space === 'writing') return <WritingView onSwitch={setSpace} onOpen={(id) => setOpen({ kind: 'work', id })} />;
  return <LibraryView onSwitch={setSpace} onOpen={(id) => setOpen({ kind: 'book', id, version: 0 })} />;
}
