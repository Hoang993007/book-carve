import { describe, expect, it } from 'vitest';
import type { Work } from '../writing/types';
import { chapterIndex, chapterLabel, worksIn } from './atlas-ops';

const work = (id: string, parts: string[], extra: Partial<Work> = {}): Work => ({
  id,
  title: id,
  status: 'writing',
  parts: parts.map((p) => ({ id: p, title: `t-${p}`, words: 1 })),
  notebookWords: 0,
  createdAt: 0,
  updatedAt: 0,
  ...extra,
});

describe('chapterLabel', () => {
  it('numbers the main line and tags the version', () => {
    expect(chapterLabel({ part: 'x', group: 'chinh', order: 6, title: 'Lễ Moras', ver: 'v2', status: '' })).toBe('Chính 06 · Lễ Moras (v2)');
    expect(chapterLabel({ part: 'x', group: 'tu-lieu', title: 'Rồng', status: '' })).toBe('Tư liệu · Rồng');
  });
});

describe('chapterIndex', () => {
  it('finds a chapter by the start of its id, in any of the works', () => {
    const idx = chapterIndex([work('w1', ['aaaaaaaa-1']), work('w2', ['bbbbbbbb-2'])]);
    expect(idx.get('bbbbbbbb')).toMatchObject({ workId: 'w2', part: { id: 'bbbbbbbb-2' } });
  });

  it('leaves out an id that matches two chapters', () => {
    const idx = chapterIndex([work('w1', ['aaaaaaaa-1']), work('w2', ['aaaaaaaa-2'])]);
    expect(idx.has('aaaaaaaa')).toBe(false);
  });
});

describe('worksIn', () => {
  it('keeps the works set in the world, not the world itself', () => {
    const all = [work('world', [], { kind: 'world' }), work('a', [], { world: 'world' }), work('b', [])];
    expect(worksIn('world', all).map((w) => w.id)).toEqual(['a']);
  });
});
