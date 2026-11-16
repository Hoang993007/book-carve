import type { Part, Work } from '../writing/types';
import type { Story, WorldAtlas } from './atlas-types';

const GROUP: Record<Story['group'], string> = { chinh: 'Chính', mau: 'Mẩu', 'tu-lieu': 'Tư liệu' };
const pad = (n: number) => String(n).padStart(2, '0');

/** The name a story's chapter carries in the app, e.g. "Chính 06 · Lễ Moras (v2)". */
export function chapterLabel(s: Story): string {
  const num = s.group === 'chinh' && s.order !== undefined ? ` ${pad(s.order)}` : '';
  return `${GROUP[s.group]}${num} · ${s.title}${s.ver ? ` (${s.ver})` : ''}`;
}

export const groupLabel = (g: Story['group']) => GROUP[g];

/** A chapter the atlas can open: which work holds it, and the part itself. */
export interface ChapterRef {
  workId: string;
  part: Part;
}

/**
 * Finds the chapters an atlas refers to (by the first 8 characters of a part id) among the given
 * works, typically the world itself and the works set in it. An id matching several parts is left out.
 */
export function chapterIndex(works: Work[]): Map<string, ChapterRef> {
  const found = new Map<string, ChapterRef | null>();
  for (const w of works) {
    for (const part of w.parts) {
      const key = part.id.slice(0, 8);
      found.set(key, found.has(key) ? null : { workId: w.id, part });
    }
  }
  return new Map([...found].filter((e): e is [string, ChapterRef] => e[1] !== null));
}

/** What a source id reads as: the chapter's current title in the app, else the atlas's own label. */
export function sourceName(atlas: WorldAtlas, chapters: Map<string, ChapterRef>, id: string): string {
  if (id === 'astory') return 'A story';
  const ref = chapters.get(id);
  if (ref) return ref.part.title || 'Chưa đặt tên';
  const s = atlas.stories.find((x) => x.part === id);
  return s ? chapterLabel(s) : id;
}

/** Works that belong to a world, newest first: the ones that name it. */
export const worksIn = (worldId: string, works: Work[]) => works.filter((w) => w.world === worldId && w.kind !== 'world');
