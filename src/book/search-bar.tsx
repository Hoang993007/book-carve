import { useEffect, useRef } from 'react';
import { IconClose, IconDown, IconUp } from '../ui/icons';

interface Props {
  query: string;
  onQuery: (q: string) => void;
  count: number;
  index: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

/** Ctrl+F bar: Enter / Shift+Enter walk the matches, Escape closes. */
export function SearchBar({ query, onQuery, count, index, onNext, onPrev, onClose }: Props) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  return (
    <div className="search-bar" role="search">
      <input
        ref={input}
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Tìm trong phần đã giữ và ý của bạn"
        aria-label="Tìm trong sách"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
          } else if (e.key === 'Escape') onClose();
        }}
      />
      <span className="search-count">{query.trim() ? (count ? `${index + 1}/${count}` : 'Không thấy') : ''}</span>
      <button className="icon-btn" onClick={onPrev} aria-label="Kết quả trước" disabled={!count}><IconUp /></button>
      <button className="icon-btn" onClick={onNext} aria-label="Kết quả sau" disabled={!count}><IconDown /></button>
      <button className="icon-btn" onClick={onClose} aria-label="Đóng tìm kiếm"><IconClose /></button>
    </div>
  );
}
