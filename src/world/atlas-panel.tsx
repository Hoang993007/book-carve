import type { ReactNode } from 'react';
import { chapterLabel, groupLabel, sourceName, type ChapterRef } from './atlas-ops';
import type { Character, Place, Story, WorldAtlas } from './atlas-types';

/** What the reading panel shows: a place, a person or a story (by its index in the atlas). */
export type Sel = { kind: 'place' | 'person' | 'story'; id: string };

export interface AtlasCtx {
  atlas: WorldAtlas;
  places: Record<string, Place>;
  people: Record<string, Character>;
  eraName: Record<string, string>;
  chapters: Map<string, ChapterRef>;
  openChapter: (ref: ChapterRef) => void;
  select: (sel: Sel) => void;
}

/** A chip that shows a story in the panel; dashed when the story is planned but not written. */
export function StoryChip({ story, ctx }: { story: Story; ctx: AtlasCtx }) {
  const cls = story.part ? story.group : 'gap';
  return (
    <button className={`chip ${cls}`} onClick={() => ctx.select({ kind: 'story', id: String(ctx.atlas.stories.indexOf(story)) })}>
      {story.title}
    </button>
  );
}

function Sources({ ids, ctx }: { ids: string[]; ctx: AtlasCtx }) {
  if (!ids.length) return null;
  return (
    <>
      <h3>Chương nguồn</h3>
      <ul className="sources">
        {ids.map((id) => {
          const ref = ctx.chapters.get(id);
          return (
            <li key={id}>
              {ref ? <button className="link-btn" onClick={() => ctx.openChapter(ref)}>{sourceName(ctx.atlas, ctx.chapters, id)}</button> : sourceName(ctx.atlas, ctx.chapters, id)}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Head({ title, aka }: { title: string; aka?: ReactNode }) {
  return (
    <>
      <h2>{title}</h2>
      {aka && <div className="aka">{aka}</div>}
    </>
  );
}

function PlacePanel({ p, ctx }: { p: Place; ctx: AtlasCtx }) {
  const kids = ctx.atlas.places.filter((c) => c.parent === p.id);
  const tales = ctx.atlas.stories.filter((s) => s.place === p.id);
  return (
    <>
      <Head title={p.name} aka={p.aka} />
      <p>{p.summary}</p>
      {p.parent && ctx.places[p.parent] && (
        <p className="hint">
          Thuộc: <button className="link-btn" onClick={() => ctx.select({ kind: 'place', id: p.parent! })}>{ctx.places[p.parent].name}</button>
        </p>
      )}
      {kids.length > 0 && (
        <>
          <h3>Bên trong</h3>
          <div className="chips">{kids.map((k) => <button key={k.id} className="chip" onClick={() => ctx.select({ kind: 'place', id: k.id })}>{k.name}</button>)}</div>
        </>
      )}
      {tales.length > 0 && (
        <>
          <h3>Truyện xảy ra ở đây</h3>
          <div className="chips">{tales.map((s) => <StoryChip key={s.title} story={s} ctx={ctx} />)}</div>
        </>
      )}
      <Sources ids={p.src} ctx={ctx} />
    </>
  );
}

function PersonPanel({ c, ctx }: { c: Character; ctx: AtlasCtx }) {
  const rel = ctx.atlas.links.filter((l) => l[0] === c.id || l[1] === c.id);
  return (
    <>
      <Head title={c.name} aka={c.aka} />
      <p>{c.summary}</p>
      {rel.length > 0 && (
        <>
          <h3>Quan hệ</h3>
          <ul>
            {rel.map(([a, b, how]) => {
              const other = a === c.id ? b : a;
              return (
                <li key={`${a}-${b}`}>
                  <button className="link-btn" onClick={() => ctx.select({ kind: 'person', id: other })}>{ctx.people[other]?.name ?? other}</button> · {how}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <Sources ids={c.src} ctx={ctx} />
    </>
  );
}

function StoryPanel({ s, ctx }: { s: Story; ctx: AtlasCtx }) {
  const ref = s.part ? ctx.chapters.get(s.part) : undefined;
  return (
    <>
      <Head title={s.title} aka={`${groupLabel(s.group)}${s.ver ? ` · ${s.ver}` : ''} · ${s.part ? s.status : 'chưa có văn'}`} />
      {s.summary && <p>{s.summary}</p>}
      <h3>Thời đại</h3>
      <p>{(s.era && ctx.eraName[s.era]) || 'Chưa có'}</p>
      <h3>Nơi chốn</h3>
      <p>{(s.place && ctx.places[s.place]?.name) || 'Chưa có'}</p>
      <h3>Trong app</h3>
      {ref ? (
        <button className="primary" onClick={() => ctx.openChapter(ref)}>Mở chương “{ref.part.title || chapterLabel(s)}”</button>
      ) : (
        <p className="hint">{s.part ? 'Không tìm thấy chương này trong các tác phẩm của thế giới.' : 'Chưa có chương. Dàn ý nằm trong các trang tư liệu.'}</p>
      )}
    </>
  );
}

/** The reading panel beside the map and lists. */
export function AtlasPanel({ sel, ctx, fallback }: { sel: Sel | null; ctx: AtlasCtx; fallback: ReactNode }) {
  let body: ReactNode = fallback;
  if (sel?.kind === 'place' && ctx.places[sel.id]) body = <PlacePanel p={ctx.places[sel.id]} ctx={ctx} />;
  if (sel?.kind === 'person' && ctx.people[sel.id]) body = <PersonPanel c={ctx.people[sel.id]} ctx={ctx} />;
  if (sel?.kind === 'story' && ctx.atlas.stories[+sel.id]) body = <StoryPanel s={ctx.atlas.stories[+sel.id]} ctx={ctx} />;
  return <aside className="atlas-panel">{body}</aside>;
}
