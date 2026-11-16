import { StoryChip, type AtlasCtx, type Sel } from './atlas-panel';
import type { Character, Story } from './atlas-types';

const pad = (n: number) => String(n).padStart(2, '0');

/** The ages of the world, oldest first, with what was written about each and the stories set in it. */
export function ErasList({ ctx }: { ctx: AtlasCtx }) {
  return (
    <ol className="eras">
      {ctx.atlas.eras.map((e, i) => {
        const tales = ctx.atlas.stories.filter((s) => s.era === e.id);
        return (
          <li key={e.id} className="era">
            <span className="era-n">{i + 1}</span>
            <div className="era-body">
              <h3>{e.name}</h3>
              <div className="hint">{e.time}</div>
              <p>{e.summary}</p>
              {tales.length > 0 && <div className="chips">{tales.map((s) => <StoryChip key={s.title} story={s} ctx={ctx} />)}</div>}
              <details>
                <summary>{e.events.length} điều đã viết</summary>
                <ul>{e.events.map((ev) => <li key={ev.text}>{ev.text}</li>)}</ul>
              </details>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const CAST: [Character['group'], string][] = [['vita', 'Ở Vita'], ['ngoai', 'Ngoài Vita'], ['doi-dau', 'Phía đối đầu'], ['qua-khu', 'Người của quá khứ'], ['than', 'Thần']];

/** Everyone, grouped by where they stand; picking one shows them and their ties in the panel. */
export function CastList({ ctx, sel }: { ctx: AtlasCtx; sel: Sel | null }) {
  return (
    <div className="cast">
      {CAST.map(([g, title]) => {
        const people = ctx.atlas.characters.filter((c) => c.group === g);
        if (!people.length) return null;
        return (
          <section key={g}>
            <h3>{title}</h3>
            <div className="people">
              {people.map((c) => (
                <button key={c.id} className={`pick${sel?.kind === 'person' && sel.id === c.id ? ' on' : ''}`} onClick={() => ctx.select({ kind: 'person', id: c.id })}>
                  <b>{c.name}</b>
                  {c.aka && <small>{c.aka.split(';')[0]}</small>}
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const written = (s: Story) => /^văn(?! dở)|gần xong|trọn|truyện ngắn|truyền thuyết/.test(s.status);

/** The main line in reading order (gaps included), then the pieces by age, then the research. */
export function StoriesList({ ctx }: { ctx: AtlasCtx }) {
  const { stories, eras } = ctx.atlas;
  const main = stories.filter((s) => s.group === 'chinh');
  const pieces = (era: string | null) => stories.filter((s) => s.group === 'mau' && (s.era ?? null) === era);
  return (
    <div className="stories">
      <h3>Luồng chính</h3>
      <ol className="track">
        {main.map((s) => (
          <li key={s.title} className={s.part ? undefined : 'gap'}>
            <span className="track-n">{pad(s.order ?? 0)}</span>
            <button className="pick" onClick={() => ctx.select({ kind: 'story', id: String(stories.indexOf(s)) })}>
              <b>
                {s.title}
                <span className={`state ${!s.part ? 'none' : written(s) ? 'done' : 'draft'}`}>{s.part ? s.status : 'chưa có văn'}</span>
              </b>
              <small>{[s.era && ctx.eraName[s.era], s.place && ctx.places[s.place]?.name].filter(Boolean).join(' · ')}</small>
            </button>
          </li>
        ))}
      </ol>
      <h3>Mẩu truyện theo thời đại</h3>
      {[...eras.map((e) => e.id), null].map((era) => {
        const ss = pieces(era);
        if (!ss.length) return null;
        return (
          <div key={era ?? 'none'} className="piece-age">
            <div className="hint">{era ? ctx.eraName[era] : 'Chưa rõ thời nào'}</div>
            <div className="chips">{ss.map((s) => <StoryChip key={s.title} story={s} ctx={ctx} />)}</div>
          </div>
        );
      })}
      <h3>Tư liệu</h3>
      <div className="chips">
        {stories.filter((s) => s.group === 'tu-lieu').map((s) => <StoryChip key={s.title} story={s} ctx={ctx} />)}
      </div>
    </div>
  );
}

/** Where the drafts disagree, how the world ties to other works, and the threads left open. */
export function DiffsList({ ctx }: { ctx: AtlasCtx }) {
  const { conflicts, astory, open } = ctx.atlas;
  return (
    <div className="diffs">
      <h3>Chỗ hai bản nói khác nhau</h3>
      <p className="hint">“Chốt: ver 2” là bản đồ dùng cách ver 2 nói. “Chưa chốt” là cả hai cách còn nằm trong văn bản.</p>
      <div className="atlas-table">
        <table>
          <thead><tr><th>Chuyện gì</th><th>Ver 2</th><th>Ver 1</th><th>Bản đồ</th></tr></thead>
          <tbody>
            {conflicts.map((c) => (
              <tr key={c.topic}>
                <td><b>{c.topic}</b></td><td>{c.v2}</td><td>{c.v1}</td>
                <td className={c.status.startsWith('chốt') ? 'settled' : 'unsettled'}>{c.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {astory.length > 0 && (
        <>
          <h3>Nối với A story</h3>
          <p className="hint">Những cặp viết gần như cùng một thứ; có phải cùng một người dưới hai tên không thì chưa có.</p>
          <div className="atlas-table">
            <table>
              <thead><tr><th>Ở thế giới này</th><th>Ở A story</th></tr></thead>
              <tbody>{astory.map((a) => <tr key={a.vita}><td>{a.vita}</td><td>{a.astory}</td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}
      <h3>Mạch còn mở</h3>
      <ul className="open-threads">{open.map((o) => <li key={o}>{o}</li>)}</ul>
    </div>
  );
}
