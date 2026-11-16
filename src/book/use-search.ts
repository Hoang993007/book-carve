import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { foldForSearch } from '../lib/taken';

const ALL = 'carve-search';
const CURRENT = 'carve-search-current';

/**
 * Finds `query` in the text on screen (kept book text and the reader's paragraphs; folded
 * chapters and collapsed deletions are not searched), ignoring case and Vietnamese marks.
 * Matches are painted with the CSS Highlight API, so the DOM is never touched.
 */
export function useSearch(root: RefObject<HTMLElement | null>, scroller: RefObject<HTMLElement | null>, query: string, contentKey: unknown) {
  const [count, setCount] = useState(0);
  const [index, setIndex] = useState(0);
  const ranges = useRef<Range[]>([]);

  useEffect(() => {
    const el = root.current;
    const q = foldForSearch(query.trim());
    ranges.current = [];
    if (el && q) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.parentElement?.closest('button, textarea') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
      });
      for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
        const folded = foldForSearch(node.data);
        for (let at = folded.indexOf(q); at !== -1; at = folded.indexOf(q, at + q.length)) {
          const r = document.createRange();
          r.setStart(node, at);
          r.setEnd(node, at + q.length);
          ranges.current.push(r);
        }
      }
    }
    CSS.highlights.set(ALL, new Highlight(...ranges.current));
    setCount(ranges.current.length);
    setIndex(0);
  }, [root, query, contentKey]);

  const show = useCallback(
    (i: number) => {
      const r = ranges.current[i];
      const box = scroller.current;
      if (!r || !box) return;
      CSS.highlights.set(CURRENT, new Highlight(r));
      const rect = r.getBoundingClientRect();
      const view = box.getBoundingClientRect();
      if (rect.top < view.top + 60 || rect.bottom > view.bottom - 60) box.scrollTop += rect.top - view.top - view.height / 3;
    },
    [scroller],
  );

  useEffect(() => {
    if (count) show(index);
    else CSS.highlights.delete(CURRENT);
  }, [count, index, show]);

  useEffect(
    () => () => {
      CSS.highlights.delete(ALL);
      CSS.highlights.delete(CURRENT);
    },
    [],
  );

  const step = useCallback((delta: number) => setIndex((i) => (count ? (i + delta + count) % count : 0)), [count]);
  return { count, index, next: () => step(1), prev: () => step(-1) };
}
