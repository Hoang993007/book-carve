import { useEffect, useRef } from 'react';

/** Calls `onFocus` whenever the app window comes back to the front (files may have changed meanwhile). */
export function useWindowFocus(onFocus: () => void) {
  const latest = useRef(onFocus);
  latest.current = onFocus;
  useEffect(() => {
    const run = () => latest.current();
    window.addEventListener('focus', run);
    return () => window.removeEventListener('focus', run);
  }, []);
}
