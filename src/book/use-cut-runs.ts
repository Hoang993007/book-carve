import { useMemo, useRef } from 'react';
import type { Book, Note, TextRange } from '../lib/types';
import { titleInText } from './chapter-section';
import type { ViewMode } from './chapter-text';
import { cutEdges, planCutRuns, shownCuts, type CutRuns } from './cut-runs';

interface Cached {
  ranges: TextRange[];
  notes: Note[];
  shown: TextRange[];
}

const NONE: TextRange[] = [];

/**
 * Cuts as shown in the compact view, per chapter (identity kept while unchanged, so memoized
 * chapters skip re-rendering), plus how runs of cuts join across chapter breaks.
 */
export function useCutRuns(
  book: Book,
  deleted: Record<string, TextRange[]> | undefined,
  notesByChapter: Map<string, Note[]>,
  openChapters: ReadonlySet<string>,
  mode: ViewMode,
): { shown: Map<string, TextRange[]>; runs: CutRuns } {
  const cache = useRef(new Map<string, Cached>());
  return useMemo(() => {
    const shown = new Map<string, TextRange[]>();
    for (const ch of book.chapters) {
      const ranges = deleted?.[ch.id] ?? NONE;
      const notes = notesByChapter.get(ch.id) ?? [];
      const old = cache.current.get(ch.id);
      const entry = old && old.ranges === ranges && old.notes === notes ? old : { ranges, notes, shown: shownCuts(ch, ranges, notes) };
      cache.current.set(ch.id, entry);
      shown.set(ch.id, entry.shown);
    }
    const runs = planCutRuns(
      book.chapters.map((ch) => ({
        id: ch.id,
        edges:
          mode === 'compact' && openChapters.has(ch.id)
            ? cutEdges(ch, shown.get(ch.id)!, notesByChapter.get(ch.id) ?? [], !titleInText(ch))
            : null,
      })),
    );
    return { shown, runs };
  }, [book, deleted, notesByChapter, openChapters, mode]);
}
