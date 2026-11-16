import { useState } from 'react';

const KEYS: [string, string][] = [
  ['Bôi đen + Backspace', 'Xóa phần đã chọn'],
  ['Enter', 'Chèn ý của bạn sau đoạn đang chọn'],
  ['Chuột phải', 'Khôi phục, xóa hoặc chèn ý'],
  ['Ctrl+Z / Ctrl+Y', 'Hoàn tác / làm lại'],
  ['O', 'Bản gọn ↔ bản gốc'],
  ['[', 'Mục lục'],
  ['Ctrl+F', 'Tìm trong sách'],
  ['Esc', 'Đóng mục lục, tìm kiếm'],
];

export function StatusBar({ saving }: { saving: boolean }) {
  const [help, setHelp] = useState(false);
  return (
    <footer className="statusbar">
      <span>{saving ? 'Đang lưu…' : 'Đã lưu'}</span>
      <span className="spacer" />
      <button className="link" onClick={() => setHelp((h) => !h)} aria-expanded={help}>
        Phím tắt
      </button>
      {help && (
        <div className="keys-popover" role="dialog" aria-label="Phím tắt" onMouseLeave={() => setHelp(false)}>
          {KEYS.map(([k, d]) => (
            <div key={k} className="keys-row">
              <kbd>{k}</kbd>
              <span>{d}</span>
            </div>
          ))}
        </div>
      )}
    </footer>
  );
}
