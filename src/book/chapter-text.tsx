import { Fragment } from 'react';
import { blockEnd } from '../lib/chapter';
import { segmentsOf, type Segment } from '../lib/ranges';
import type { Block, Chapter, Note, TextRange } from '../lib/types';
import { NoteBlock } from './note-block';

export type ViewMode = 'compact' | 'original';

export interface NoteHandlers {
  editingNote: string | null;
  onEditNote: (id: string | null) => void;
  onNoteChange: (id: string, text: string) => void;
}

interface Props extends NoteHandlers {
  chapter: Chapter;
  ranges: TextRange[];
  notes: Note[];
  mode: ViewMode;
  /** Deleted ranges opened in place, keyed by their start offset. */
  expanded: ReadonlySet<number>;
  onToggleExpand: (rangeStart: number) => void;
}

/** Renders a chapter with deletions applied and the reader's paragraphs in place. */
export function ChapterText(props: Props) {
  const { chapter, ranges, notes, mode } = props;
  const notesAfter = (i: number) => notes.filter((n) => n.afterBlock === i).sort((a, b) => a.createdAt - b.createdAt);
  const renderNotes = (i: number) =>
    notesAfter(i).map((n) => (
      <NoteBlock
        key={n.id}
        note={n}
        editing={props.editingNote === n.id}
        onEdit={() => props.onEditNote(n.id)}
        onChange={(text) => props.onNoteChange(n.id, text)}
        onDone={() => props.onEditNote(null)}
      />
    ));

  return (
    <div className={`chapter-text ${mode}`}>
      {renderNotes(-1)}
      {chapter.blocks.map((block, i) => {
        const segments = segmentsOf(ranges, block.start, blockEnd(block));
        const pieces = segments.map((seg) => renderSegment(block, seg, props)).filter(Boolean);
        const Tag = block.kind === 'h' ? 'h3' : 'p';
        return (
          <Fragment key={i}>
            {pieces.length > 0 && (
              <Tag data-block={i} className={segments.every((s) => s.deleted) ? 'all-cut' : undefined}>
                {pieces}
              </Tag>
            )}
            {renderNotes(i)}
          </Fragment>
        );
      })}
    </div>
  );
}

function renderSegment(block: Block, seg: Segment, props: Props) {
  const text = block.text.slice(seg.start - block.start, seg.end - block.start);
  if (!seg.deleted) return <span key={seg.start} data-s={seg.start}>{text}</span>;
  if (props.mode === 'original') return <span key={seg.start} data-s={seg.start} className="cut">{text}</span>;

  const rangeStart = seg.rangeStart ?? seg.start;
  const open = props.expanded.has(rangeStart);
  const marker =
    seg.start === rangeStart ? (
      <button
        key={`m${seg.start}`}
        className={`cut-marker${open ? ' open' : ''}`}
        contentEditable={false}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => props.onToggleExpand(rangeStart)}
        title={open ? 'Thu lại' : 'Hiện phần đã xóa'}
      >
        ⋯
      </button>
    ) : null;
  if (!open) return marker;
  return (
    <Fragment key={seg.start}>
      {marker}
      <span data-s={seg.start} className="cut">{text}</span>
    </Fragment>
  );
}
