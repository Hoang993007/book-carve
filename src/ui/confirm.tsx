import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

export interface ConfirmOptions {
  title: string;
  body: string;
  confirm: string;
  danger?: boolean;
}

/** A modal confirm box. `ask` resolves true on confirm, false on cancel or Escape. */
export function useConfirm(): [ReactNode, (o: ConfirmOptions) => Promise<boolean>] {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const ask = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOpts(o);
      }),
    [],
  );

  const close = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpts(null);
  }, []);

  return [opts ? <ConfirmDialog opts={opts} onClose={close} /> : null, ask];
}

function ConfirmDialog({ opts, onClose }: { opts: ConfirmOptions; onClose: (ok: boolean) => void }) {
  const confirmBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{opts.title}</h2>
        <p>{opts.body}</p>
        <div className="modal-actions">
          <button onClick={() => onClose(false)}>Hủy</button>
          <button ref={confirmBtn} className={opts.danger ? 'primary danger' : 'primary'} onClick={() => onClose(true)}>
            {opts.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
