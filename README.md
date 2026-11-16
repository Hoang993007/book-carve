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
- Opening a book lands on "What I took": every paragraph you wrote, in book order,
  each with the kept text around it; click to jump to its spot.
- Search inside a book across kept text and your own paragraphs.
- Select + Backspace deletes; right-click restores struck text or inserts your own paragraph.
- Two views: compact (deleted text hidden, `⋯` marker expands in place) and original (deleted text struck through).
- Table of contents with read state and % of original text kept per chapter.
- Export "my version" of a book to Markdown.

Later: cross-book search over kept text and own paragraphs, second-brain sync, AI fluff hints.

## Stack

Local web app: Vite + React + TypeScript, epub.js for EPUB, pdf.js for PDF text,
IndexedDB for books and overlays. No server.
