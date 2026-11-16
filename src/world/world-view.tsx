import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconBack } from '../ui/icons';
import { ReloadButton } from '../ui/reload-button';
import { useToast } from '../ui/toast';
import type { Work } from '../writing/types';
import { WorkScreen } from '../writing/work-screen';
import { listWorks, writing } from '../writing/writing-store';
import { chapterIndex, worksIn, type ChapterRef } from './atlas-ops';
import type { WorldAtlas } from './atlas-types';
import { AtlasView } from './atlas-view';

interface Props {
  worldId: string;
  onBack: () => void;
  /** Opens a chapter of a work set in this world. */
  onOpenWorkPart: (workId: string, partId: string) => void;
}

type View = { kind: 'map' } | { kind: 'pages'; part?: string };

/** One world: its atlas to look at, and its pages (lore, research) to read and edit. */
export function WorldView({ worldId, onBack, onOpenWorkPart }: Props) {
  const [world, setWorld] = useState<Work | null | undefined>(undefined);
  const [atlas, setAtlas] = useState<WorldAtlas | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [view, setView] = useState<View | null>(null);
  const toast = useToast();
  const fail = useCallback((e: unknown) => toast(e instanceof Error ? e.message : String(e), true), [toast]);

  const load = useCallback(async () => {
    const store = await writing;
    const [w, a, all] = await Promise.all([store.getWork(worldId), store.getAtlas(worldId), listWorks()]);
    setWorld(w);
    setAtlas(a);
    setWorks(all);
    setView((v) => v ?? (a ? { kind: 'map' } : { kind: 'pages' }));
  }, [worldId]);

  useEffect(() => void load().catch(fail), [load, fail]);

  const members = useMemo(() => (world ? worksIn(world.id, works) : []), [world, works]);
  const chapters = useMemo(() => (world ? chapterIndex([world, ...members]) : new Map<string, ChapterRef>()), [world, members]);

  const openChapter = useCallback(
    (ref: ChapterRef) => (ref.workId === worldId ? setView({ kind: 'pages', part: ref.part.id }) : onOpenWorkPart(ref.workId, ref.part.id)),
    [worldId, onOpenWorkPart],
  );

  const show = (next: View) => {
    setView(next);
    if (next.kind === 'map') void load().catch(fail); // pages may have been renamed meanwhile
  };

  if (world === undefined || view === null) return null;
  if (world === null) {
    return (
      <div className="empty-state">
        <p>Không tìm thấy thế giới này.</p>
        <button onClick={onBack}>Về danh sách</button>
      </div>
    );
  }

  const switcher = (
    <div className="view-switch" role="tablist" aria-label="Xem">
      <button role="tab" aria-selected={view.kind === 'map'} className={view.kind === 'map' ? 'current' : undefined} disabled={!atlas} title={atlas ? undefined : 'Thế giới này chưa có bản đồ'} onClick={() => show({ kind: 'map' })}>
        Bản đồ
      </button>
      <button role="tab" aria-selected={view.kind === 'pages'} className={view.kind === 'pages' ? 'current' : undefined} onClick={() => show({ kind: 'pages' })}>
        Trang
      </button>
    </div>
  );

  if (view.kind === 'pages' || !atlas) {
    const initial = view.kind === 'pages' && view.part ? { ...world, last: { part: view.part, caret: 0 } } : world;
    return <WorkScreen key={`pages:${view.kind === 'pages' ? view.part ?? '' : ''}`} initial={initial} onBack={onBack} topbarExtra={switcher} backLabel="Về danh sách thế giới" />;
  }

  return (
    <div className="book-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={onBack} aria-label="Về danh sách thế giới" title="Về danh sách thế giới"><IconBack /></button>
        <span className="crumb"><span className="crumb-book">{world.title || 'Chưa đặt tên'}</span></span>
        {switcher}
        <span className="spacer" />
        {members.length > 0 && <span className="muted">Truyện: {members.map((m) => m.title || 'Chưa đặt tên').join(', ')}</span>}
        <ReloadButton onReload={() => load().catch(fail)} />
      </header>
      <AtlasView atlas={atlas} chapters={chapters} onOpenChapter={openChapter} />
    </div>
  );
}
