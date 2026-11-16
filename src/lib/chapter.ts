import type { Block, BlockKind, Chapter } from './types';

export interface RawBlock {
  kind: BlockKind;
  text: string;
  page?: number;
}

export function normalizeSpace(text: string): string {
  return text.replace(/\s+/g, ' ').trim().normalize('NFC');
}

/** Builds a chapter, giving each block its character offset. Empty blocks are dropped. */
export function makeChapter(id: string, title: string, raw: RawBlock[]): Chapter {
  const blocks: Block[] = [];
  let offset = 0;
  for (const r of raw) {
    const text = normalizeSpace(r.text);
    if (!text) continue;
    blocks.push({ kind: r.kind, text, start: offset, ...(r.page ? { page: r.page } : {}) });
    offset += text.length;
  }
  return { id, title: normalizeSpace(title), blocks, length: offset };
}

export const blockEnd = (b: Block) => b.start + b.text.length;
