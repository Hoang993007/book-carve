import { openDB, type DBSchema } from 'idb';
import type { Idea, Work } from './types';
import type { WritingStore } from './writing-store';

interface WritingDB extends DBSchema {
  works: { key: string; value: Work };
  texts: { key: string; value: string };
  ideas: { key: string; value: Idea[] };
}

const dbPromise = openDB<WritingDB>('book-carve-writing', 1, {
  upgrade(db) {
    db.createObjectStore('works', { keyPath: 'id' });
    db.createObjectStore('texts');
    db.createObjectStore('ideas');
  },
});

const key = (workId: string, part: string) => `${workId}/${part}`;

/** Browser-only store, used when running `pnpm dev` outside Electron. */
export const idbWritingStore: WritingStore = {
  listWorks: async () => (await dbPromise).getAll('works'),
  getWork: async (id) => (await (await dbPromise).get('works', id)) ?? null,
  saveWork: async (w) => void (await (await dbPromise).put('works', w)),
  getText: async (workId, part) => (await (await dbPromise).get('texts', key(workId, part))) ?? '',
  saveText: async (workId, part, text) => void (await (await dbPromise).put('texts', text, key(workId, part))),
  removePart: async (workId, partId) => void (await (await dbPromise).delete('texts', key(workId, partId))),
  async deleteWork(id) {
    const db = await dbPromise;
    const keys = (await db.getAllKeys('texts')).filter((k) => k.startsWith(`${id}/`));
    const tx = db.transaction(['works', 'texts'], 'readwrite');
    await Promise.all([tx.objectStore('works').delete(id), ...keys.map((k) => tx.objectStore('texts').delete(k)), tx.done]);
  },
  reveal: async () => {
    throw new Error('Chỉ có trong bản cài trên máy');
  },
  getIdeas: async () => (await (await dbPromise).get('ideas', 'all')) ?? [],
  saveIdeas: async (ideas) => void (await (await dbPromise).put('ideas', ideas, 'all')),
  async getAtlas(worldId) {
    const raw = await (await dbPromise).get('texts', key(worldId, 'atlas'));
    return raw ? JSON.parse(raw) : null;
  },
};
