import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useConfirm } from '../ui/confirm';
import { IconBack } from '../ui/icons';
import { MoreMenu } from '../ui/menu';
import { ReloadButton } from '../ui/reload-button';
import { useToast } from '../ui/toast';
import { PartsSidebar } from './parts-sidebar';
import { NOTEBOOK, STATUS_LABEL, type Work, type WorkStatus } from './types';
import { useOutsideChanges } from './use-outside-changes';
import { useWorkEditor } from './use-work-editor';
import { workActions } from './work-actions';
import { movePart, newPart, nextPartTitle, totalWords } from './work-ops';
import { writing } from './writing-store';

const fmt = new Intl.NumberFormat('vi-VN');
const SIDE_KEY = 'bookcarve.parts-open';

function readSidePref(): boolean {
  try {
    return localStorage.getItem(SIDE_KEY) !== '0';
  } catch {
    return true;
  }
}

/** Writing one work: chapters on the side, the open chapter as a plain page, saved as you type. */
export function WorkScreen({ initial, onBack }: { initial: Work; onBack: () => void }) {
  const ed = useWorkEditor(initial);
  const { work, part, text } = ed;
  const [sideOpen, setSideOpen] = useState(readSidePref);
  const [confirmNode, confirm] = useConfirm();
  const toast = useToast();
  const page = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const caret = useRef(0);
  const restored = useRef<string | null>(null);
  const current = work.parts.find((p) => p.id === part);

  const fail = useCallback((e: unknown) => toast(e instanceof Error ? e.message : String(e), true), [toast]);
  const openPart = useCallback((p: string) => void ed.openPart(p, caret.current).catch(fail), [ed, fail]);
  const back = useCallback(() => {
    ed.setCaret(caret.current);
    void ed.flush().then(onBack, fail);
  }, [ed, onBack, fail]);

  // Once a chapter's text is in, put the caret back where you stopped and bring it into view.
  useLayoutEffect(() => {
    const el = area.current;
    if (text === null || !el || restored.current === part) return;
    restored.current = part;
    if (!work.title && !text) return titleInput.current?.focus();
    const at = Math.min(work.last?.part === part ? work.last.caret : 0, text.length);
    caret.current = at;
    el.focus({ preventScroll: true });
    el.setSelectionRange(at, at);
    const scroller = page.current;
    if (scroller && text.length) scroller.scrollTop = el.offsetTop + (at / text.length) * el.scrollHeight - scroller.clientHeight / 3;
  }, [text, part, work.title, work.last]);

  useEffect(() => {
    try {
      localStorage.setItem(SIDE_KEY, sideOpen ? '1' : '0');
    } catch {
      // Not remembered this time.
    }
  }, [sideOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'b') setSideOpen((o) => !o);
      else if (k === 's') void ed.flush().catch(fail);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ed, fail]);

  const reload = useOutsideChanges(ed, area, caret, fail);

  // Enter in a title moves on to the text (without carrying the line break over).
  const toText = (e: ReactKeyboardEvent) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;
    e.preventDefault();
    area.current?.focus();
  };

  const addPart = () => {
    const p = newPart(nextPartTitle(work.parts));
    ed.updateWork((w) => ({ ...w, parts: [...w.parts, p], updatedAt: Date.now() }));
    openPart(p.id);
  };

  const removePart = async (partId: string) => {
    const i = work.parts.findIndex((p) => p.id === partId);
    const p = work.parts[i];
    const ok = await confirm({
      title: `Xóa "${p.title || 'Chưa đặt tên'}"?`,
      body: `${fmt.format(p.words)} chữ. Nội dung được cất vào thư mục "removed" của tác phẩm, không mất hẳn.`,
      confirm: 'Xóa chương',
      danger: true,
    });
    if (!ok) return;
    if (partId === part) await ed.openPart(work.parts[i + 1]?.id ?? work.parts[i - 1].id, caret.current);
    await (await writing).removePart(work.id, partId);
    ed.updateWork((w) => ({ ...w, parts: w.parts.filter((x) => x.id !== partId), updatedAt: Date.now() }));
  };

  const menu = [
    { label: sideOpen ? 'Thu gọn danh sách chương' : 'Hiện danh sách chương', shortcut: 'Ctrl+B', run: () => setSideOpen((o) => !o) },
    ...workActions(work, { confirm, toast, deleted: onBack, beforeExport: ed.flush }),
  ];

  return (
    <div className="book-screen work-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={back} aria-label="Về danh sách tác phẩm" title="Về danh sách tác phẩm"><IconBack /></button>
        <input
          ref={titleInput}
          className="crumb-input"
          value={work.title}
          placeholder="Chưa đặt tên"
          aria-label="Tên tác phẩm"
          spellCheck={false}
          onChange={(e) => ed.updateWork((w) => ({ ...w, title: e.target.value, updatedAt: Date.now() }))}
          onKeyDown={toText}
        />
        <span className="spacer" />
        <ReloadButton onReload={() => reload().catch(fail)} />
        <select
          className="status-select"
          value={work.status}
          aria-label="Trạng thái"
          onChange={(e) => ed.updateWork((w) => ({ ...w, status: e.target.value as WorkStatus }))}
        >
          {(Object.keys(STATUS_LABEL) as WorkStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <MoreMenu label="Thêm" items={menu} />
      </header>
      <div className="reader-wrap">
        <PartsSidebar
          work={work}
          current={part}
          open={sideOpen}
          onToggle={() => setSideOpen((o) => !o)}
          onOpenPart={openPart}
          onAdd={addPart}
          onMove={(from, to) => ed.updateWork((w) => ({ ...w, parts: movePart(w.parts, from, to) }))}
          onRemove={(id) => void removePart(id).catch(fail)}
        />
        <div className="reader" ref={page}>
          <div className="writing-page">
            {part === NOTEBOOK ? (
              <h2 className="part-title static">Sổ tay</h2>
            ) : (
              <input
                className="part-title"
                value={current?.title ?? ''}
                placeholder="Tên chương"
                aria-label="Tên chương"
                spellCheck={false}
                onChange={(e) => ed.updateWork((w) => ({ ...w, parts: w.parts.map((p) => (p.id === part ? { ...p, title: e.target.value } : p)) }))}
                onKeyDown={toText}
              />
            )}
            {text !== null && (
              <textarea
                ref={area}
                className="manuscript"
                value={text}
                spellCheck={false}
                aria-label={part === NOTEBOOK ? 'Sổ tay' : 'Nội dung chương'}
                placeholder={part === NOTEBOOK ? 'Nhân vật, dàn ý, tư liệu… Phần này không nằm trong bản thảo.' : 'Viết ở đây…'}
                onChange={(e) => ed.setText(e.target.value)}
                onSelect={(e) => (caret.current = e.currentTarget.selectionStart)}
                onBlur={() => ed.setCaret(caret.current)}
              />
            )}
          </div>
        </div>
      </div>
      <footer className="statusbar">
        <span>{ed.saving ? 'Đang lưu…' : 'Đã lưu'}</span>
        <span className="spacer" />
        <span>
          {part === NOTEBOOK ? `Sổ tay: ${fmt.format(work.notebookWords)} chữ` : `Chương: ${fmt.format(current?.words ?? 0)} chữ`} · Cả tác phẩm: {fmt.format(totalWords(work))} chữ
        </span>
      </footer>
      {confirmNode}
    </div>
  );
}
