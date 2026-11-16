# Book Carve

Gọt sách: a reader that treats books as raw material, not scripture.

Read, select the text you don't need, press Backspace. Insert your own paragraphs
right where they belong. The source file is never modified: deletions and your
paragraphs are stored as an overlay, and "Show original" brings everything back.

## Goal

Not memorization. Pull out the ideas worth using, then find them again in seconds
when a real task reminds you of them, without rereading the book.

## Design

The carved book is the note. There is no separate notes pane: one reading surface
shows the whole book in order, with the contents beside it, with deleted text gone and your own paragraphs in
place. Chapters you have not touched fold to one line until you open them. Everything
secondary (search, re-parse, export, delete) is on demand; the contents sidebar
stays, since it gives the book its structure, and folds to a thin rail.

- Library: one row per book (progress, share of read text kept, own paragraphs, last
  opened); actions in each row's ⋯ menu, destructive ones behind a confirm box;
  drag and drop files to add.
- Reading: progress saves itself per chapter (pages for PDF, % for EPUB; "done" once
  the chapter's end has been on screen). "Tiếp tục" jumps back to where you stopped.
- Export "my version" of a book to Markdown.

The text behaves like a document you edit: click to place the caret, type, delete.
Book text is never changed; edits on it are recorded as hidden ranges and your own
text, so everything can be undone and the original is one shortcut away.

| Key | Action |
|---|---|
| Backspace / Delete | Hide the character before / after the caret (selection: hide it all) |
| Ctrl+Backspace / Ctrl+Delete | Hide a word |
| Typing | Write your own text inline, right at the caret |
| Enter | Start your own paragraph below the current one |
| Right-click | Restore hidden text in a selection, delete your own text |
| Ctrl+Z / Ctrl+Y | Undo / redo |
| Ctrl+O | Compact ↔ original (hidden text struck through) |
| Ctrl+B | Collapse / show the contents sidebar |
| Ctrl+F | Search kept text and your own text (diacritics ignored) |
| Esc | Close search |

Short cuts simply vanish; cuts of 20 characters or more leave a "⋯" you can click to
peek at them. Input methods (Vietnamese IME) work in book text and in your own text.

Later: cross-book search over kept text and own paragraphs, second-brain sync, AI fluff hints.

## Run

```bash
pnpm install
pnpm app        # desktop app (Electron) in development
pnpm dist       # Windows installer: release/Book Carve Setup <version>.exe
pnpm dev        # browser-only version at http://localhost:5180 (data in IndexedDB)
pnpm test
pnpm samples    # writes samples/sample.epub and samples/sample.pdf
pnpm smoke      # end-to-end check of the built app (pnpm build first; SMOKE_EXE=<exe> for the packaged one)
```

## Data

The desktop app stores everything as plain files under `E:\BookCarve\data`
(override with the `BOOK_CARVE_DATA` environment variable):

```
books/<id>/meta.json          title, format, chapter count
books/<id>/book.json          parsed text (never changed after import)
books/<id>/annotations.json   deletions, own paragraphs, progress
books/<id>/source.epub|pdf    the original file
books/<id>/book.prev.json     the previous parse, after a re-parse
```

"Tách lại" (re-parse) in the library parses the stored original again with the
current parser and carries deletions, own paragraphs and progress over by finding
their surrounding text in the new parse (`src/lib/remap.ts`). Paragraphs whose spot
cannot be found are placed at the same relative position; the result is reported.

Writes are atomic (temp file + rename). Deleting a book moves its folder to the
Recycle Bin. Back the folder up, or put it in a synced folder, like any other files.

## How it works

Vite + React + TypeScript renderer inside Electron. The main process
(`electron/`) owns the disk: the renderer reaches it only through the preload
bridge (`window.bookCarve`, context isolation and sandbox on), sending ids and JSON,
never paths. Outside Electron the same renderer falls back to IndexedDB.

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
