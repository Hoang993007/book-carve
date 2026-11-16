import { useCallback, type RefObject } from 'react';
import { useWindowFocus } from '../ui/use-window-focus';
import type { WorkEditor } from './use-work-editor';

/**
 * Picks up changes made to the work's files outside the app (another editor, an assistant):
 * automatically when the window comes back to the front, unless there is unsaved typing, and on
 * demand through the returned function. The caret stays where it was.
 */
export function useOutsideChanges(
  ed: WorkEditor,
  area: RefObject<HTMLTextAreaElement | null>,
  caret: RefObject<number>,
  fail: (e: unknown) => void,
): (onlyIfClean?: boolean) => Promise<void> {
  const reload = useCallback(
    async (onlyIfClean = false) => {
      const at = caret.current ?? 0;
      await ed.reload(onlyIfClean);
      requestAnimationFrame(() => {
        const el = area.current;
        if (el && document.activeElement === el) el.setSelectionRange(Math.min(at, el.value.length), Math.min(at, el.value.length));
      });
    },
    [ed, area, caret],
  );
  useWindowFocus(() => void reload(true).catch(fail));
  return reload;
}
