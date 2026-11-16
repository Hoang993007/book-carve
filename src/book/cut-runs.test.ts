import { describe, expect, it } from 'vitest';
import { makeChapter } from '../lib/chapter';
import type { Note } from '../lib/types';
import { cutEdges, planCutRuns, shownCuts } from './cut-runs';

const intro = makeChapter('c1', 'Lời giới thiệu', [
  { kind: 'h', text: 'Lời giới thiệu' },
  { kind: 'p', text: 'Một đoạn dài kể chuyện tác giả gặp ai ở đâu.' },
]);
const preface = makeChapter('c2', 'Lời mở đầu', [
  { kind: 'h', text: 'Lời mở đầu' },
  { kind: 'p', text: 'Đoạn rào đón dài dòng trước khi vào ý.' },
  { kind: 'p', text: 'Ý chính của chương nằm ở đây.' },
]);
const note = (afterBlock: number, at?: number): Note => ({ id: 'n', chapterId: 'c2', afterBlock, at, text: 'ý', createdAt: 0 });

describe('shownCuts', () => {
  it('joins cuts with only blank text between, unless own text sits there', () => {
    const ch = makeChapter('c', 'T', [{ kind: 'p', text: 'aaaa bbbb cccc' }]);
    expect(shownCuts(ch, [[0, 4], [5, 9]], [])).toEqual([[0, 9]]);
    expect(shownCuts(ch, [[0, 4], [5, 9]], [{ ...note(0, 4), chapterId: 'c' }])).toEqual([[0, 4], [5, 9]]);
    expect(shownCuts(ch, [[0, 4], [10, 14]], [])).toEqual([[0, 4], [10, 14]]);
  });
});

describe('planCutRuns', () => {
  const whole = intro.length;
  const head = preface.blocks[2].start;
  const edges1 = cutEdges(intro, [[0, whole]], [], false);
  const edges2 = cutEdges(preface, [[0, head]], [], false);

  it('shows one marker for a cut chapter running into a cut opening of the next', () => {
    const runs = planCutRuns([{ id: 'c1', edges: edges1 }, { id: 'c2', edges: edges2 }]);
    expect([...runs.hideLead]).toEqual(['c2']);
    expect([...runs.joinsNext]).toEqual(['c1']);
    expect(runs.followers.get('c1:0')).toEqual([{ chapterId: 'c2', start: 0 }]);
  });

  it('keeps both markers when something visible sits between', () => {
    const titled = cutEdges(preface, [[0, head]], [], true);
    const withNote = cutEdges(preface, [[0, head]], [note(-1)], false);
    for (const e of [titled, withNote, null]) expect(planCutRuns([{ id: 'c1', edges: edges1 }, { id: 'c2', edges: e }]).hideLead.size).toBe(0);
  });

  it('lets a later marker stand for the run when the first cut is too short to show one', () => {
    const tiny = makeChapter('c0', 'x', [{ kind: 'p', text: 'Ngắn.' }]);
    const runs = planCutRuns([{ id: 'c0', edges: cutEdges(tiny, [[0, tiny.length]], [], false) }, { id: 'c1', edges: edges1 }]);
    expect(runs.hideLead.size).toBe(0);
    expect(runs.joinsNext.has('c0')).toBe(true);
  });
});
