// End-to-end check of the built desktop app against a throwaway data folder.
// Usage: pnpm build && pnpm samples && pnpm smoke [screenshot-dir]
// Set SMOKE_EXE to a packaged "Book Carve.exe" to test the installed build instead.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { _electron } from 'playwright-core';

const dataDir = mkdtempSync(path.join(tmpdir(), 'book-carve-smoke-'));
const shots = process.argv[2];
if (shots) mkdirSync(shots, { recursive: true });
const env = { ...process.env, BOOK_CARVE_DATA: dataDir };
const exe = process.env.SMOKE_EXE;
const app = await _electron.launch(exe ? { executablePath: exe, args: [], env } : { args: ['.'], env });
const shot = async (page, name) => shots && page.screenshot({ path: path.join(shots, `${name}.png`) });
const annotationsOf = (dir) => JSON.parse(readFileSync(path.join(dir, 'annotations.json'), 'utf8'));

/** Two windows open: the reader (app page) and the floating button (a data: page). */
async function windowWhere(test) {
  for (let i = 0; i < 100; i++) {
    const w = app.windows().find((x) => test(x.url()));
    if (w) return w;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('window not found');
}
const readerVisible = () =>
  app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => !w.webContents.getURL().startsWith('data:')).isVisible());

try {
  const page = await windowWhere((u) => !u.startsWith('data:'));
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.waitForSelector('.library');

  await page.setInputFiles('input[type=file]', ['samples/sample.epub', 'samples/sample.pdf']);
  await page.waitForFunction(() => document.querySelectorAll('.book-row:not(.head)').length === 2, null, { timeout: 15000 });
  assert.match(await page.textContent('.library-foot'), new RegExp(path.basename(dataDir)));
  await shot(page, '1-library');

  // Open the EPUB: untouched chapters are folded; open chapter 1 from its folded line.
  await page.click('.book-name:has-text("Thói quen")');
  await page.waitForSelector('section.chapter.folded');
  await shot(page, '2-folded');
  await page.click('section:has-text("Chương 1") .unread');
  await page.waitForSelector('section[data-chapter="c1"] [data-block="1"]');

  // Select paragraph 1 and press Backspace; Ctrl+Z brings it back, Ctrl+Y removes it again.
  const select = (block) =>
    page.evaluate((b) => {
      const t = document.querySelector(`section[data-chapter="c1"] [data-block="${b}"] [data-s]`).firstChild;
      const r = document.createRange();
      r.setStart(t, 0);
      r.setEnd(t, t.length);
      getSelection().removeAllRanges();
      getSelection().addRange(r);
    }, block);
  await select(1);
  await page.keyboard.press('Backspace');
  await page.waitForSelector('section[data-chapter="c1"] .cut-marker');
  await page.keyboard.press('Control+Z');
  await page.waitForSelector('section[data-chapter="c1"] .cut-marker', { state: 'detached' });
  await page.keyboard.press('Control+Y');
  await page.waitForSelector('section[data-chapter="c1"] .cut-marker');

  // Caret editing. Put the caret at the end of paragraph 2 and Backspace once: one character hides.
  const caretIn = (block, at) =>
    page.evaluate(
      ([b, a]) => {
        const spans = document.querySelectorAll(`section[data-chapter="c1"] [data-block="${b}"] [data-s]`);
        const t = spans[spans.length - 1].firstChild;
        getSelection().collapse(t, a === 'end' ? t.length : a);
      },
      [block, at],
    );
  await caretIn(2, 'end');
  await page.keyboard.press('Backspace');
  await page.waitForFunction(() => /thoảng$/.test(document.querySelector('section[data-chapter="c1"] [data-block="2"]').textContent.trim()));

  // Typing in book text writes your own text inline, right at the caret.
  await caretIn(3, 5);
  await page.keyboard.type('ý hay');
  await page.waitForSelector('section[data-chapter="c1"] [data-block="3"] .note-inline:has-text("ý hay")');

  // Enter starts your own paragraph below; typing goes into it.
  await caretIn(2, 3);
  await page.keyboard.press('Enter');
  await page.waitForSelector('section[data-chapter="c1"] .note:not(.note-inline)');
  await page.keyboard.type('Ý của tôi: bắt đầu với hai phút.');
  await page.waitForTimeout(800); // debounced save
  await shot(page, '3-carved');

  const books = readdirSync(path.join(dataDir, 'books'));
  assert.equal(books.length, 2, 'one folder per book');
  const epubDir = books.map((id) => path.join(dataDir, 'books', id)).find((d) => readdirSync(d).includes('source.epub'));
  assert.ok(epubDir, 'original EPUB kept next to the parsed book');
  const ann = annotationsOf(epubDir);
  assert.equal(ann.deleted.c1.length, 2, 'paragraph cut and one character cut saved');
  const inline = ann.notes.find((n) => n.at !== undefined);
  const para = ann.notes.find((n) => n.at === undefined);
  assert.equal(inline?.text, 'ý hay', 'inline own text saved');
  assert.equal(inline?.afterBlock, 3, 'inline text sits in the paragraph it was typed in');
  assert.equal(para?.text, 'Ý của tôi: bắt đầu với hai phút.', 'own paragraph saved');
  assert.equal(para?.afterBlock, 2, 'own paragraph sits after the paragraph Enter was pressed in');

  // Ctrl+Z removes the paragraph you just wrote, Ctrl+Y brings it back.
  await page.keyboard.press('Control+Z');
  await page.waitForSelector('section[data-chapter="c1"] .note:not(.note-inline)', { state: 'detached' });
  await page.keyboard.press('Control+Y');
  await page.waitForSelector('section[data-chapter="c1"] .note:not(.note-inline)');
  await page.waitForTimeout(800);

  // Ctrl+F finds the own paragraph without diacritics.
  await page.keyboard.press('Control+F');
  await page.keyboard.type('hai phut');
  await page.waitForFunction(() => /\d+\/\d+/.test(document.querySelector('.search-count')?.textContent ?? ''));
  await shot(page, '4-search');
  await page.keyboard.press('Escape');

  // Contents sidebar: shown by default, current chapter marked, Ctrl+B folds it to a rail and back.
  await page.waitForSelector('.toc-side:not(.collapsed) .toc-item.current');
  await page.keyboard.press('Control+B');
  await page.waitForSelector('.toc-side.collapsed');
  await shot(page, '5-toc-collapsed');
  await page.click('.toc-side.collapsed .icon-btn');
  await page.waitForSelector('.toc-side:not(.collapsed)');
  await page.click('.toc-item:has-text("Lời mở đầu")');
  await page.waitForSelector('.toc-item.current:has-text("Lời mở đầu")');

  // Re-parse from the ⋯ menu, with confirmation: annotations survive, the old parse is kept.
  await page.click('.topbar .more .icon-btn');
  await shot(page, '6-menu');
  await page.click('.menu button:has-text("Tách lại")');
  await page.waitForSelector('.modal');
  await shot(page, '7-confirm');
  await page.click('.modal button.primary');
  await page.waitForSelector('.toast:has-text("Đã tách lại")', { timeout: 15000 });
  const after = annotationsOf(epubDir);
  assert.deepEqual(after.deleted, ann.deleted, 'deletion kept after re-parse');
  assert.deepEqual(after.notes.map((n) => n.text).sort(), ann.notes.map((n) => n.text).sort(), 'own text kept after re-parse');
  assert.ok(readdirSync(epubDir).includes('book.prev.json'), 'previous parse backed up');

  // Delete from the library menu goes through a confirm box; cancelling keeps the book.
  await page.click('.icon-btn[aria-label="Về thư viện"]');
  await page.click('.book-row:has-text("Small Habits") .more .icon-btn');
  await page.click('.menu button:has-text("Xóa sách")');
  await page.waitForSelector('.modal');
  await page.click('.modal button:has-text("Hủy")');
  assert.equal(readdirSync(path.join(dataDir, 'books')).length, 2, 'cancel keeps the book');

  // Writing: capture an idea, write a work with two chapters and a notebook, place the idea, resume.
  await page.click('.space-tabs button:has-text("Viết")');
  await page.fill('.idea-capture', 'Một ý cho chương đầu');
  await page.press('.idea-capture', 'Enter');
  await page.waitForSelector('.idea:has-text("Một ý cho chương đầu")');
  await page.click('button:has-text("Tác phẩm mới")');
  await page.waitForSelector('.crumb-input:focus');
  await page.keyboard.type('Truyện thử');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Đoạn mở đầu.');
  await page.click('.add-part');
  await page.waitForSelector('.part-item.current:has-text("Chương 2")');
  await page.click('.manuscript');
  await page.keyboard.type('Chương hai viết dở.');
  await page.click('.part-item:has-text("Sổ tay")');
  await page.click('.manuscript');
  await page.keyboard.type('Nhân vật: An.');
  await page.click('.part-item:has-text("Chương 2")');
  await page.waitForSelector('.manuscript');
  await page.click('.icon-btn[aria-label="Về danh sách tác phẩm"]');
  await page.waitForSelector('.work-row:has-text("Truyện thử")');

  await page.click('.idea .more .icon-btn');
  await page.click('.menu button:has-text("Đưa vào tác phẩm")');
  await page.click('.pick-list[aria-label="Chương"] button:has-text("Chương 1")');
  await page.waitForSelector('.idea', { state: 'detached' });
  const worksDir = path.join(dataDir, 'writing', 'works');
  const workDir = path.join(worksDir, readdirSync(worksDir)[0]);
  const work = JSON.parse(readFileSync(path.join(workDir, 'work.json'), 'utf8'));
  const partText = (i) => readFileSync(path.join(workDir, 'parts', `${work.parts[i].id}.md`), 'utf8');
  assert.equal(work.title, 'Truyện thử', 'work title saved');
  assert.deepEqual(work.parts.map((p) => p.title), ['Chương 1', 'Chương 2'], 'chapters saved in order');
  assert.equal(partText(0), 'Đoạn mở đầu.\n\nMột ý cho chương đầu\n', 'idea appended to the chosen chapter');
  assert.equal(partText(1), 'Chương hai viết dở.', 'second chapter saved as Markdown');
  assert.equal(readFileSync(path.join(workDir, 'notebook.md'), 'utf8'), 'Nhân vật: An.', 'notebook saved');
  assert.equal(work.parts[0].words, 8, 'word count follows the text');
  const ideas = JSON.parse(readFileSync(path.join(dataDir, 'writing', 'ideas.json'), 'utf8'));
  assert.ok(ideas[0].usedIn, 'placed idea kept, marked as used');

  // Reopening continues in the chapter you left; chapters reorder and are removed into "removed".
  await page.click('.work-row .book-name');
  await page.waitForSelector('.manuscript:focus');
  assert.equal(await page.inputValue('.manuscript'), 'Chương hai viết dở.', 'reopens the last chapter');
  await page.click('.part-item:has-text("Chương 2")', { button: 'right' });
  await page.click('.context-menu button:has-text("Chuyển lên")');
  await page.waitForSelector('.part-item:first-child:has-text("Chương 2")');
  await page.click('.part-item:has-text("Chương 1")', { button: 'right' });
  await page.click('.context-menu button:has-text("Xóa chương")');
  await page.click('.modal button:has-text("Xóa chương")');
  await page.waitForFunction(() => document.querySelectorAll('.parts-side .part-item').length === 2); // Chương 2 + Sổ tay
  await page.click('.icon-btn[aria-label="Về danh sách tác phẩm"]');
  await page.waitForSelector('.work-row');
  const after2 = JSON.parse(readFileSync(path.join(workDir, 'work.json'), 'utf8'));
  assert.deepEqual(after2.parts.map((p) => p.title), ['Chương 2'], 'chapter moved and removed');
  assert.equal(readdirSync(path.join(workDir, 'removed')).length, 1, 'removed chapter kept aside');

  // Files changed outside the app show up after "Tải lại", in the list and in an open work.
  writeFileSync(path.join(workDir, 'work.json'), JSON.stringify({ ...after2, title: 'Đổi từ ngoài app' }, null, 2));
  await page.click('.library-head .reload-btn');
  await page.waitForSelector('.work-row:has-text("Đổi từ ngoài app")');
  await page.click('.work-row .book-name');
  await page.waitForSelector('.manuscript');
  writeFileSync(path.join(workDir, 'parts', `${after2.parts[0].id}.md`), 'Sửa từ ngoài app.');
  await page.click('.topbar .reload-btn');
  await page.waitForFunction(() => document.querySelector('.manuscript')?.value === 'Sửa từ ngoài app.');
  await page.click('.icon-btn[aria-label="Về danh sách tác phẩm"]');
  await page.waitForSelector('.work-row');
  assert.equal(readFileSync(path.join(workDir, 'parts', `${after2.parts[0].id}.md`), 'utf8'), 'Sửa từ ngoài app.', 'outside edit not overwritten');

  // Worlds: a world has pages (no atlas yet), stays out of the works list, and a work set in it shows on its row.
  await page.click('.space-tabs button:has-text("Thế giới")');
  await page.click('button:has-text("Thế giới mới")');
  await page.waitForSelector('.crumb-input:focus');
  await page.keyboard.type('Thế giới thử');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Luật của thế giới.');
  assert.equal(await page.textContent('.toc-head span'), 'Trang', 'a world lists pages');
  assert.equal(await page.$('.status-select'), null, 'a world has no writing status');
  assert.ok(await page.$('.view-switch button:has-text("Bản đồ")[disabled]'), 'no atlas yet');
  await page.click('.icon-btn[aria-label="Về danh sách thế giới"]');
  await page.waitForSelector('.world-row:has-text("Thế giới thử")');
  const worldDir = readdirSync(worksDir).map((d) => path.join(worksDir, d)).find((d) => JSON.parse(readFileSync(path.join(d, 'work.json'), 'utf8')).kind === 'world');
  const world = JSON.parse(readFileSync(path.join(worldDir, 'work.json'), 'utf8'));
  assert.equal(readFileSync(path.join(worldDir, 'parts', `${world.parts[0].id}.md`), 'utf8'), 'Luật của thế giới.');
  writeFileSync(path.join(workDir, 'work.json'), JSON.stringify({ ...JSON.parse(readFileSync(path.join(workDir, 'work.json'), 'utf8')), world: world.id }, null, 2));
  await page.click('.library-head .reload-btn');
  await page.waitForSelector('.world-row:has-text("Đổi từ ngoài app")');
  await page.click('.space-tabs button:has-text("Viết")');
  await page.waitForSelector('.work-row');
  assert.equal(await page.$('.work-row:has-text("Thế giới thử")'), null, 'worlds stay out of the works list');
  await page.click('.space-tabs button:has-text("Thư viện")');

  // Floating button: closing the reader only hides it; a click on the button brings it back.
  const bubble = await windowWhere((u) => u.startsWith('data:'));
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => !w.webContents.getURL().startsWith('data:')).close());
  assert.equal(await readerVisible(), false, 'closing the reader hides it');
  await bubble.click('button');
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(await readerVisible(), true, 'bubble click shows the reader');

  console.log('Smoke test passed. Data folder:', dataDir);
} finally {
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
}
