import { parseSource } from '../import/import-book';
import { getAnnotations, getBook, getSource, replaceBook } from '../lib/db';
import { remapAnnotations } from '../lib/remap';
import type { Book } from '../lib/types';

/**
 * Parses a book again from its stored original with the current parser, carries the
 * reader's deletions, paragraphs and progress over, and returns a one-line summary.
 */
export async function reparseBook(id: string): Promise<string> {
  const [oldBook, ann, source] = await Promise.all([getBook(id), getAnnotations(id), getSource(id)]);
  if (!oldBook) throw new Error('Không tìm thấy sách');
  if (!source) throw new Error('Không có file gốc để tách lại (sách được thêm từ bản trình duyệt)');

  const parsed = await parseSource(source, oldBook.title);
  const newBook: Book = { ...oldBook, chapterCount: parsed.chapters.length, chapters: parsed.chapters };
  const { ann: remapped, report } = remapAnnotations(oldBook, newBook, ann);
  await replaceBook(newBook, remapped);

  const parts = [`${oldBook.chapterCount} → ${newBook.chapterCount} chương`];
  const deletions = report.deletionsKept + report.deletionsLost;
  if (deletions) parts.push(`giữ được ${report.deletionsKept}/${deletions} chỗ đã xóa`);
  if (report.deletionsGone) parts.push(`${report.deletionsGone} chỗ đã xóa không còn cần (bản tách mới đã tự bỏ phần chữ đó)`);
  const notes = report.notesKept + report.notesApprox;
  if (notes) {
    parts.push(
      report.notesApprox
        ? `${notes} đoạn của bạn (${report.notesApprox} đoạn không tìm lại đúng chỗ, đã đặt ở vị trí gần nhất)`
        : `${notes}/${notes} đoạn của bạn đúng chỗ`,
    );
  }
  return `Đã tách lại "${oldBook.title}": ${parts.join(', ')}. Bản tách cũ lưu ở book.prev.json.`;
}
