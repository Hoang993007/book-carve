import { useCallback, useEffect, useRef, useState } from 'react';
import { getAnnotations, saveAnnotations } from '../lib/db';
import type { Annotations } from '../lib/types';

export type UpdateAnnotations = (fn: (a: Annotations) => Annotations, opts?: { undoable?: boolean }) => void;

export interface AnnotationsApi {
  ann: Annotations | null;
  update: UpdateAnnotations;
  /** Undo/redo cover deletions and inserted or removed paragraphs, not reading progress. */
  undo: () => boolean;
  redo: () => boolean;
  saving: boolean;
  /** Saves pending changes now and stops writing (the book's files are about to be replaced). */
  flushAndClose: () => Promise<void>;
}

type Snapshot = Pick<Annotations, 'deleted' | 'notes'>;
const HISTORY = 200;

/** Loads a book's annotations, saves every change shortly after it happens, and keeps undo history. */
export function useAnnotations(bookId: string): AnnotationsApi {
  const [ann, setAnn] = useState<Annotations | null>(null);
  const [saving, setSaving] = useState(false);
  const latest = useRef<Annotations | null>(null);
  const dirty = useRef(false);
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const closed = useRef(false);

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
    if (!ann || !dirty.current || closed.current) return;
    const t = setTimeout(() => {
      if (closed.current) return;
      dirty.current = false;
      void saveAnnotations(ann).finally(() => setSaving(dirty.current));
    }, 300);
    return () => clearTimeout(t);
  }, [ann]);

  useEffect(() => {
    const flush = () => {
      if (dirty.current && latest.current && !closed.current) void saveAnnotations(latest.current);
    };
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, []);

  const commit = useCallback((next: Annotations) => {
    latest.current = next;
    dirty.current = true;
    setSaving(true);
    setAnn(next);
  }, []);

  const update = useCallback<UpdateAnnotations>(
    (fn, opts) => {
      const prev = latest.current;
      if (!prev) return;
      const next = fn(prev);
      if (next === prev) return;
      if (opts?.undoable) {
        past.current.push({ deleted: prev.deleted, notes: prev.notes });
        if (past.current.length > HISTORY) past.current.shift();
        future.current = [];
      }
      commit(next);
    },
    [commit],
  );

  const step = useCallback(
    (from: { current: Snapshot[] }, to: { current: Snapshot[] }) => {
      const cur = latest.current;
      const snap = from.current.pop();
      if (!cur || !snap) return false;
      to.current.push({ deleted: cur.deleted, notes: cur.notes });
      commit({ ...cur, ...snap });
      return true;
    },
    [commit],
  );

  const undo = useCallback(() => step(past, future), [step]);
  const redo = useCallback(() => step(future, past), [step]);

  const flushAndClose = useCallback(async () => {
    const pending = dirty.current && !closed.current ? latest.current : null;
    closed.current = true;
    dirty.current = false;
    if (pending) await saveAnnotations(pending);
  }, []);

  return { ann, update, undo, redo, saving, flushAndClose };
}
