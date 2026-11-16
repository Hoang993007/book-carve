import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { makeChapter, normalizeSpace, type RawBlock } from '../lib/chapter';
import type { Chapter } from '../lib/types';
import type { ParsedBook } from './epub-import';
import { dropRunningLines, joinAcrossPages, median, toLines, toParagraphs, type PdfItem, type PdfPage } from './pdf-lines';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

type PdfDoc = Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>;

const PAGES_PER_CHUNK = 10;

export async function importPdf(data: ArrayBuffer, fallbackTitle: string): Promise<ParsedBook> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data) }).promise;

  const raw: PdfPage[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const { width, height } = page.getViewport({ scale: 1 });
    const items: PdfItem[] = [];
    for (const it of (await page.getTextContent()).items) {
      if (!('str' in it)) continue;
      items.push({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width, h: it.height || Math.abs(it.transform[3]), eol: it.hasEOL });
    }
    raw.push({ lines: toLines(items), width, height });
  }

  const pageLines = dropRunningLines(raw);
  const bodySize = median(pageLines.flat().map((l) => l.h));
  const pages = pageLines.map((lines, i) => toParagraphs(lines, i + 1, bodySize, raw[i].width));
  if (!pages.some((p) => p.length)) throw new Error('PDF không có lớp chữ (có thể là bản scan)');

  const sections = (await outlineSections(doc)) ?? chunkSections(doc.numPages);
  const chapters: Chapter[] = [];
  for (const s of sections) {
    const blocks: RawBlock[] = joinAcrossPages(pages.slice(s.from - 1, s.to));
    if (blocks.length) chapters.push(makeChapter(`c${chapters.length}`, s.title, blocks));
  }

  const meta = await doc.getMetadata().catch(() => null);
  const info = meta?.info as { Title?: string } | undefined;
  return { title: normalizeSpace(info?.Title ?? '') || fallbackTitle, chapters };
}

interface Section {
  title: string;
  from: number;
  to: number;
}

/** Top-level bookmarks become chapters. Returns null when the PDF has none usable. */
async function outlineSections(doc: PdfDoc): Promise<Section[] | null> {
  const outline = await doc.getOutline().catch(() => null);
  if (!outline?.length) return null;
  const starts: { title: string; page: number }[] = [];
  for (const item of outline) {
    try {
      const dest = typeof item.dest === 'string' ? await doc.getDestination(item.dest) : item.dest;
      if (!dest?.length) continue;
      const ref = dest[0];
      const index = typeof ref === 'number' ? ref : await doc.getPageIndex(ref);
      starts.push({ title: item.title, page: index + 1 });
    } catch {
      // Broken bookmark: skip it.
    }
  }
  const unique = starts.sort((a, b) => a.page - b.page).filter((s, i, all) => i === 0 || s.page !== all[i - 1].page);
  if (!unique.length) return null;
  if (unique[0].page > 1) unique.unshift({ title: 'Mở đầu', page: 1 });
  return unique.map((s, i) => ({ title: s.title, from: s.page, to: (unique[i + 1]?.page ?? doc.numPages + 1) - 1 }));
}

function chunkSections(numPages: number): Section[] {
  const out: Section[] = [];
  for (let from = 1; from <= numPages; from += PAGES_PER_CHUNK) {
    const to = Math.min(numPages, from + PAGES_PER_CHUNK - 1);
    out.push({ title: `Trang ${from}–${to}`, from, to });
  }
  return out;
}
