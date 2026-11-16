import { useMemo, useState, type ReactNode } from 'react';
import { foldForSearch, takenChapters } from '../lib/taken';
import type { Annotations, Book } from '../lib/types';

interface Props {
  book: Book;
  ann: Annotations;
  onJump: (chapterIndex: number, block: number) => void;
}

/** "What I took": the read, kept text and the reader's own paragraphs, searchable. */
export function TakenView({ book, ann, onJump }: Props) {
  const [query, setQuery] = useState('');
  const chapters = useMemo(() => takenChapters(book, ann), [book, ann]);
  const q = foldForSearch(query.trim());

  const visible = chapters
    .map((ch) => ({ ...ch, items: q ? ch.items.filter((it) => foldForSearch(it.text).includes(q)) : ch.items }))
    .filter((ch) => ch.items.length);

  return (
    <div className="taken">
      <div className="taken-head">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm trong phần đã giữ và đoạn của tôi"
          aria-label="Tìm kiếm"
          autoFocus
        />
      </div>
      {!chapters.length && (
        <p className="empty">Chưa có gì. Mở một chương trong mục lục, đọc, xóa phần thừa và chèn ý của bạn.</p>
      )}
      {chapters.length > 0 && !visible.length && <p className="empty">Không thấy "{query}".</p>}
      {visible.map((ch) => (
        <section key={ch.chapterIndex} className="taken-chapter">
          <h2>{ch.title}</h2>
          {ch.items.map((it, i) => (
            <button key={i} className={`taken-item ${it.kind}${it.kind === 'kept' && it.heading ? ' heading' : ''}`} onClick={() => onJump(ch.chapterIndex, it.block)}>
              {it.kind === 'note' ? <NoteText text={it.text} q={q} /> : highlight(it.text, q)}
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

function NoteText({ text, q }: { text: string; q: string }) {
  const [first, ...rest] = text.split('\n');
  return (
    <>
      <strong>{highlight(first, q)}</strong>
      {rest.length > 0 && <span className="note-rest">{highlight(rest.join('\n'), q)}</span>}
    </>
  );
}

function highlight(text: string, q: string): ReactNode {
  if (!q) return text;
  const source = text.normalize('NFC');
  const folded = foldForSearch(source);
  const parts: ReactNode[] = [];
  let from = 0;
  for (let at = folded.indexOf(q); at !== -1; at = folded.indexOf(q, at + q.length)) {
    parts.push(source.slice(from, at), <mark key={at}>{source.slice(at, at + q.length)}</mark>);
    from = at + q.length;
  }
  parts.push(source.slice(from));
  return parts;
}
