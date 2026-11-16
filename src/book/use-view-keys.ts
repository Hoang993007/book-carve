import { useEffect, useRef } from 'react';

interface Handlers {
  toggleMode: () => void;
  toggleToc: () => void;
  openSearch: () => void;
  escape: () => void;
}

/** View shortcuts: O compact/original · [ contents · Ctrl+F search · Escape closes overlays. */
export function useViewKeys(handlers: Handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const h = ref.current;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        h.openSearch();
        return;
      }
      if (e.key === 'Escape') {
        h.escape();
        return;
      }
      const t = e.target;
      if (mod || e.altKey || (t instanceof HTMLElement && /^(TEXTAREA|INPUT)$/.test(t.tagName))) return;
      if (e.key === 'o' || e.key === 'O') h.toggleMode();
      else if (e.key === '[') h.toggleToc();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
