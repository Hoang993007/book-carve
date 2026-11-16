# Book Carve

**A reader that treats books as raw material, not scripture.** Delete what you don't
need, write your own ideas straight into the page, and come back to a book that is
only the part worth keeping.

![The carved book: kept text, your own notes in blue, ⋯ where text was cut](docs/images/reader.png)

Most non-fiction books carry a few ideas inside a lot of packaging. Book Carve lets
you skim, cut the packaging away like lines in your own draft, and write how each idea
applies to your work, right where it appears. The original is never touched: one
shortcut shows everything again, struck through.

## A story

You buy a 300-page book on focus. Chapter one opens with the author's childhood, a
long anecdote about a friend, and a promise that chapter three will explain the
science. Somewhere on page 41 there is one sentence that actually changes how you
work: *start with two minutes*. You highlight it, maybe. You finish the book out of
duty, or more likely you don't.

Three months later, in the middle of a work day, you remember "there was something
about starting small..." Where? The highlights app shows a list of sentences torn
from their context. Rereading the book is out of the question. The idea is lost
exactly when you need it.

With Book Carve, you skim chapter one and press Backspace through the childhood
story and the anecdote. The sentence on page 41 stays, and right under it you type
*"Use this: open the journal for two minutes before email."* Chapter four looks like
filler, so you never open it; it stays folded as one line.

Three months later you open the book and it is one screen long: the few sentences
you kept, in the author's order, with your own words under each. Or you press
Ctrl+F, type "two minutes", and land on it in a second. The book became your tool.

Read the full idea and the research behind it in [docs/idea.md](docs/idea.md).

## What it does

- **Edit the book like a document.** Click to place a caret. Backspace hides a
  character, Ctrl+Backspace a word, a selection a whole passage. Short cuts simply
  vanish; longer ones leave a small ⋯ you can click to peek.
- **Write into the page.** Typing adds your own text inline at the caret; Enter starts
  a paragraph of your own. Your words are the only colored text on the page.
- **One continuous document.** The whole book in order, with a collapsible table of
  contents that shows what you read and how much you kept. Chapters you never opened
  fold to one line.
- **Find it again fast.** Ctrl+F searches only kept text and your own writing,
  ignoring Vietnamese diacritics.
- **Progress saves itself.** Pages for PDF, percentage for EPUB, "done" when a
  chapter's end has been on screen, and a "continue" button back to where you stopped.
- **Nothing is lost.** Every edit is an overlay with undo/redo. The original file is
  stored with the book, and re-parsing it later keeps your work.
- **Always at hand.** A small floating button above all windows opens and hides the
  reader.
- **Export** your carved version of a book to Markdown.
- **Write your own work.** A second space, "Viết", for your own stories and essays:
  works split into chapters (drag to reorder), a notebook per work for characters
  and outlines, word counts, status (draft / writing / done), autosave, and it
  reopens at the exact spot you stopped. A quick idea inbox catches loose thoughts;
  move one into the end of any chapter when its place is clear.
- **Keep the world your stories share.** A third space, "Thế giới", holds a setting
  apart from the chapters: pages of lore and research, and an atlas to look at.
  The atlas draws the lands as a relation diagram, lists the ages, the people and
  their ties, and the main line of the story with the parts not yet written, and
  every entry links back to the chapter it comes from. Works set in a world show
  on its row.

| Library | Original view (Ctrl+O) |
|---|---|
| ![Library](docs/images/library.png) | ![Original view with cut text struck through](docs/images/original.png) |

![Writing a work: chapters on the side, the chapter as a plain page](docs/images/writing.png)

Supports EPUB and PDFs with a text layer (scanned PDFs are not supported). The
interface is in Vietnamese.

## Keys

| Key | Action |
|---|---|
| Backspace / Delete | Hide the character before / after the caret (or the selection) |
| Ctrl+Backspace / Ctrl+Delete | Hide a word |
| Typing | Write your own text at the caret |
| Enter | Start your own paragraph below |
| Right-click | Restore hidden text in the selection, or delete your own text |
| Ctrl+Z / Ctrl+Y | Undo / redo |
| Ctrl+O | Carved view ↔ original view |
| Ctrl+B | Show / collapse the table of contents |
| Ctrl+F | Search kept text and your own text |

## Install

Download the Windows installer from
[Releases](https://github.com/Hoang993007/book-carve/releases/latest). It is not
code-signed, so SmartScreen may warn on first run: **More info → Run anyway**.

Or build it from source (Node 22+ and pnpm 10):

```bash
pnpm install
pnpm dist      # installer: release/Book Carve Setup <version>.exe
```

Or run it without installing:

```bash
pnpm install
pnpm app       # desktop app in development mode
pnpm dev       # browser-only version at http://localhost:5180 (data in IndexedDB)
```

`pnpm samples` writes a sample EPUB and PDF to `samples/` to try it out.

## Your data

Everything is plain files, by default in `Documents\BookCarve`:

```
books/<id>/meta.json          title, format, chapter count
books/<id>/book.json          parsed text (never changed after import)
books/<id>/annotations.json   cuts, your own text, progress
books/<id>/source.epub|pdf    the original file
books/<id>/book.prev.json     the previous parse, after a re-parse
writing/works/<id>/work.json  title, status, chapter order; "kind": "world" for a world,
                              "world": <id> on a work set in one
writing/works/<id>/parts/     one Markdown file per chapter (a world's pages)
writing/works/<id>/notebook.md
writing/works/<id>/removed/   chapters you removed, kept aside
writing/works/<id>/atlas.json a world's atlas: ages, places, people, stories, map layout
writing/ideas.json            the idea inbox
```

The atlas is read-only in the app for now. Its shape is `WorldAtlas` in
`src/world/atlas-types.ts`; each entry names its source chapters by the first 8
characters of their id.

To keep the library elsewhere (a synced folder, another drive), put
`{ "dataDir": "D:\\Books\\BookCarve" }` in `%APPDATA%\Book Carve\config.json`, or set
the `BOOK_CARVE_DATA` environment variable. Writes are atomic; deleting a book moves
its folder to the Recycle Bin.

## How it works

Electron app with a Vite + React 19 + TypeScript renderer.

- **Import** (`src/import`). EPUB is unzipped with JSZip; each spine file becomes a
  chapter, titled from the nav/NCX contents. PDF text comes from pdf.js and is rebuilt
  into paragraphs from line geometry: gaps, indentation, short last lines, list
  markers, running headers and footers dropped, paragraphs joined across page breaks.
  Bookmarks become chapters.
- **Overlay model** (`src/lib`). A chapter is a list of text blocks with character
  offsets. Cuts are merged `[start, end)` ranges; your own text is anchored at an
  offset or after a block. The parsed text itself never changes.
- **Editor** (`src/book`). The reading surface is `contentEditable`, but book text is
  never edited in the DOM: every `beforeinput` on it is turned into a model change
  (hide a range, create your own text) and the caret is put back. Your own text is
  edited natively and synced back. Input-method composition (Vietnamese IME) is
  handled at `compositionend`.
- **Re-parse** (`src/lib/remap.ts`). Rebuilds a book from its stored original with
  the current parser and moves cuts, notes and progress over by finding their
  surrounding text (whitespace-insensitive anchors), then reports what moved.
- **Desktop shell** (`electron/`). The main process owns the disk. The renderer
  talks to it only through a sandboxed preload bridge, sending ids and JSON, never
  paths.

```bash
pnpm test      # unit tests (Vitest)
pnpm smoke     # end-to-end run of the built app (Playwright + Electron)
```

## License

[AGPL-3.0](LICENSE). Made by [@Hoang993007](https://github.com/Hoang993007).
