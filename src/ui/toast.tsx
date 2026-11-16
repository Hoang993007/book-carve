import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type Show = (text: string, error?: boolean) => void;

const ToastContext = createContext<Show>(() => undefined);

/** Shows short messages at the bottom; lives above the screens so a message survives a reload. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback<Show>((text, error = false) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ text, error });
    // Errors stay until clicked.
    if (!error) timer.current = setTimeout(() => setToast(null), 7000);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className={`toast${toast.error ? ' error' : ''}`} role="status" onClick={() => setToast(null)} title="Bấm để đóng">
          {toast.text}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = (): Show => useContext(ToastContext);
