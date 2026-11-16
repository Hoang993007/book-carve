import { openDB, type DBSchema } from 'idb';
import { emptyAnnotations, type Annotations, type Book, type BookMeta } from './types';

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

export async function listBooks(): Promise<BookMeta[]> {
  const all = await (await dbPromise).getAll('meta');
  return all.sort((a, b) => b.addedAt - a.addedAt);
}

export async function listAnnotations(): Promise<Annotations[]> {
  return (await dbPromise).getAll('annotations');
}

export async function saveBook(book: Book): Promise<void> {
  const db = await dbPromise;
  const { chapters: _chapters, ...meta } = book;
  const tx = db.transaction(['meta', 'books'], 'readwrite');
  await Promise.all([tx.objectStore('meta').put(meta), tx.objectStore('books').put(book), tx.done]);
}

export async function getBook(id: string): Promise<Book | undefined> {
  return (await dbPromise).get('books', id);
}

export async function deleteBook(id: string): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction(['meta', 'books', 'annotations'], 'readwrite');
  await Promise.all([
    tx.objectStore('meta').delete(id),
    tx.objectStore('books').delete(id),
    tx.objectStore('annotations').delete(id),
    tx.done,
  ]);
}

export async function getAnnotations(bookId: string): Promise<Annotations> {
  return (await (await dbPromise).get('annotations', bookId)) ?? emptyAnnotations(bookId);
}

export async function saveAnnotations(a: Annotations): Promise<void> {
  await (await dbPromise).put('annotations', a);
}
