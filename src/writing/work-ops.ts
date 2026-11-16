import type { Idea, Part, Work } from './types';

/** Words as Vietnamese writers count "chữ": runs of non-space characters. */
export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

export const totalWords = (w: Work) => w.parts.reduce((n, p) => n + p.words, 0);

export function newPart(title: string): Part {
  return { id: crypto.randomUUID(), title, words: 0 };
}

export function newWork(title: string, now = Date.now()): Work {
  return { id: crypto.randomUUID(), title, status: 'draft', parts: [newPart('Chương 1')], notebookWords: 0, createdAt: now, updatedAt: now };
}

/** Moves the part at `from` to index `to` (both in the current order). */
export function movePart(parts: Part[], from: number, to: number): Part[] {
  if (from === to || from < 0 || from >= parts.length) return parts;
  const out = parts.slice();
  const [p] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(to, out.length)), 0, p);
  return out;
}

/** The next default title, "Chương N" (or "Trang N" in a world), after the highest number already used that way. */
export function nextPartTitle(parts: Part[], noun = 'Chương'): string {
  const pattern = new RegExp(`^${noun} (\\d+)$`);
  const used = parts.map((p) => pattern.exec(p.title)?.[1]).filter(Boolean).map(Number);
  return `${noun} ${Math.max(parts.length, ...used) + 1}`;
}

/** A new world starts with one page to describe it. */
export function newWorld(title: string, now = Date.now()): Work {
  return { ...newWork(title, now), kind: 'world', status: 'writing', parts: [newPart('Tổng quan')] };
}

/** Appends an idea to the end of a chapter's text, as its own paragraph. */
export function appendIdea(text: string, idea: string): string {
  const body = text.replace(/\s+$/, '');
  return body ? `${body}\n\n${idea.trim()}\n` : `${idea.trim()}\n`;
}

export const unusedIdeas = (ideas: Idea[]) => ideas.filter((i) => !i.usedIn).sort((a, b) => b.createdAt - a.createdAt);
