import { useEffect, useRef } from 'react';

interface Handlers {
  toggleMode: () => void;
  toggleToc: () => void;
  openSearch: () => void;
  escape: () => void;
}

/**
 * View shortcuts. The text is editable, so plain letters type: every view key needs Ctrl.
 * Ctrl+O compact/original · Ctrl+B contents sidebar · Ctrl+F search · Escape closes search.
 */
export function useViewKeys(handlers: Handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const h = ref.current;
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape') return h.escape();
      if (!mod || e.altKey || e.shiftKey) return;
      const k = e.key.toLowerCase();
      const action = k === 'f' ? h.openSearch : k === 'o' ? h.toggleMode : k === 'b' ? h.toggleToc : null;
      if (!action) return;
      e.preventDefault();
      action();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
