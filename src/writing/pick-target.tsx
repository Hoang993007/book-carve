import { useEffect, useState } from 'react';
import type { Work } from './types';

interface Props {
  works: Work[];
  onPick: (workId: string, partId: string) => void;
  onClose: () => void;
}

/** Chooses the chapter an idea goes into: pick a work, then one of its chapters. */
export function PickTarget({ works, onPick, onClose }: Props) {
  const [workId, setWorkId] = useState(works[0]?.id ?? '');
  const work = works.find((w) => w.id === workId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal pick-target" role="dialog" aria-modal="true" aria-labelledby="pick-title">
        <h2 id="pick-title">Đưa ý vào đâu?</h2>
        <p>Ý được thêm thành một đoạn ở cuối chương bạn chọn.</p>
        <div className="pick-columns">
          <div className="pick-list" aria-label="Tác phẩm">
            {works.map((w) => (
              <button key={w.id} className={w.id === workId ? 'current' : undefined} onClick={() => setWorkId(w.id)}>
                {w.title || 'Chưa đặt tên'}
              </button>
            ))}
          </div>
          <div className="pick-list" aria-label="Chương">
            {work?.parts.map((p) => (
              <button key={p.id} onClick={() => onPick(work.id, p.id)}>
                {p.title || 'Chưa đặt tên'}
              </button>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
}
