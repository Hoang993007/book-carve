export type BlockKind = 'h' | 'p';

/** One paragraph or heading. `start` is its character offset inside the chapter text. */
export interface Block {
  kind: BlockKind;
  text: string;
  start: number;
  page?: number;
}

export interface Chapter {
  id: string;
  title: string;
  blocks: Block[];
  length: number;
}

export type BookFormat = 'epub' | 'pdf';

export interface BookMeta {
  id: string;
  title: string;
  format: BookFormat;
  addedAt: number;
  chapterCount: number;
}

export interface Book extends BookMeta {
  chapters: Chapter[];
}

/** Half-open character range [start, end) inside a chapter. */
export type TextRange = [number, number];

export interface Note {
  id: string;
  chapterId: string;
  /**
   * Block notes sit right after this block (-1: before the first block).
   * Inline notes (with `at`) sit inside this block.
   */
  afterBlock: number;
  /** Inline note: chapter offset where it is inserted into the book text. */
  at?: number;
  text: string;
  createdAt: number;
}

export interface ChapterProgress {
  furthestBlock: number;
  /** Character offset reached: end of the furthest block read. */
  furthestEnd: number;
  done: boolean;
}

/** Everything the reader adds on top of a book. The book text itself never changes. */
export interface Annotations {
  bookId: string;
  deleted: Record<string, TextRange[]>;
  notes: Note[];
  progress: Record<string, ChapterProgress>;
  lastChapter: number;
  lastOpenedAt?: number;
}

export const emptyAnnotations = (bookId: string): Annotations => ({
  bookId,
  deleted: {},
  notes: [],
  progress: {},
  lastChapter: 0,
});
