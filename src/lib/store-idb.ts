import { openDB, type DBSchema } from 'idb';
import type { BookStore } from './store';
import type { Annotations, Book, BookMeta } from './types';

interface CarveDB extends DBSchema {
  meta: { key: string; value: BookMeta };
  books: { key: string; value: Book };
  annotations: { key: string; value: Annotations };
}

const dbPromise = openDB<CarveDB>('book-carve', 1, {
  upgrade(db) {
    db.createObjectStore('meta', { keyPath: 'id' });
    db.createObjectStore('books', { keyPath: 'id' });
    db.createObjectStore('annotations', { keyPath: 'bookId' });
  },
});

/** Browser-only store, used when running `pnpm dev` outside Electron. Source files are not kept. */
export const idbStore: BookStore = {
  location: async () => 'IndexedDB của trình duyệt',
  listBooks: async () => (await dbPromise).getAll('meta'),
  listAnnotations: async () => (await dbPromise).getAll('annotations'),
  getBook: async (id) => (await (await dbPromise).get('books', id)) ?? null,
  getAnnotations: async (id) => (await (await dbPromise).get('annotations', id)) ?? null,
  async saveBook(book) {
    const db = await dbPromise;
    const { chapters: _chapters, ...meta } = book;
    const tx = db.transaction(['meta', 'books'], 'readwrite');
    await Promise.all([tx.objectStore('meta').put(meta), tx.objectStore('books').put(book), tx.done]);
  },
  saveAnnotations: async (a) => {
    await (await dbPromise).put('annotations', a);
  },
  async deleteBook(id) {
    const db = await dbPromise;
    const tx = db.transaction(['meta', 'books', 'annotations'], 'readwrite');
    await Promise.all([
      tx.objectStore('meta').delete(id),
      tx.objectStore('books').delete(id),
      tx.objectStore('annotations').delete(id),
      tx.done,
    ]);
  },
};
