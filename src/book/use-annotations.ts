import { useCallback, useEffect, useRef, useState } from 'react';
import { getAnnotations, saveAnnotations } from '../lib/db';
import type { Annotations } from '../lib/types';

export type UpdateAnnotations = (fn: (a: Annotations) => Annotations) => void;

/** Loads a book's annotations and saves every change shortly after it happens. */
export function useAnnotations(bookId: string): [Annotations | null, UpdateAnnotations] {
  const [ann, setAnn] = useState<Annotations | null>(null);
  const latest = useRef<Annotations | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    let alive = true;
    getAnnotations(bookId).then((a) => {
      if (!alive) return;
      latest.current = a;
      setAnn(a);
    });
    return () => {
      alive = false;
    };
  }, [bookId]);

  useEffect(() => {
    if (!ann || !dirty.current) return;
    const t = setTimeout(() => {
      dirty.current = false;
      void saveAnnotations(ann);
    }, 300);
    return () => clearTimeout(t);
  }, [ann]);

  useEffect(() => {
    const flush = () => {
      if (dirty.current && latest.current) void saveAnnotations(latest.current);
    };
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, []);

  const update = useCallback<UpdateAnnotations>((fn) => {
    setAnn((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      if (next !== prev) {
        dirty.current = true;
        latest.current = next;
      }
      return next;
    });
  }, []);

  return [ann, update];
}
