import { takenChapters } from '../lib/taken';
import type { Annotations, Book } from '../lib/types';

/** "My version" of a book: kept text of what was read, own paragraphs as quotes. */
export function toMarkdown(book: Book, ann: Annotations): string {
  const lines: string[] = [`# ${book.title}`, ''];
  for (const ch of takenChapters(book, ann)) {
    lines.push(`## ${ch.title}`, '');
    for (const it of ch.items) {
      if (it.kind === 'note') lines.push(...it.text.trim().split('\n').map((l) => `> ${l}`), '');
      else if (it.heading) lines.push(`### ${it.text}`, '');
      else lines.push(it.text, '');
    }
  }
  return lines.join('\n').trimEnd() + '\n';
}

export function downloadMarkdown(book: Book, ann: Annotations) {
  const blob = new Blob([toMarkdown(book, ann)], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${book.title.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'book'} - ban cua toi.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
