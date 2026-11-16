import { describe, expect, it } from 'vitest';
import { addRange, keptLength, overlaps, removeRange, segmentsOf } from './ranges';

describe('addRange', () => {
  it('keeps ranges sorted and merges overlapping or touching ones', () => {
    let r = addRange([], [10, 20]);
    r = addRange(r, [0, 5]);
    r = addRange(r, [30, 40]);
    expect(r).toEqual([[0, 5], [10, 20], [30, 40]]);
    expect(addRange(r, [5, 10])).toEqual([[0, 20], [30, 40]]);
    expect(addRange(r, [15, 35])).toEqual([[0, 5], [10, 40]]);
  });

  it('ignores empty ranges', () => {
    expect(addRange([[1, 2]], [5, 5])).toEqual([[1, 2]]);
  });
});

describe('removeRange', () => {
  it('splits a range that straddles the restored part', () => {
    expect(removeRange([[0, 100]], [40, 60])).toEqual([[0, 40], [60, 100]]);
  });

  it('removes covered ranges and trims partial ones', () => {
    expect(removeRange([[0, 10], [20, 30], [40, 50]], [5, 45])).toEqual([[0, 5], [45, 50]]);
  });
});

describe('segmentsOf', () => {
  it('splits a block into kept and deleted pieces, tagging each deleted piece with its range', () => {
    expect(segmentsOf([[5, 15]], 10, 20)).toEqual([
      { start: 10, end: 15, deleted: true, rangeStart: 5 },
      { start: 15, end: 20, deleted: false },
    ]);
    expect(segmentsOf([[12, 14]], 10, 20)).toEqual([
      { start: 10, end: 12, deleted: false },
      { start: 12, end: 14, deleted: true, rangeStart: 12 },
      { start: 14, end: 20, deleted: false },
    ]);
  });
});

describe('keptLength and overlaps', () => {
  it('counts only kept characters before the end', () => {
    expect(keptLength([[0, 10], [50, 200]], 100)).toBe(40);
  });

  it('detects overlap with deleted text', () => {
    expect(overlaps([[10, 20]], [19, 30])).toBe(true);
    expect(overlaps([[10, 20]], [20, 30])).toBe(false);
  });
});
