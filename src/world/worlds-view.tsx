import { useCallback, useEffect, useState } from 'react';
import { relativeTime } from '../lib/progress';
import { useConfirm } from '../ui/confirm';
import { MoreMenu } from '../ui/menu';
import { ReloadButton } from '../ui/reload-button';
import { SpaceTabs, type Space } from '../ui/space-tabs';
import { useToast } from '../ui/toast';
import { useWindowFocus } from '../ui/use-window-focus';
import type { Work } from '../writing/types';
import { workActions } from '../writing/work-actions';
import { newWorld } from '../writing/work-ops';
import { isWorld, listWorks, writing } from '../writing/writing-store';
import { worksIn } from './atlas-ops';
import './atlas.css';

interface Props {
  onOpen: (id: string) => void;
  onSwitch: (space: Space) => void;
}

/** The worlds your works are set in: each holds a map, the lore and the research the stories share. */
export function WorldsView({ onOpen, onSwitch }: Props) {
  const [all, setAll] = useState<Work[] | null>(null);
  const [confirmNode, confirm] = useConfirm();
  const toast = useToast();
  const fail = useCallback((e: unknown) => toast(e instanceof Error ? e.message : String(e), true), [toast]);

  const refresh = useCallback(async () => setAll(await listWorks()), []);
  useEffect(() => void refresh().catch(fail), [refresh, fail]);
  useWindowFocus(() => void refresh().catch(fail));

  const create = async () => {
    const world = newWorld('');
    await (await writing).saveWork(world);
    onOpen(world.id);
  };

  const worlds = (all ?? []).filter(isWorld);

  return (
    <div className="library writing">
      <header className="library-head">
        <SpaceTabs space="worlds" onSwitch={onSwitch} />
        <span className="muted">{worlds.length} thế giới</span>
        <ReloadButton onReload={() => refresh().catch(fail)} />
        <span className="spacer" />
        <button className="primary" onClick={() => void create().catch(fail)}>Thế giới mới</button>
      </header>
      {worlds.length > 0 && (
        <div className="book-table" role="table" aria-label="Thế giới">
          <div className="book-row world-row head" role="row">
            <span>Tên</span>
            <span>Truyện trong thế giới</span>
            <span className="num">Sửa lần cuối</span>
            <span />
          </div>
          {worlds.map((w) => {
            const stories = worksIn(w.id, all ?? []);
            return (
              <div key={w.id} className="book-row world-row" role="row">
                <button className="book-name" onClick={() => onOpen(w.id)}>
                  <span className="title">{w.title || 'Chưa đặt tên'}</span>
                  <span className="muted">{w.parts.length} trang</span>
                </button>
                <span className="muted">{stories.length ? stories.map((s) => s.title || 'Chưa đặt tên').join(', ') : 'Chưa có'}</span>
                <span className="muted num">{relativeTime(w.updatedAt)}</span>
                <MoreMenu label={`Thao tác với ${w.title}`} items={workActions(w, { confirm, toast, deleted: () => void refresh() })} />
              </div>
            );
          })}
        </div>
      )}
      {all && worlds.length === 0 && (
        <div className="empty-state">
          <p>Chưa có thế giới nào. Một thế giới giữ bản đồ, lịch sử, nhân vật và tư liệu mà các truyện của bạn dùng chung.</p>
        </div>
      )}
      {confirmNode}
    </div>
  );
}
