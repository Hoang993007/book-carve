import type { BookSource } from '../lib/store';
import type { Book, BookFormat } from '../lib/types';
import type { ParsedBook } from './epub-import';

export interface ImportedBook {
  book: Book;
  source: BookSource;
}

/** Reads an EPUB or text-based PDF into a Book. Importers load lazily (pdf.js is large). */
export async function importBook(file: File): Promise<ImportedBook> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const format: BookFormat | null = ext === 'epub' ? 'epub' : ext === 'pdf' ? 'pdf' : null;
  if (!format) throw new Error(`Chỉ nhận EPUB hoặc PDF: ${file.name}`);

  const bytes = await file.arrayBuffer();
  const fallbackTitle = file.name.replace(/\.[^.]+$/, '');
  // Parsers get a copy: pdf.js transfers (detaches) the buffer it is given.
  let parsed: ParsedBook;
  if (format === 'epub') parsed = await (await import('./epub-import')).importEpub(bytes.slice(0), fallbackTitle);
  else parsed = await (await import('./pdf-import')).importPdf(bytes.slice(0), fallbackTitle);

  const book: Book = {
    id: crypto.randomUUID(),
    title: parsed.title,
    format,
    addedAt: Date.now(),
    chapterCount: parsed.chapters.length,
    chapters: parsed.chapters,
  };
  return { book, source: { ext: format, bytes } };
}
