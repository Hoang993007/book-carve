import { useEffect, useRef } from 'react';

export interface MenuItem {
  label: string;
  run: () => void;
}

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  const left = Math.min(x, window.innerWidth - 220);
  const top = Math.min(y, window.innerHeight - items.length * 36 - 16);
  return (
    <div ref={ref} className="context-menu" style={{ left, top }} role="menu">
      {items.map((it) => (
        <button
          key={it.label}
          role="menuitem"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onClose();
            it.run();
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
