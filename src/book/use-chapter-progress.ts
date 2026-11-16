import { useEffect, useRef, type RefObject } from 'react';
import { blockEnd } from '../lib/chapter';
import type { Chapter, ChapterProgress } from '../lib/types';
import type { UpdateAnnotations } from './use-annotations';

/** Delay before a chapter that fits on screen counts as read without scrolling. */
const DWELL_MS = 1500;

/**
 * Records how far the reader got in a chapter: the furthest block that has been on
 * screen, and "done" once the end is reached. Progress never moves backwards.
 */
export function useChapterProgress(scroller: RefObject<HTMLElement | null>, chapter: Chapter, update: UpdateAnnotations) {
  const ready = useRef(false);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    ready.current = false;

    const measure = () => {
      if (!ready.current) return;
      const bottom = el.getBoundingClientRect().bottom;
      let furthest = -1;
      let lastSeen = true;
      for (const node of Array.from(el.querySelectorAll<HTMLElement>('[data-block]'))) {
        if (node.getBoundingClientRect().top < bottom - 24) furthest = Number(node.dataset.block);
        else {
          lastSeen = false;
          break;
        }
      }
      // Done once the last visible block has been on screen (or the page is scrolled to the end).
      const atEnd = lastSeen || el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
      if (atEnd) furthest = chapter.blocks.length - 1;
      if (furthest < 0) return;
      record(furthest, atEnd);
    };

    const record = (furthest: number, done: boolean) => {
      update((a) => {
        const prev = a.progress[chapter.id];
        if (prev && prev.furthestBlock >= furthest && (prev.done || !done)) return a;
        const blockIndex = Math.max(furthest, prev?.furthestBlock ?? -1);
        const next: ChapterProgress = {
          furthestBlock: blockIndex,
          furthestEnd: blockEnd(chapter.blocks[blockIndex]),
          done: (prev?.done ?? false) || done,
        };
        return { ...a, progress: { ...a.progress, [chapter.id]: next } };
      });
    };

    let frame = 0;
    const onScroll = () => {
      ready.current = true;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const dwell = setTimeout(() => {
      ready.current = true;
      measure();
    }, DWELL_MS);

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      clearTimeout(dwell);
      cancelAnimationFrame(frame);
      el.removeEventListener('scroll', onScroll);
    };
  }, [scroller, chapter, update]);
}
