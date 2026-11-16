import { useState } from 'react';
import { IconReload } from './icons';

/** Reads data from disk again; spins while it works. */
export function ReloadButton({ onReload, label = 'Tải lại' }: { onReload: () => Promise<unknown>; label?: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className={`icon-btn reload-btn${busy ? ' busy' : ''}`}
      aria-label={label}
      title={`${label} (đọc lại từ ổ đĩa)`}
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void onReload().finally(() => setTimeout(() => setBusy(false), 300));
      }}
    >
      <IconReload />
    </button>
  );
}
