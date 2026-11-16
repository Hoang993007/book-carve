// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { resolvePath } from './epub-import';
import { htmlToBlocks, parseMarkup } from './html-blocks';

const xhtml = (body: string) =>
  `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title><style>p{}</style></head><body>${body}</body></html>`;

describe('htmlToBlocks', () => {
  it('turns headings and paragraphs into blocks, flattening inline markup', () => {
    const blocks = htmlToBlocks(parseMarkup(xhtml('<h1>Chương 1</h1><p>Một <em>câu</em>\n   ngắn.</p><p>  </p>')));
    expect(blocks).toEqual([
      { kind: 'h', text: 'Chương 1' },
      { kind: 'p', text: 'Một câu ngắn.' },
    ]);
  });

  it('splits mixed content in containers and skips scripts and nav', () => {
    const blocks = htmlToBlocks(parseMarkup(xhtml('<div>Mở đầu<p>Đoạn A</p>đuôi<br/>tiếp</div><nav>Mục lục</nav><script>x()</script>')));
    expect(blocks.map((b) => b.text)).toEqual(['Mở đầu', 'Đoạn A', 'đuôi tiếp']);
  });

  it('falls back to the HTML parser for malformed XHTML', () => {
    const blocks = htmlToBlocks(parseMarkup('<html><body><p>Không đóng thẻ<p>Đoạn hai</body></html>'));
    expect(blocks.map((b) => b.text)).toEqual(['Không đóng thẻ', 'Đoạn hai']);
  });
});

describe('resolvePath', () => {
  it('resolves relative hrefs and drops fragments', () => {
    expect(resolvePath('OEBPS/content.opf', 'text/ch%201.xhtml#p3')).toBe('OEBPS/text/ch 1.xhtml');
    expect(resolvePath('OEBPS/nav/toc.xhtml', '../text/ch2.xhtml')).toBe('OEBPS/text/ch2.xhtml');
  });
});
