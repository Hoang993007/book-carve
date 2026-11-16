import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import { IconBack } from '../ui/icons';
import { MoreMenu, type MenuEntry } from '../ui/menu';
import { ReloadButton } from '../ui/reload-button';
import { STATUS_LABEL, type Work, type WorkStatus } from './types';

interface Props {
  work: Work;
  titleInput: RefObject<HTMLInputElement | null>;
  backLabel: string;
  onBack: () => void;
  onTitle: (title: string) => void;
  /** Key handling in the title (Enter moves on to the text). */
  onTitleKey: (e: KeyboardEvent) => void;
  onStatus: (status: WorkStatus) => void;
  onReload: () => Promise<unknown>;
  menu: MenuEntry[];
  extra?: ReactNode;
}

/** The writing screen's top bar: back, the editable title, then reload, status (works only) and more. */
export function WorkTopbar({ work, titleInput, backLabel, onBack, onTitle, onTitleKey, onStatus, onReload, menu, extra }: Props) {
  const isWorld = work.kind === 'world';
  return (
    <header className="topbar">
      <button className="icon-btn" onClick={onBack} aria-label={backLabel} title={backLabel}><IconBack /></button>
      <input
        ref={titleInput}
        className="crumb-input"
        value={work.title}
        placeholder="Chưa đặt tên"
        aria-label={isWorld ? 'Tên thế giới' : 'Tên tác phẩm'}
        spellCheck={false}
        onChange={(e) => onTitle(e.target.value)}
        onKeyDown={onTitleKey}
      />
      {extra}
      <span className="spacer" />
      <ReloadButton onReload={onReload} />
      {!isWorld && (
        <select className="status-select" value={work.status} aria-label="Trạng thái" onChange={(e) => onStatus(e.target.value as WorkStatus)}>
          {(Object.keys(STATUS_LABEL) as WorkStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      )}
      <MoreMenu label="Thêm" items={menu} />
    </header>
  );
}
