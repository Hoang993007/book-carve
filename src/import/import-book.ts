import type { Book, BookFormat } from '../lib/types';
import type { ParsedBook } from './epub-import';

/** Reads an EPUB or text-based PDF into a Book. Importers load lazily (pdf.js is large). */
export async function importBook(file: File): Promise<Book> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  const format: BookFormat | null = ext === 'epub' ? 'epub' : ext === 'pdf' ? 'pdf' : null;
  if (!format) throw new Error(`Chỉ nhận EPUB hoặc PDF: ${file.name}`);

  const data = await file.arrayBuffer();
  const fallbackTitle = file.name.replace(/\.[^.]+$/, '');
  let parsed: ParsedBook;
  if (format === 'epub') parsed = await (await import('./epub-import')).importEpub(data, fallbackTitle);
  else parsed = await (await import('./pdf-import')).importPdf(data, fallbackTitle);

  return {
    id: crypto.randomUUID(),
    title: parsed.title,
    format,
    addedAt: Date.now(),
    chapterCount: parsed.chapters.length,
    chapters: parsed.chapters,
  };
}
