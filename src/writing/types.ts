export type WorkStatus = 'draft' | 'writing' | 'done';

export const STATUS_LABEL: Record<WorkStatus, string> = { draft: 'Nháp', writing: 'Đang viết', done: 'Xong' };

/** One chapter of a work. Its text lives in its own Markdown file. */
export interface Part {
  id: string;
  title: string;
  words: number;
}

/** The notebook (characters, outline, research) sits beside the chapters, outside the manuscript. */
export const NOTEBOOK = 'notebook';
export type PartRef = string; // a Part id, or NOTEBOOK

/** A piece of your own writing: a story, an essay, a novel. A short piece is a work with one part. */
export interface Work {
  id: string;
  title: string;
  status: WorkStatus;
  parts: Part[];
  notebookWords: number;
  createdAt: number;
  updatedAt: number;
  /** Where you stopped, to continue right there. */
  last?: { part: PartRef; caret: number };
}

/** A loose idea captured quickly, later moved into a work. Used ideas are kept, just hidden. */
export interface Idea {
  id: string;
  text: string;
  createdAt: number;
  usedIn?: { workId: string; partId: string; at: number };
}
