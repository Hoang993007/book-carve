import { useState } from 'react';
import { ContextMenu, type MenuItem } from '../book/context-menu';
import { IconCollapse, IconExpand } from '../ui/icons';
import { NOTEBOOK, type PartRef, type Work } from './types';

interface Props {
  work: Work;
  current: PartRef;
  open: boolean;
  onToggle: () => void;
  onOpenPart: (part: PartRef) => void;
  onAdd: () => void;
  onMove: (from: number, to: number) => void;
  onRemove: (partId: string) => void;
}

const fmt = new Intl.NumberFormat('vi-VN');

/** The work's chapters in order (drag to reorder, right-click for more), then its notebook. */
export function PartsSidebar({ work, current, open, onToggle, onOpenPart, onAdd, onMove, onRemove }: Props) {
  const noun = work.kind === 'world' ? 'Trang' : 'Chương';
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);

  if (!open) {
    return (
      <aside className="toc-side collapsed">
        <button className="icon-btn" onClick={onToggle} aria-label="Hiện danh sách chương" title="Hiện danh sách chương (Ctrl+B)">
          <IconExpand />
        </button>
      </aside>
    );
  }

  const partMenu = (i: number): MenuItem[] => [
    ...(i > 0 ? [{ label: 'Chuyển lên', run: () => onMove(i, i - 1) }] : []),
    ...(i < work.parts.length - 1 ? [{ label: 'Chuyển xuống', run: () => onMove(i, i + 1) }] : []),
    ...(work.parts.length > 1 ? [{ label: `Xóa ${noun.toLowerCase()}…`, run: () => onRemove(work.parts[i].id) }] : []),
  ];

  return (
    <aside className="toc-side parts-side">
      <div className="toc-head">
        <span>{noun}</span>
        <button className="icon-btn" onClick={onToggle} aria-label="Thu gọn danh sách chương" title="Thu gọn (Ctrl+B)">
          <IconCollapse />
        </button>
      </div>
      <nav className="toc-list" aria-label={noun}>
        {work.parts.map((p, i) => (
          <button
            key={p.id}
            className={`toc-item part-item${p.id === current ? ' current' : ''}${dropAt === i && dragFrom !== null ? ' drop-before' : ''}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move';
              setDragFrom(i);
            }}
            onDragOver={(e) => {
              if (dragFrom === null) return;
              e.preventDefault();
              const r = e.currentTarget.getBoundingClientRect();
              setDropAt(e.clientY < r.top + r.height / 2 ? i : i + 1);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragFrom !== null && dropAt !== null) onMove(dragFrom, dropAt > dragFrom ? dropAt - 1 : dropAt);
              setDragFrom(null);
              setDropAt(null);
            }}
            onDragEnd={() => {
              setDragFrom(null);
              setDropAt(null);
            }}
            onClick={() => onOpenPart(p.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              const items = partMenu(i);
              if (items.length) setMenu({ x: e.clientX, y: e.clientY, items });
            }}
          >
            <span className="toc-mark">{i + 1}</span>
            <span className="toc-title">{p.title || 'Chưa đặt tên'}</span>
            <span className="toc-meta">{fmt.format(p.words)} chữ</span>
          </button>
        ))}
        <button className="add-part" onClick={onAdd}>
          + Thêm {noun.toLowerCase()}
        </button>
        <div className="parts-sep" />
        <button className={`toc-item part-item${current === NOTEBOOK ? ' current' : ''}`} onClick={() => onOpenPart(NOTEBOOK)}>
          <span className="toc-mark" />
          <span className="toc-title">Sổ tay</span>
          <span className="toc-meta">Nhân vật, dàn ý, tư liệu · ngoài bản thảo</span>
        </button>
      </nav>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
    </aside>
  );
}
