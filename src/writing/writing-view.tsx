import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { storageLocation } from '../lib/db';
import { foldForSearch } from '../lib/taken';
import { useConfirm } from '../ui/confirm';
import { ReloadButton } from '../ui/reload-button';
import { SpaceTabs, type Space } from '../ui/space-tabs';
import { useToast } from '../ui/toast';
import { useWindowFocus } from '../ui/use-window-focus';
import { IdeasPanel } from './ideas-panel';
import { PickTarget } from './pick-target';
import type { Idea, Work } from './types';
import { appendIdea, countWords, newWork, unusedIdeas } from './work-ops';
import { WorkRow } from './work-row';
import { listWorks, writing } from './writing-store';

interface Props {
  onOpen: (id: string) => void;
  onSwitch: (space: Space) => void;
}

/** Your own writing: works on the left, loose ideas on the right. */
export function WritingView({ onOpen, onSwitch }: Props) {
  const [works, setWorks] = useState<Work[] | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [filter, setFilter] = useState('');
  const [placing, setPlacing] = useState<Idea | null>(null);
  const [location, setLocation] = useState('');
  const [confirmNode, confirm] = useConfirm();
  const toast = useToast();
  const filterInput = useRef<HTMLInputElement>(null);
  const fail = useCallback((e: unknown) => toast(e instanceof Error ? e.message : String(e), true), [toast]);

  const refresh = useCallback(async () => {
    const store = await writing;
    const [w, i] = await Promise.all([listWorks(), store.getIdeas()]);
    setWorks(w);
    setIdeas(i);
  }, []);

  useEffect(() => {
    void refresh().catch(fail);
    void storageLocation().then(setLocation);
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        filterInput.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [refresh, fail]);

  // Files may change outside the app (another editor, an assistant): read them again on return.
  useWindowFocus(() => void refresh().catch(fail));

  const saveIdeas = async (next: Idea[]) => {
    setIdeas(next);
    await (await writing).saveIdeas(next);
  };

  const create = async () => {
    const work = newWork('');
    await (await writing).saveWork(work);
    onOpen(work.id);
  };

  const place = async (idea: Idea, workId: string, partId: string) => {
    setPlacing(null);
    const store = await writing;
    const work = await store.getWork(workId);
    const part = work?.parts.find((p) => p.id === partId);
    if (!work || !part) return;
    const text = appendIdea(await store.getText(workId, partId), idea.text);
    await store.saveText(workId, partId, text);
    const now = Date.now();
    await store.saveWork({ ...work, updatedAt: now, parts: work.parts.map((p) => (p.id === partId ? { ...p, words: countWords(text) } : p)) });
    await saveIdeas(ideas.map((i) => (i.id === idea.id ? { ...i, usedIn: { workId, partId, at: now } } : i)));
    toast(`Đã đưa ý vào "${work.title || 'Chưa đặt tên'}" / ${part.title}`);
    await refresh();
  };

  const remove = async (idea: Idea) => {
    const ok = await confirm({ title: 'Xóa mẩu ý này?', body: idea.text.slice(0, 160), confirm: 'Xóa', danger: true });
    if (ok) await saveIdeas(ideas.filter((i) => i.id !== idea.id));
  };

  const rows = useMemo(() => {
    const q = foldForSearch(filter.trim());
    return (works ?? []).filter((w) => !q || foldForSearch(w.title).includes(q));
  }, [works, filter]);
  const open = unusedIdeas(ideas);

  return (
    <div className="library writing">
      <header className="library-head">
        <SpaceTabs space="writing" onSwitch={onSwitch} />
        <span className="muted">{works?.length ?? 0} tác phẩm</span>
        <ReloadButton onReload={() => refresh().catch(fail)} />
        <span className="spacer" />
        <input ref={filterInput} type="search" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Lọc theo tên  (Ctrl+F)" aria-label="Lọc tác phẩm" />
        <button className="primary" onClick={() => void create().catch(fail)}>
          Tác phẩm mới
        </button>
      </header>
      <div className="writing-grid">
        <div>
          {works && works.length > 0 && (
            <div className="book-table" role="table" aria-label="Tác phẩm">
              <div className="book-row work-row head" role="row">
                <span>Tên</span>
                <span>Trạng thái</span>
                <span className="num">Sửa lần cuối</span>
                <span />
              </div>
              {rows.map((w) => (
                <WorkRow key={w.id} work={w} onOpen={onOpen} ctx={{ confirm, toast, deleted: () => void refresh() }} />
              ))}
              {!rows.length && <p className="muted pad">Không có tác phẩm nào khớp "{filter}".</p>}
            </div>
          )}
          {works?.length === 0 && (
            <div className="empty-state">
              <p>Chưa có tác phẩm nào. Bấm "Tác phẩm mới" để bắt đầu: một truyện dài nhiều chương, hay một bài ngắn.</p>
            </div>
          )}
        </div>
        <IdeasPanel
          ideas={open}
          onAdd={(text) => void saveIdeas([...ideas, { id: crypto.randomUUID(), text, createdAt: Date.now() }]).catch(fail)}
          onUse={(idea) => (works?.length ? setPlacing(idea) : toast('Tạo một tác phẩm trước rồi đưa ý vào', true))}
          onDelete={(idea) => void remove(idea).catch(fail)}
        />
      </div>
      <footer className="library-foot muted">Mỗi chương là một file Markdown · Dữ liệu: {location}</footer>
      {placing && works && (
        <PickTarget works={works} onClose={() => setPlacing(null)} onPick={(w, p) => void place(placing, w, p).catch(fail)} />
      )}
      {confirmNode}
    </div>
  );
}
