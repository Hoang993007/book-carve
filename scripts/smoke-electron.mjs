// End-to-end check of the built desktop app against a throwaway data folder.
// Usage: pnpm build && pnpm samples && pnpm smoke [screenshot.png]
// Set SMOKE_EXE to a packaged "Book Carve.exe" to test the installed build instead.
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { _electron } from 'playwright-core';

const dataDir = mkdtempSync(path.join(tmpdir(), 'book-carve-smoke-'));
const shot = process.argv[2];
const env = { ...process.env, BOOK_CARVE_DATA: dataDir };
const exe = process.env.SMOKE_EXE;
const app = await _electron.launch(exe ? { executablePath: exe, args: [], env } : { args: ['.'], env });

try {
  const page = await app.firstWindow();
  await page.waitForSelector('.library');

  await page.setInputFiles('input[type=file]', ['samples/sample.epub', 'samples/sample.pdf']);
  await page.waitForFunction(() => document.querySelectorAll('.book-card').length === 2, null, { timeout: 15000 });
  assert.match(await page.textContent('.storage'), new RegExp(path.basename(dataDir)));

  await page.click('.book-card:has-text("Thói quen")');
  await page.click('.toc-item:has-text("Chương 1")');
  await page.waitForSelector('.chapter-text [data-block="1"]');

  // Select paragraph 1 and press Backspace.
  await page.evaluate(() => {
    const t = document.querySelector('.chapter-text [data-block="1"] [data-s]').firstChild;
    const r = document.createRange();
    r.setStart(t, 0);
    r.setEnd(t, t.length);
    getSelection().removeAllRanges();
    getSelection().addRange(r);
  });
  await page.keyboard.press('Backspace');
  await page.waitForSelector('.cut-marker');

  // Right-click paragraph 2, insert an own paragraph.
  await page.click('.chapter-text [data-block="2"]', { button: 'right' });
  await page.click('.context-menu button:has-text("Chèn đoạn")');
  await page.keyboard.type('Ý của tôi: bắt đầu với hai phút.');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800); // debounced save

  const books = readdirSync(path.join(dataDir, 'books'));
  assert.equal(books.length, 2, 'one folder per book');
  const epubDir = books.map((id) => path.join(dataDir, 'books', id)).find((d) => readdirSync(d).includes('source.epub'));
  assert.ok(epubDir, 'original EPUB kept next to the parsed book');
  const ann = JSON.parse(readFileSync(path.join(epubDir, 'annotations.json'), 'utf8'));
  assert.equal(ann.deleted.c1.length, 1, 'deletion saved');
  assert.equal(ann.notes[0].text, 'Ý của tôi: bắt đầu với hai phút.', 'own paragraph saved');

  // Re-parse from the stored original: annotations must survive and the old parse is kept.
  await page.click('text=← Thư viện');
  await page.click('button[aria-label^="Tách lại Thói quen"]');
  await page.waitForSelector('text=Đã tách lại');
  const after = JSON.parse(readFileSync(path.join(epubDir, 'annotations.json'), 'utf8'));
  assert.deepEqual(after.deleted, ann.deleted, 'deletion kept after re-parse');
  assert.equal(after.notes[0].text, ann.notes[0].text, 'own paragraph kept after re-parse');
  assert.ok(readdirSync(epubDir).includes('book.prev.json'), 'previous parse backed up');

  if (shot) await page.screenshot({ path: shot });
  console.log('Smoke test passed. Data folder:', dataDir);
} finally {
  await app.close();
  rmSync(dataDir, { recursive: true, force: true });
}
