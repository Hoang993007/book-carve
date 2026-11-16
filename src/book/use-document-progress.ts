import { useEffect, type RefObject } from 'react';
import { blockEnd } from '../lib/chapter';
import type { Book, ChapterProgress } from '../lib/types';
import type { UpdateAnnotations } from './use-annotations';

/** Delay before what is on screen without scrolling counts as read. */
const DWELL_MS = 1500;
const MARGIN = 40;

/**
 * Tracks reading in the continuous document. For every open chapter on screen it records
 * the furthest block shown, and "done" once the chapter's end has been on screen.
 * Also reports which chapter is at the top of the view. Progress never moves backwards.
 */
export function useDocumentProgress(
  scroller: RefObject<HTMLElement | null>,
  book: Book,
  update: UpdateAnnotations,
  onCurrentChapter: (index: number) => void,
) {
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    let ready = false;

    const measure = () => {
      const view = el.getBoundingClientRect();
      const sections = Array.from(el.querySelectorAll<HTMLElement>('section[data-chapter]'));
      let current = 0;
      sections.forEach((s, i) => {
        if (s.getBoundingClientRect().top <= view.top + 80) current = i;
      });
      onCurrentChapter(current);
      if (!ready) return;

      const seen: { id: string; furthest: number; done: boolean }[] = [];
      for (const s of sections) {
        const rect = s.getBoundingClientRect();
        if (rect.bottom < view.top + MARGIN || rect.top > view.bottom - MARGIN) continue;
        const chapter = book.chapters.find((c) => c.id === s.dataset.chapter);
        const blocks = Array.from(s.querySelectorAll<HTMLElement>('[data-block]'));
        if (!chapter || !blocks.length) continue;
        let furthest = -1;
        for (const b of blocks) {
          if (b.getBoundingClientRect().top < view.bottom - 24) furthest = Number(b.dataset.block);
          else break;
        }
        const done = rect.bottom <= view.bottom;
        if (done) furthest = chapter.blocks.length - 1;
        if (furthest >= 0) seen.push({ id: chapter.id, furthest, done });
      }
      if (seen.length) record(seen);
    };

    const record = (seen: { id: string; furthest: number; done: boolean }[]) => {
      update((a) => {
        let progress = a.progress;
        for (const { id, furthest, done } of seen) {
          const prev = progress[id];
          if (prev && prev.furthestBlock >= furthest && (prev.done || !done)) continue;
          const chapter = book.chapters.find((c) => c.id === id)!;
          const blockIndex = Math.max(furthest, prev?.furthestBlock ?? -1);
          const next: ChapterProgress = {
            furthestBlock: blockIndex,
            furthestEnd: blockEnd(chapter.blocks[blockIndex]),
            done: (prev?.done ?? false) || done,
          };
          progress = { ...progress, [id]: next };
        }
        return progress === a.progress ? a : { ...a, progress };
      });
    };

    let frame = 0;
    const onScroll = () => {
      ready = true;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const dwell = setTimeout(() => {
      ready = true;
      measure();
    }, DWELL_MS);
    measure();

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(dwell);
      cancelAnimationFrame(frame);
      el.removeEventListener('scroll', onScroll);
    };
  }, [scroller, book, update, onCurrentChapter]);
}
