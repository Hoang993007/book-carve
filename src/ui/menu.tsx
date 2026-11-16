import { useEffect, useRef, useState } from 'react';
import { IconMore } from './icons';

export interface MenuEntry {
  label: string;
  run: () => void;
  shortcut?: string;
  danger?: boolean;
}

interface Props {
  items: MenuEntry[];
  label: string;
}

/** A "⋯" button that opens a small action menu. Secondary actions live here, not on screen. */
export function MoreMenu({ items, label }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="more" ref={root}>
      <button className="icon-btn" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <IconMore />
      </button>
      {open && (
        <div className="menu" role="menu">
          {items.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              className={it.danger ? 'danger' : undefined}
              onClick={() => {
                setOpen(false);
                it.run();
              }}
            >
              <span>{it.label}</span>
              {it.shortcut && <kbd>{it.shortcut}</kbd>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
