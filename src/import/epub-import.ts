import JSZip from 'jszip';
import { makeChapter, normalizeSpace } from '../lib/chapter';
import type { Chapter } from '../lib/types';
import { htmlToBlocks, parseMarkup } from './html-blocks';

export interface ParsedBook {
  title: string;
  chapters: Chapter[];
}

interface ManifestItem {
  path: string;
  mediaType: string;
  properties: string;
}

/** Resolves an href relative to a file path inside the archive. Drops the #fragment. */
export function resolvePath(fromFile: string, href: string): string {
  const url = new URL(href, `http://book/${fromFile}`);
  return decodeURIComponent(url.pathname.slice(1));
}

const byTag = (doc: Document | Element, tag: string) => Array.from(doc.getElementsByTagNameNS('*', tag));

export async function importEpub(data: ArrayBuffer, fallbackTitle: string): Promise<ParsedBook> {
  const zip = await JSZip.loadAsync(data);
  const read = async (path: string) => {
    const file = zip.file(path);
    if (!file) throw new Error(`File không có trong EPUB: ${path}`);
    return file.async('string');
  };

  const container = parseMarkup(await read('META-INF/container.xml'));
  const opfPath = byTag(container, 'rootfile')[0]?.getAttribute('full-path');
  if (!opfPath) throw new Error('EPUB thiếu file OPF');
  const opf = parseMarkup(await read(opfPath));

  const manifest = new Map<string, ManifestItem>();
  for (const item of byTag(opf, 'item')) {
    manifest.set(item.getAttribute('id') ?? '', {
      path: resolvePath(opfPath, item.getAttribute('href') ?? ''),
      mediaType: item.getAttribute('media-type') ?? '',
      properties: item.getAttribute('properties') ?? '',
    });
  }

  const tocTitles = await readTocTitles(opf, manifest, read);
  const navPath = [...manifest.values()].find((m) => m.properties.split(' ').includes('nav'))?.path;

  const chapters: Chapter[] = [];
  for (const ref of byTag(opf, 'itemref')) {
    const item = manifest.get(ref.getAttribute('idref') ?? '');
    if (!item || item.path === navPath || !/html|xml/.test(item.mediaType)) continue;
    const blocks = htmlToBlocks(parseMarkup(await read(item.path)));
    if (!blocks.length) continue;
    const firstHeading = blocks.find((b) => b.kind === 'h')?.text;
    const title = tocTitles.get(item.path) ?? firstHeading ?? `Phần ${chapters.length + 1}`;
    chapters.push(makeChapter(`c${chapters.length}`, title, blocks));
  }
  if (!chapters.length) throw new Error('Không tìm thấy nội dung chữ trong EPUB');

  const title = normalizeSpace(byTag(opf, 'title')[0]?.textContent ?? '') || fallbackTitle;
  return { title, chapters };
}

/** Maps each content file to its first title in the table of contents (EPUB 3 nav or EPUB 2 NCX). */
async function readTocTitles(
  opf: Document,
  manifest: Map<string, ManifestItem>,
  read: (path: string) => Promise<string>,
): Promise<Map<string, string>> {
  const titles = new Map<string, string>();
  const add = (path: string, title: string) => {
    const clean = normalizeSpace(title);
    if (clean && !titles.has(path)) titles.set(path, clean);
  };

  const nav = [...manifest.values()].find((m) => m.properties.split(' ').includes('nav'));
  if (nav) {
    const doc = parseMarkup(await read(nav.path));
    const navEl = byTag(doc, 'nav')[0];
    for (const a of navEl ? byTag(navEl, 'a') : []) {
      const href = a.getAttribute('href');
      if (href) add(resolvePath(nav.path, href), a.textContent ?? '');
    }
    if (titles.size) return titles;
  }

  const spine = byTag(opf, 'spine')[0];
  const ncx = manifest.get(spine?.getAttribute('toc') ?? '');
  if (ncx) {
    const doc = parseMarkup(await read(ncx.path));
    for (const point of byTag(doc, 'navPoint')) {
      const label = byTag(point, 'text')[0]?.textContent ?? '';
      const src = byTag(point, 'content')[0]?.getAttribute('src');
      if (src) add(resolvePath(ncx.path, src), label);
    }
  }
  return titles;
}
