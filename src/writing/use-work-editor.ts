import { useCallback, useEffect, useRef, useState } from 'react';
import { NOTEBOOK, type PartRef, type Work } from './types';
import { countWords } from './work-ops';
import { writing } from './writing-store';

const SAVE_DELAY = 700;

export interface WorkEditor {
  work: Work;
  part: PartRef;
  /** The open chapter's text; null while it loads. */
  text: string | null;
  saving: boolean;
  setText: (text: string) => void;
  updateWork: (fn: (w: Work) => Work) => void;
  /** Opens another chapter (or the notebook), saving first. `caret` is where you were in the current one. */
  openPart: (part: PartRef, caret?: number) => Promise<void>;
  /** Remembers where the caret is, for "continue where you stopped". */
  setCaret: (caret: number) => void;
  flush: () => Promise<void>;
  /**
   * Reads the work and the open chapter again from disk, for changes made outside the app.
   * Pending typing is saved first, so it is never lost. With `onlyIfClean`, does nothing while
   * there is unsaved typing (used when the window regains focus).
   */
  reload: (onlyIfClean?: boolean) => Promise<void>;
}

/**
 * Holds one open work and its current chapter, saving both a moment after you stop typing
 * (and right away when you switch chapter or leave). Word counts follow the text.
 */
export function useWorkEditor(initial: Work): WorkEditor {
  const [work, setWork] = useState(initial);
  const valid = (p: PartRef | undefined) => p === NOTEBOOK || initial.parts.some((x) => x.id === p);
  const [part, setPart] = useState<PartRef>(valid(initial.last?.part) ? initial.last!.part : initial.parts[0]?.id ?? NOTEBOOK);
  const [text, setTextState] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const workRef = useRef(work);
  const partRef = useRef(part);
  // Typing and work edits are "dirty"; a moved caret alone is not, so it never blocks a reload.
  const dirty = useRef<{ text: { part: PartRef; value: string } | null; work: boolean; caret: boolean }>({ text: null, work: false, caret: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const { text: t, work: w, caret: c } = dirty.current;
    dirty.current = { text: null, work: false, caret: false };
    if (!t && !w && !c) return;
    const store = await writing;
    if (t) await store.saveText(workRef.current.id, t.part, t.value);
    await store.saveWork(workRef.current);
    setSaving(false);
  }, []);

  const schedule = useCallback(() => {
    setSaving(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), SAVE_DELAY);
  }, [flush]);

  const updateWork = useCallback(
    (fn: (w: Work) => Work) => {
      workRef.current = fn(workRef.current);
      setWork(workRef.current);
      dirty.current.work = true;
      schedule();
    },
    [schedule],
  );

  const setText = useCallback(
    (value: string) => {
      setTextState(value);
      const p = partRef.current;
      dirty.current.text = { part: p, value };
      const words = countWords(value);
      updateWork((w) => ({
        ...w,
        updatedAt: Date.now(),
        ...(p === NOTEBOOK ? { notebookWords: words } : { parts: w.parts.map((x) => (x.id === p ? { ...x, words } : x)) }),
      }));
    },
    [updateWork],
  );

  const setCaret = useCallback((caret: number) => {
    const last = workRef.current.last;
    if (last?.part === partRef.current && last.caret === caret) return;
    workRef.current = { ...workRef.current, last: { part: partRef.current, caret } };
    setWork(workRef.current);
    dirty.current.caret = true;
  }, []);

  const openPart = useCallback(
    async (next: PartRef, caret?: number) => {
      if (caret !== undefined) setCaret(caret);
      await flush();
      const keep = workRef.current.last?.part === next ? workRef.current.last.caret : 0;
      workRef.current = { ...workRef.current, last: { part: next, caret: keep } };
      setWork(workRef.current);
      dirty.current.caret = true;
      partRef.current = next;
      setPart(next);
      setTextState(null);
    },
    [flush, setCaret],
  );

  const reload = useCallback(
    async (onlyIfClean = false) => {
      const busy = Boolean(dirty.current.text || dirty.current.work);
      if (busy && onlyIfClean) return;
      if (busy) await flush();
      const store = await writing;
      const fresh = await store.getWork(workRef.current.id);
      if (!fresh) return;
      const keep = partRef.current === NOTEBOOK || fresh.parts.some((x) => x.id === partRef.current);
      const p = keep ? partRef.current : fresh.parts[0]?.id ?? NOTEBOOK;
      const t = await store.getText(fresh.id, p);
      // Keep where the caret is now; it is saved with the fresh work on the next save.
      workRef.current = { ...fresh, last: workRef.current.last };
      setWork(workRef.current);
      partRef.current = p;
      setPart(p);
      setTextState(t);
    },
    [flush],
  );

  // Load the open chapter's text.
  useEffect(() => {
    let live = true;
    void writing.then((s) => s.getText(workRef.current.id, part)).then((t) => live && setTextState(t));
    return () => {
      live = false;
    };
  }, [part]);

  // Leaving the work saves what is pending.
  useEffect(() => () => void flush(), [flush]);

  return { work, part, text, saving, setText, updateWork, openPart, setCaret, flush, reload };
}
