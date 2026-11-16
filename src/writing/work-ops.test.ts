import { describe, expect, it } from 'vitest';
import { appendIdea, countWords, movePart, newPart, nextPartTitle } from './work-ops';

describe('countWords', () => {
  it('counts Vietnamese words the way writers do', () => {
    expect(countWords('  Trời   hôm nay\nđẹp quá. ')).toBe(5);
    expect(countWords(' \n ')).toBe(0);
  });
});

describe('movePart', () => {
  const parts = ['a', 'b', 'c'].map((t) => ({ ...newPart(t), id: t }));
  it('moves a chapter up and down', () => {
    expect(movePart(parts, 2, 0).map((p) => p.id)).toEqual(['c', 'a', 'b']);
    expect(movePart(parts, 0, 2).map((p) => p.id)).toEqual(['b', 'c', 'a']);
    expect(movePart(parts, 1, 9).map((p) => p.id)).toEqual(['a', 'c', 'b']);
    expect(movePart(parts, 1, 1)).toBe(parts);
  });
});

describe('nextPartTitle', () => {
  it('continues the chapter numbering', () => {
    expect(nextPartTitle([{ ...newPart('Chương 1') }])).toBe('Chương 2');
    expect(nextPartTitle([{ ...newPart('Mở đầu') }, { ...newPart('Chương 7') }])).toBe('Chương 8');
  });
});

describe('appendIdea', () => {
  it('adds the idea as a new paragraph at the end', () => {
    expect(appendIdea('Đoạn một.\n\n', ' Một ý mới ')).toBe('Đoạn một.\n\nMột ý mới\n');
    expect(appendIdea('', 'Ý')).toBe('Ý\n');
  });
});
