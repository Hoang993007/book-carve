import { memo } from 'react';
import { foldForSearch } from '../lib/taken';
import type { Chapter, Note, TextRange } from '../lib/types';
import { ChapterText, type ViewMode } from './chapter-text';

interface Props {
  chapter: Chapter;
  index: number;
  /** Unread, untouched chapters stay folded to one line. */
  open: boolean;
  ranges: TextRange[] | undefined;
  notes: Note[];
  mode: ViewMode;
  expanded: ReadonlySet<number>;
  onToggleExpand: (chapterId: string, rangeStart: number) => void;
  onOpen: (index: number) => void;
  hideLead: boolean;
  joinsNext: boolean;
}

const EMPTY: TextRange[] = [];

/** Real pages for PDF; about 1500 characters a page for EPUB. */
function pageCount(chapter: Chapter): number {
  const first = chapter.blocks[0]?.page;
  const last = chapter.blocks[chapter.blocks.length - 1]?.page;
  if (first && last) return last - first + 1;
  return Math.max(1, Math.round(chapter.length / 1500));
}

/** The chapter's first paragraph is its title, so no separate title is shown when open. */
export const titleInText = (chapter: Chapter) =>
  chapter.blocks[0]?.kind === 'h' && foldForSearch(chapter.blocks[0].text) === foldForSearch(chapter.title);

/** One chapter of the continuous document. Memoized: typing in one chapter leaves the rest alone. */
export const ChapterSection = memo(function ChapterSection(props: Props) {
  const { chapter, index, open } = props;
  const className = `chapter${open ? '' : ' folded'}${props.joinsNext ? ' joins-next' : ''}`;
  return (
    <section className={className} data-chapter={chapter.id} id={`chapter-${index}`}>
      {(!open || !titleInText(chapter)) && (
        <h2 className="chapter-title" contentEditable={false}>
          {chapter.title}
        </h2>
      )}
      {open ? (
        <ChapterText
          chapter={chapter}
          ranges={props.ranges ?? EMPTY}
          notes={props.notes}
          mode={props.mode}
          expanded={props.expanded}
          onToggleExpand={(start) => props.onToggleExpand(chapter.id, start)}
          hideLead={props.hideLead}
        />
      ) : (
        <button className="unread" contentEditable={false} onClick={() => props.onOpen(index)}>
          Chưa đọc · {pageCount(chapter)} trang · Đọc chương này
        </button>
      )}
    </section>
  );
});
