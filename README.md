# Book Carve

Gọt sách: a reader that treats books as raw material, not scripture.

Read, select the text you don't need, press Backspace. Insert your own paragraphs
right where they belong. The source file is never modified: deletions and your
paragraphs are stored as an overlay, and "Show original" brings everything back.

## Goal

Not memorization. Pull out the ideas worth using, then find them again in seconds
when a real task reminds you of them, without rereading the book.

## MVP scope

- Import EPUB and text-based PDF.
- Opening a book lands on "What I took": the kept text of chapters you have read,
  with your own paragraphs standing out, in book order; click to jump to its spot.
  Untouched, unread chapters are left out.
- Progress saves itself per chapter: furthest point reached (pages for PDF,
  % for EPUB), what is left, and "done" once you reach the end. No buttons.
- Search inside a book across kept text and your own paragraphs.
- Select + Backspace deletes; right-click restores struck text or inserts your own paragraph.
- Two views: compact (deleted text hidden, `⋯` marker expands in place) and original (deleted text struck through).
- Table of contents with that progress and % of original text kept per chapter.
- Export "my version" of a book to Markdown.

Later: cross-book search over kept text and own paragraphs, second-brain sync, AI fluff hints.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:5180
pnpm test
pnpm samples    # writes samples/sample.epub and samples/sample.pdf to try it out
```

## How it works

Local web app: Vite + React + TypeScript. No server; everything lives in the
browser's IndexedDB (`meta`, `books`, `annotations` stores).

- Import (`src/import`): EPUB is unzipped with JSZip and each spine file becomes a
  chapter (titles from the nav/NCX table of contents). PDF text comes from pdf.js;
  lines are joined into paragraphs by line gaps and indentation, larger text becomes
  headings, top-level bookmarks become chapters (else 10-page chunks). Scanned PDFs
  without a text layer are rejected. Images are not kept.
- Overlay (`src/lib`): a chapter is a list of blocks with character offsets.
  Deletions are merged `[start, end)` ranges per chapter; own paragraphs sit after a
  block; progress keeps the furthest block reached. The parsed book text never changes.
- Reader (`src/book`): book text spans carry `data-s` offsets, so a browser selection
  maps straight to a character range.

Data stays in the browser profile it was created in. Clearing site data deletes it;
Markdown export is the backup for now.
