// نگاه‌کردن به فایل ورد با چشم، بدون Word: فایل docx در مرورگر آزمایشی (با کتابخانهٔ docx-preview) کشیده
// و از آن عکس گرفته می‌شود. این «تقریبِ» ظاهر است، نه خودِ Word؛ فونت «B Nazanin» هم اینجا نیست و
// به‌جایش «وزیرمتن» می‌نشیند. برای دیدنِ چینش، اندازه‌ها و پررنگی کافی است.
//   node tools/tests/word_view.mjs مسیر/فایل.docx [مسیر/فایل-دیگر.docx …]
//   خروجی: tools/tests/out/word/<نام>-<شماره>.png
import { launch, sleep, OUT, HERE } from './h.mjs';
import fs from 'fs'; import path from 'path';

const NM = path.join(HERE, '..', 'node_modules');
const font = w => fs.readFileSync(path.join(NM, 'vazirmatn', 'fonts', 'webfonts', 'Vazirmatn-' + w + '.woff2')).toString('base64');
const HTML = '<!doctype html><html><head><meta charset="utf-8"><style>'
  + '@font-face{font-family:"B Nazanin";font-weight:400;src:url(data:font/woff2;base64,' + font('Regular') + ') format("woff2")}'
  + '@font-face{font-family:"B Nazanin";font-weight:700;src:url(data:font/woff2;base64,' + font('Bold') + ') format("woff2")}'
  + 'body{margin:0;background:#888} .docx-wrapper{padding:12px !important;background:#888 !important}'
  + '</style></head><body><div id="box"></div></body></html>';

export async function wordShots(browser, files, dir = path.join(OUT, 'word')) {
  fs.mkdirSync(dir, { recursive: true });
  const out = [];
  for (const file of files) {
    const page = await browser.newPage(); await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 1.5 });
    await page.setContent(HTML);
    await page.addScriptTag({ path: path.join(NM, 'jszip', 'dist', 'jszip.min.js') });
    await page.addScriptTag({ path: path.join(NM, 'docx-preview', 'dist', 'docx-preview.min.js') });
    const b64 = (Buffer.isBuffer(file.data) ? file.data : fs.readFileSync(file.path || file)).toString('base64');
    const err = await page.evaluate(async b64 => {
      try { const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        await docx.renderAsync(new Blob([u8]), document.getElementById('box'), null, { inWrapper: true, breakPages: true, experimental: true });
        await document.fonts.ready; return ''; } catch (e) { return String(e && e.message || e); } }, b64);
    if (err) { out.push({ file: file.name || file, error: err }); await page.close(); continue; }
    await sleep(400);
    const name = (file.name || path.basename(file.path || file)).replace(/\.docx$/i, '').replace(/[^\w\u0600-\u06FF-]+/g, '_').slice(0, 60);
    const pages = await page.$$('section.docx');
    for (let i = 0; i < pages.length; i++) { const p = path.join(dir, name + '-' + (i + 1) + '.png'); await pages[i].screenshot({ path: p }); out.push({ file: name, page: i + 1, png: p }); }
    await page.close();
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(HERE, 'word_view.mjs')) {
  const files = process.argv.slice(2);
  if (!files.length) { console.log('کاربرد:  node tools/tests/word_view.mjs فایل.docx'); process.exit(1); }
  const browser = await launch();
  for (const r of await wordShots(browser, files)) console.log(r.error ? '✗ ' + r.file + ': ' + r.error : r.png);
  await browser.close();
}
