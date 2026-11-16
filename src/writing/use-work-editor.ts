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
  const dirty = useRef<{ text: { part: PartRef; value: string } | null; work: boolean }>({ text: null, work: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const { text: t, work: w } = dirty.current;
    dirty.current = { text: null, work: false };
    if (!t && !w) return;
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
    dirty.current.work = true;
  }, []);

  const openPart = useCallback(
    async (next: PartRef, caret?: number) => {
      if (caret !== undefined) setCaret(caret);
      await flush();
      const keep = workRef.current.last?.part === next ? workRef.current.last.caret : 0;
      workRef.current = { ...workRef.current, last: { part: next, caret: keep } };
      setWork(workRef.current);
      dirty.current.work = true;
      partRef.current = next;
      setPart(next);
      setTextState(null);
    },
    [flush, setCaret],
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

  return { work, part, text, saving, setText, updateWork, openPart, setCaret, flush };
}
