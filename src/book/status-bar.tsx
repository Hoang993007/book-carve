import { useState } from 'react';

const KEYS: [string, string][] = [
  ['Backspace / Delete', 'Xóa ký tự (bôi đen để xóa cả khúc)'],
  ['Ctrl+Backspace', 'Xóa cả từ'],
  ['Gõ chữ', 'Viết ý của bạn ngay tại con trỏ'],
  ['Enter', 'Viết ý thành đoạn riêng bên dưới'],
  ['Chuột phải', 'Khôi phục phần đã xóa'],
  ['Ctrl+Z / Ctrl+Y', 'Hoàn tác / làm lại'],
  ['Ctrl+O', 'Bản gọn ↔ bản gốc'],
  ['Ctrl+B', 'Thu gọn / hiện mục lục'],
  ['Ctrl+F', 'Tìm trong sách'],
  ['Esc', 'Đóng tìm kiếm'],
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
