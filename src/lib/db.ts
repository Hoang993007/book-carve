import type { BookSource, BookStore } from './store';
import { emptyAnnotations, type Annotations, type Book, type BookMeta } from './types';

const store: Promise<BookStore> = window.bookCarve
  ? Promise.resolve(window.bookCarve)
  : import('./store-idb').then((m) => m.idbStore);

/** True inside the Electron app, where deleting a book goes to the Recycle Bin. */
export const isDesktopApp = Boolean(window.bookCarve);

export const storageLocation = async (): Promise<string> => (await store).location();

export async function listBooks(): Promise<BookMeta[]> {
  return (await (await store).listBooks()).sort((a, b) => b.addedAt - a.addedAt);
}

export const listAnnotations = async (): Promise<Annotations[]> => (await store).listAnnotations();

export const saveBook = async (book: Book, source?: BookSource): Promise<void> => (await store).saveBook(book, source);

export const getBook = async (id: string): Promise<Book | null> => (await store).getBook(id);

export const deleteBook = async (id: string): Promise<void> => (await store).deleteBook(id);

export async function getAnnotations(bookId: string): Promise<Annotations> {
  return (await (await store).getAnnotations(bookId)) ?? emptyAnnotations(bookId);
}

export const saveAnnotations = async (a: Annotations): Promise<void> => (await store).saveAnnotations(a);
