import type { Annotations, Book, BookFormat, BookMeta } from './types';

/** The original file, kept next to the parsed book so it can be re-imported later. */
export interface BookSource {
  ext: BookFormat;
  bytes: ArrayBuffer;
}

/** Where books and annotations persist: files on disk in the app, IndexedDB in a plain browser. */
export interface BookStore {
  location(): Promise<string>;
  listBooks(): Promise<BookMeta[]>;
  listAnnotations(): Promise<Annotations[]>;
  getBook(id: string): Promise<Book | null>;
  getAnnotations(id: string): Promise<Annotations | null>;
  saveBook(book: Book, source?: BookSource): Promise<void>;
  saveAnnotations(a: Annotations): Promise<void>;
  deleteBook(id: string): Promise<void>;
  /** The original file saved at import; null when it was not kept (browser build). */
  getSource(id: string): Promise<{ ext: BookFormat; bytes: Uint8Array } | null>;
  /** Swaps in a re-parsed book and its remapped annotations, keeping the previous parse as a backup. */
  replaceBook(book: Book, a: Annotations): Promise<void>;
}

declare global {
  interface Window {
    /** Set by the Electron preload script. */
    bookCarve?: BookStore;
  }
}
