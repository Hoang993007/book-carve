import { useMemo, useState } from 'react';
import './atlas.css';
import { CastList, DiffsList, ErasList, StoriesList } from './atlas-lists';
import { AtlasMapView } from './atlas-map';
import type { ChapterRef } from './atlas-ops';
import { AtlasPanel, type AtlasCtx, type Sel } from './atlas-panel';
import type { WorldAtlas } from './atlas-types';

type Tab = 'map' | 'eras' | 'cast' | 'stories' | 'diffs';
const TABS: [Tab, string][] = [['map', 'Vùng đất'], ['eras', 'Thời đại'], ['cast', 'Nhân vật'], ['stories', 'Truyện'], ['diffs', 'Chỗ khác nhau']];
const TAB_KEY = 'bookcarve.atlas-tab';

function readTab(): Tab {
  try {
    const t = localStorage.getItem(TAB_KEY);
    return TABS.some(([k]) => k === t) ? (t as Tab) : 'map';
  } catch {
    return 'map';
  }
}

interface Props {
  atlas: WorldAtlas;
  chapters: Map<string, ChapterRef>;
  onOpenChapter: (ref: ChapterRef) => void;
}

/** A world to look at: its lands, ages, people and stories, each pointing back to the chapters it comes from. */
export function AtlasView({ atlas, chapters, onOpenChapter }: Props) {
  const [tab, setTabState] = useState<Tab>(readTab);
  const [sel, setSel] = useState<Sel | null>(null);

  const setTab = (t: Tab) => {
    setTabState(t);
    setSel(null);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      // Not remembered this time.
    }
  };

  const ctx: AtlasCtx = useMemo(
    () => ({
      atlas,
      places: Object.fromEntries(atlas.places.map((p) => [p.id, p])),
      people: Object.fromEntries(atlas.characters.map((c) => [c.id, c])),
      eraName: Object.fromEntries(atlas.eras.map((e) => [e.id, e.name])),
      chapters,
      openChapter: onOpenChapter,
      select: setSel,
    }),
    [atlas, chapters, onOpenChapter],
  );

  const fallback = {
    map: (
      <>
        <h2>Bấm vào một vùng</h2>
        <p className="hint">Mỗi vùng hiện điều đã viết về nó, những truyện xảy ra ở đó, và chương nguồn (bấm để mở).</p>
        {atlas.map && <p className="hint">{atlas.map.note}</p>}
        <div className="chips">
          {atlas.places.filter((p) => !p.parent && !atlas.map?.lands[p.id]).map((p) => (
            <button key={p.id} className="chip" onClick={() => setSel({ kind: 'place', id: p.id })}>{p.name}</button>
          ))}
        </div>
      </>
    ),
    eras: <><h2>{atlas.eras.length} thời đại</h2><p className="hint">Bấm một truyện để xem nó nằm ở đâu và mở chương của nó.</p></>,
    cast: <><h2>Nhân vật</h2><p className="hint">Bấm một người để xem họ và quan hệ của họ.</p></>,
    stories: <><h2>Truyện</h2><p className="hint">Bấm một truyện để xem thời đại, nơi chốn, và mở chương.</p></>,
    diffs: null,
  }[tab];

  return (
    <div className="atlas">
      <header className="atlas-head">
        <h1>{atlas.meta.title}</h1>
        <p className="hint">{atlas.meta.note}</p>
        <nav className="atlas-tabs" role="tablist" aria-label="Phần của bản đồ">
          {TABS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'current' : undefined} onClick={() => setTab(k)}>{label}</button>
          ))}
        </nav>
      </header>
      {tab === 'diffs' ? (
        <DiffsList ctx={ctx} />
      ) : (
        <div className="atlas-grid">
          <div className="atlas-main">
            {tab === 'map' &&
              (atlas.map ? (
                <div className="atlas-board">
                  <AtlasMapView map={atlas.map} places={ctx.places} selected={sel?.kind === 'place' ? sel.id : null} onPick={(id) => setSel({ kind: 'place', id })} />
                </div>
              ) : (
                <p className="hint">Thế giới này chưa có sơ đồ vùng đất.</p>
              ))}
            {tab === 'eras' && <ErasList ctx={ctx} />}
            {tab === 'cast' && <CastList ctx={ctx} sel={sel} />}
            {tab === 'stories' && <StoriesList ctx={ctx} />}
          </div>
          <AtlasPanel sel={sel} ctx={ctx} fallback={fallback} />
        </div>
      )}
    </div>
  );
}
