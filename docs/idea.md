# The idea: books are tools, not scripture

## The problem

We are taught to treat a book as sacred: start on page one, read every word, finish
it, feel guilty if you don't. But a non-fiction book is also a product. It has to
reach a certain length to be sold, so a handful of ideas gets wrapped in stories,
repetition, promises of what the next chapter will reveal, and recaps of what the
last one said.

The useful core of many books is a few paragraphs. The rest is packaging.

Reading every word of the packaging is not respect for the author. It is time you
did not spend on the ideas, or on using them.

## The stance

Book Carve is an "anti book god" reader:

- **You don't have to finish.** Read the chapters that matter to you. Untouched
  chapters fold to a single line and stay out of the way.
- **You don't have to keep every word.** Delete what you don't need, the way you
  would delete lines from your own draft. The original is never destroyed: one
  shortcut shows it again, struck through.
- **Your own words matter more than the author's.** Write your thoughts straight
  into the page, inline or as a paragraph of your own. That is where you connect the
  idea to your work, and that is the part you will come back for.
- **The carved book is the note.** There is no separate notes app, no highlights
  list, no tags. What remains of the book, plus what you wrote into it, *is* your
  summary, in the author's order, with context around every idea.

## Delete, don't highlight

Most reading tools ask you to *select what to keep*: highlight, clip, copy into
notes. Book Carve does the opposite: you remove what you don't need.

- Deleting fits how skimming actually works. You move through the text and decide
  "not this, not this, this one". Deleting the "not this" parts is one keystroke
  each; your eye lands on what is left.
- What remains reads as continuous text, not a scattered list of quotes.
- Coming back later, you see only the kept text and your own writing. Rereading a
  carved chapter takes a minute instead of an hour.

The page behaves like a document in a text editor: click to place a caret,
Backspace hides a character, Ctrl+Backspace a word, a selection hides a whole
passage. Typing writes your own text right there; Enter starts your own paragraph.
Nothing is ever really deleted, and Ctrl+Z undoes anything.

## Retrieval, not memorization

The goal is not to remember the book. It is to **find an idea again in seconds** when
a real task reminds you of it ("there was something about starting with two
minutes...") without rereading.

So the app is built for retrieval:

- A carved book is short. Opening it shows only what you kept.
- Search (Ctrl+F) looks only at kept text and your own words, and ignores
  Vietnamese diacritics, so "hai phut" finds "hai phút".
- The table of contents stays beside the text and shows, for each chapter, whether
  you read it and how much you kept. It is the map of the book.
- Progress saves itself: pages for PDFs, percentage for EPUBs, and "done" once a
  chapter's end has been on screen. "Continue" jumps back to where you stopped.

There is deliberately no spaced repetition, no flashcards, no tagging. Those serve
memorization, which is a different goal.

## What research says

Book Carve's design leans on a few findings about how people read and look for
information:

- **Information foraging** (Pirolli & Card, Xerox PARC). People look for
  information the way animals forage: they follow cues ("information scent") and
  leave a source once its yield drops below what they could get elsewhere. Not
  finishing a book is rational behavior, not a failure. ([NN/g summary](https://www.nngroup.com/articles/information-foraging-leave-site/))
- **Skimming** (Duggan & Payne, 2009). With time for only half a text, skimmers
  remembered the important points better than people who read the first half
  carefully. Skimmers move on once the current part stops paying off.
  ([paper](https://researchportal.bath.ac.uk/en/publications/text-skimming-the-process-and-effectiveness-of-foraging-through-t/))
- **Speed reading** (Rayner et al., 2016). Reading faster costs comprehension; people
  who seem to read very fast usually already know the topic. Prior knowledge is
  what lets you cut boldly, and your own paragraphs are that knowledge growing.
  ([summary](https://www.psychologicalscience.org/news/releases/speed-reading-promises-are-too-good-to-be-true-scientists-find.html))
- **Learning techniques** (Dunlosky et al., 2013). Highlighting and rereading rate
  low. Deleting is a form of highlighting too, so on its own it does not create
  understanding. The value is in what you write. ([summary](https://www.psychologicalscience.org/news/releases/which-study-strategies-make-the-grade.html))
- **The generation effect** (Bertsch et al., 2007; Schindler & Richter, 2023).
  Information you produce yourself is remembered better than information you only
  read, especially when writing makes you think beyond the text, for example by
  linking it to your own work. That is why writing into the page has to be instant
  and frictionless. ([2007](https://pubmed.ncbi.nlm.nih.gov/17645161/),
  [2023](https://link.springer.com/article/10.1007/s10648-023-09758-w))

## Design principles

- **One surface.** The whole book is one continuous document with the contents
  beside it. No three-pane layout, no modes to switch between for reading and
  annotating.
- **Quiet by default.** No colors for decoration. Your own text is the only accent.
  Rare or destructive actions (re-parse, delete) live in a ⋯ menu behind a
  confirmation.
- **Nothing is lost.** Book text never changes. Deletions and your writing are an
  overlay saved next to an untouched copy of the original file. When the parser
  improves, "re-parse" rebuilds the book from the original and carries your work
  over by finding its surrounding text.
- **Always at hand.** A small floating button sits above all windows. Click it to
  bring the reader up when you have a few minutes, click again to put it away.
- **Plain files.** Your library is a folder of JSON files and the original books.
  Back it up, sync it, or read it with any tool.

## Not yet

Ideas for later: search across all books, sending kept passages to a personal
knowledge base, translation of a carved chapter, hints for likely filler.
