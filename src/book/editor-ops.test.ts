import { describe, expect, it } from 'vitest';
import { makeChapter } from '../lib/chapter';
import { backwardRange, chapterText, forwardRange } from './editor-ops';

const ch = makeChapter('c0', 'T', [
  { kind: 'p', text: 'Một câu ngắn.' },
  { kind: 'p', text: 'Đoạn hai rất hay.' },
]);
const text = chapterText(ch);
const second = ch.blocks[1].start;

describe('backwardRange', () => {
  it('hides the character before the caret, skipping hidden text', () => {
    expect(backwardRange(ch, text, [], 1, second + 4, false)).toEqual([second + 3, second + 4]);
    expect(backwardRange(ch, text, [[second + 2, second + 4]], 1, second + 4, false)).toEqual([second + 1, second + 2]);
  });

  it('stops at the start of the paragraph instead of reaching into the previous one', () => {
    expect(backwardRange(ch, text, [], 1, second, false)).toBeNull();
  });

  it('hides a whole word with Ctrl+Backspace, including the space before the caret', () => {
    const at = second + 'Đoạn hai '.length;
    expect(text.slice(...backwardRange(ch, text, [], 1, at, true)!)).toBe('hai ');
  });
});

describe('forwardRange', () => {
  it('hides the next character, and the next word with Ctrl+Delete', () => {
    expect(forwardRange(ch, text, [], 0, 0, false)).toEqual([0, 1]);
    expect(text.slice(...forwardRange(ch, text, [], 1, second, true)!)).toBe('Đoạn');
  });

  it('stops at the end of the paragraph', () => {
    expect(forwardRange(ch, text, [], 0, ch.blocks[0].text.length, false)).toBeNull();
  });
});
