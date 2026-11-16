import { Fragment, type ReactNode } from 'react';
import { blockEnd } from '../lib/chapter';
import { segmentsOf, type Segment } from '../lib/ranges';
import type { Block, Chapter, Note, TextRange } from '../lib/types';
import { MARKER_MIN_CHARS } from './cut-runs';
import { NoteEl } from './note-el';

export type ViewMode = 'compact' | 'original';

interface Props {
  chapter: Chapter;
  ranges: TextRange[];
  notes: Note[];
  mode: ViewMode;
  /** Deleted ranges opened in place, keyed by their start offset. */
  expanded: ReadonlySet<number>;
  onToggleExpand: (rangeStart: number) => void;
  /** The opening cut continues the previous chapter's, whose "⋯" stands for both. */
  hideLead?: boolean;
}

const byTime = (a: Note, b: Note) => a.createdAt - b.createdAt;

/** Renders a chapter with deletions applied and the reader's own text in place (inline or as paragraphs). */
export function ChapterText(props: Props) {
  const { chapter, ranges, notes, mode } = props;
  const blockNotes = (i: number) =>
    notes
      .filter((n) => n.at === undefined && n.afterBlock === i)
      .sort(byTime)
      .map((n) => <NoteEl key={n.id} note={n} inline={false} />);

  return (
    <div className={`chapter-text ${mode}`}>
      {blockNotes(-1)}
      {chapter.blocks.map((block, i) => {
        const inline = notes.filter((n) => n.at !== undefined && n.afterBlock === i).sort((a, b) => a.at! - b.at! || byTime(a, b));
        const segments = segmentsOf(ranges, block.start, blockEnd(block));
        const pieces = renderBlock(block, splitAt(segments, inline), inline, props);
        const Tag = block.kind === 'h' ? 'h3' : 'p';
        const allCut = segments.every((s) => s.deleted) && !inline.length;
        return (
          <Fragment key={i}>
            {pieces.length > 0 && (
              <Tag data-block={i} data-start={block.start} className={allCut ? 'all-cut' : undefined}>
                {pieces}
              </Tag>
            )}
            {blockNotes(i)}
          </Fragment>
        );
      })}
    </div>
  );
}

/** Cuts segments where inline notes are anchored, so each note lands between two pieces. */
function splitAt(segments: Segment[], inline: Note[]): Segment[] {
  const points = [...new Set(inline.map((n) => n.at!))];
  return segments.flatMap((seg) => {
    const inside = points.filter((p) => p > seg.start && p < seg.end).sort((a, b) => a - b);
    const cuts = [seg.start, ...inside, seg.end];
    return cuts.slice(0, -1).map((start, k) => ({ ...seg, start, end: cuts[k + 1] }));
  });
}

function renderBlock(block: Block, segments: Segment[], inline: Note[], props: Props): ReactNode[] {
  const out: ReactNode[] = [];
  let next = 0;
  const notesUpTo = (pos: number) => {
    while (next < inline.length && inline[next].at! <= pos) {
      const n = inline[next++];
      out.push(<NoteEl key={n.id} note={n} inline />);
    }
  };
  for (const seg of segments) {
    notesUpTo(seg.start);
    const piece = renderSegment(block, seg, props);
    if (piece) out.push(piece);
  }
  notesUpTo(Infinity);
  return out;
}

function renderSegment(block: Block, seg: Segment, props: Props): ReactNode {
  const text = block.text.slice(seg.start - block.start, seg.end - block.start);
  if (!seg.deleted) return <span key={seg.start} data-s={seg.start}>{text}</span>;
  if (props.mode === 'original') return <span key={seg.start} data-s={seg.start} className="cut">{text}</span>;

  const rangeStart = seg.rangeStart ?? seg.start;
  // Small cuts just vanish, like deleted text in an editor; Ctrl+O shows them.
  const range = props.ranges.find(([a]) => a === rangeStart);
  if (range && range[1] - range[0] < MARKER_MIN_CHARS) return null;
  const open = props.expanded.has(rangeStart);
  const marker =
    seg.start === rangeStart && !(props.hideLead && rangeStart === 0) ? (
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
