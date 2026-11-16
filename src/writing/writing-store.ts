import type { WorldAtlas } from '../world/atlas-types';
import type { Idea, PartRef, Work } from './types';

/** Where your own writing persists: Markdown files on disk in the app, IndexedDB in a plain browser. */
export interface WritingStore {
  listWorks(): Promise<Work[]>;
  getWork(id: string): Promise<Work | null>;
  saveWork(work: Work): Promise<void>;
  /** A chapter's text, or the notebook's; empty when nothing was written yet. */
  getText(workId: string, part: PartRef): Promise<string>;
  saveText(workId: string, part: PartRef, text: string): Promise<void>;
  /** Takes a chapter's text out of the work; on disk it is kept in the work's "removed" folder. */
  removePart(workId: string, partId: string): Promise<void>;
  deleteWork(id: string): Promise<void>;
  reveal(id: string): Promise<void>;
  getIdeas(): Promise<Idea[]>;
  saveIdeas(ideas: Idea[]): Promise<void>;
  /** A world's atlas (atlas.json beside its pages), or null when it has none. */
  getAtlas(worldId: string): Promise<WorldAtlas | null>;
}

declare global {
  interface Window {
    /** Set by the Electron preload script. */
    bookCarveWriting?: WritingStore;
  }
}

export const writing: Promise<WritingStore> = window.bookCarveWriting
  ? Promise.resolve(window.bookCarveWriting)
  : import('./writing-store-idb').then((m) => m.idbWritingStore);

export async function listWorks(): Promise<Work[]> {
  return (await (await writing).listWorks()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export const isWorld = (w: Work) => w.kind === 'world';
