import type { RawBlock } from '../lib/chapter';

const LEAF = /^(p|h[1-6]|li|dd|dt|figcaption|caption|td|th|pre)$/;
const CONTAINER =
  /^(body|div|section|article|aside|header|footer|main|blockquote|ul|ol|dl|table|thead|tbody|tfoot|tr|figure|hgroup)$/;
const SKIP = /^(script|style|head|nav|svg|math|rt|rp)$/;

const isBlock = (tag: string) => LEAF.test(tag) || CONTAINER.test(tag);

export function parseMarkup(markup: string): Document {
  const parser = new DOMParser();
  const xml = parser.parseFromString(markup, 'application/xhtml+xml');
  if (!xml.getElementsByTagName('parsererror').length) return xml;
  return parser.parseFromString(markup, 'text/html');
}

/** Flattens an (X)HTML document into paragraphs and headings. Images are skipped. */
export function htmlToBlocks(doc: Document): RawBlock[] {
  const body = doc.getElementsByTagName('body')[0] ?? doc.documentElement;
  const out: RawBlock[] = [];
  visit(body, out);
  return out;
}

function tagOf(el: Element): string {
  return el.localName.toLowerCase();
}

function push(out: RawBlock[], tag: string, text: string) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return;
  out.push({ kind: /^h[1-6]$/.test(tag) ? 'h' : 'p', text: clean });
}

function hasBlockChild(el: Element): boolean {
  return Array.from(el.children).some((c) => isBlock(tagOf(c)));
}

function visit(el: Element, out: RawBlock[]) {
  const tag = tagOf(el);
  if (SKIP.test(tag)) return;
  if (LEAF.test(tag) && !hasBlockChild(el)) {
    push(out, tag, inlineText(el));
    return;
  }
  // Mixed content: inline runs between block children become their own paragraphs.
  let buffer = '';
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) buffer += node.textContent ?? '';
    else if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node as Element;
      const childTag = tagOf(child);
      if (SKIP.test(childTag)) continue;
      if (isBlock(childTag)) {
        push(out, 'p', buffer);
        buffer = '';
        visit(child, out);
      } else if (childTag === 'br') buffer += ' ';
      else buffer += inlineText(child);
    }
  }
  push(out, LEAF.test(tag) ? tag : 'p', buffer);
}

function inlineText(el: Element): string {
  let text = '';
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) text += node.textContent ?? '';
    else if (node.nodeType === Node.ELEMENT_NODE) {
      const child = node as Element;
      const tag = tagOf(child);
      if (SKIP.test(tag)) continue;
      text += tag === 'br' ? ' ' : inlineText(child);
    }
  }
  return text;
}
