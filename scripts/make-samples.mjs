// Writes samples/sample.epub and samples/sample.pdf for trying the app locally.
import { mkdirSync, writeFileSync } from 'node:fs';
import JSZip from 'jszip';
import { PDFDocument, StandardFonts } from 'pdf-lib';

mkdirSync('samples', { recursive: true });

const chapters = [
  ['Lời mở đầu', [
    'Tôi viết cuốn sách này sau mười năm làm việc trong một văn phòng nhỏ, nơi mỗi sáng đều bắt đầu bằng một tách cà phê và một danh sách việc dài.',
    'Nhiều người đã hỏi tôi bí quyết là gì. Câu trả lời ngắn: không có bí quyết nào cả, chỉ có những việc nhỏ được làm lặp lại.',
    'Trong các chương tiếp theo, tôi sẽ kể lại hành trình đó, kèm theo rất nhiều câu chuyện mà bạn có thể bỏ qua nếu vội.',
  ]],
  ['Chương 1: Việc nhỏ, kết quả lớn', [
    'Hồi còn trẻ, tôi từng nghĩ rằng thay đổi lớn cần nỗ lực lớn. Tôi đặt mục tiêu chạy mười cây số mỗi ngày và bỏ cuộc sau một tuần.',
    'Thói quen nhỏ lặp lại mỗi ngày tạo ra kết quả lớn hơn nỗ lực lớn thỉnh thoảng.',
    'Một người bạn của tôi, anh Nam, kể rằng anh bắt đầu bằng việc chỉ mang giày chạy ra cửa. Không chạy, chỉ mang giày.',
    'Hãy làm thói quen dễ đến mức không thể từ chối: bắt đầu với hai phút.',
    'Như tôi sẽ trình bày ở chương 3, điều này có cơ sở khoa học vững chắc, và nhiều độc giả đã viết thư kể trải nghiệm tương tự.',
  ]],
  ['Chương 2: Môi trường quan trọng hơn ý chí', [
    'Có một mùa hè tôi chuyển đến căn hộ mới, và thật bất ngờ, tôi đọc sách nhiều gấp đôi.',
    'Đặt thứ bạn muốn làm ở nơi dễ thấy, và giấu thứ bạn muốn bỏ ở nơi khó với tới.',
    'Căn hộ đó có một chiếc ghế cạnh cửa sổ, và trên ghế luôn có một cuốn sách. Tôi không cần ý chí, tôi chỉ cần ngồi xuống.',
  ]],
];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const zip = new JSZip();
zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
zip.file('META-INF/container.xml', `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
const items = chapters.map((_, i) => `<item id="c${i}" href="text/c${i}.xhtml" media-type="application/xhtml+xml"/>`).join('');
const spine = chapters.map((_, i) => `<itemref idref="c${i}"/>`).join('');
zip.file('OEBPS/content.opf', `<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Thói quen nhỏ (sách mẫu)</dc:title><dc:identifier id="id">sample</dc:identifier><dc:language>vi</dc:language></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${items}</manifest><spine>${spine}</spine></package>`);
const navLinks = chapters.map(([t], i) => `<li><a href="text/c${i}.xhtml">${esc(t)}</a></li>`).join('');
zip.file('OEBPS/nav.xhtml', `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Mục lục</title></head><body><nav epub:type="toc"><ol>${navLinks}</ol></nav></body></html>`);
chapters.forEach(([title, paras], i) => {
  const body = paras.map((p) => `<p>${esc(p)}</p>`).join('\n');
  zip.file(`OEBPS/text/c${i}.xhtml`, `<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${esc(title)}</title></head><body><h1>${esc(title)}</h1>\n${body}</body></html>`);
});
writeFileSync('samples/sample.epub', await zip.generateAsync({ type: 'nodebuffer', mimeType: 'application/epub+zip' }));

// PDF: standard fonts have no Vietnamese glyphs, so the PDF sample is in English.
const pdf = await PDFDocument.create();
pdf.setTitle('Small Habits (sample PDF)');
const font = await pdf.embedFont(StandardFonts.TimesRoman);
const para = 'Small habits repeated every day beat big efforts made once in a while. The trick is to make the habit so easy that you cannot say no, then let time do the compounding work for you.';
const wrap = (text, width, size) => {
  const out = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width) { out.push(line); line = word; } else line = next;
  }
  if (line) out.push(line);
  return out;
};
for (let p = 1; p <= 12; p++) {
  const page = pdf.addPage([420, 595]);
  let y = 540;
  if (p === 1 || p === 7) {
    page.drawText(p === 1 ? 'Part One: Start Small' : 'Part Two: Shape the Room', { x: 40, y, size: 18, font });
    y -= 40;
  }
  for (let k = 0; k < 3; k++) {
    for (const line of wrap(`Page ${p}, paragraph ${k + 1}. ${para}`, 340, 11)) {
      page.drawText(line, { x: 40, y, size: 11, font });
      y -= 14;
    }
    y -= 12;
  }
  page.drawText(String(p), { x: 205, y: 30, size: 9, font });
}
writeFileSync('samples/sample.pdf', await pdf.save());
console.log('Wrote samples/sample.epub and samples/sample.pdf');
