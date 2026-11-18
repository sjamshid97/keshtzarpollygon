// قالب فایل ورد: جدول‌ها وسط‌چین و ۱۱ (ثابت‌ها پررنگ، مقدارها معمولی)، سرتیترهای جمع‌شونده ۱۴،
// جدول امضاها در پایان گزارش (نام هر نفر و امضایش روبه‌روی هم) و «کارشناس فنی» به‌جای «مسئول فنی».
// عکس از ظاهر سند (تقریبی، بدون Word):  KZ_WORD_SHOTS=1 node tools/tests/t_word.mjs  →  tools/tests/out/word/
// ذخیرهٔ سندهای نمونه برای باز کردن در Word واقعی:  KZ_WORD_SAVE=sample-output node tools/tests/t_word.mjs
import { site, launch, open, suite, sleep, act, type, press, waitDialog, dialogs, closeDialogs, downloads, clearDl, bin, drawPad, sigXKey } from './h.mjs';
import { unzip } from './zip.mjs';
import { wordShots } from './word_view.mjs';
const st = await site(); const browser = await launch(); const S = suite('قالب فایل ورد و جدول امضاها');
const page = await open(browser, st, { viewport: { width: 400, height: 820, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } });
const CM_EMU = 360000, CM_TWIP = 567;
const hashOf = u => { let h = 0; for (let i = 0; i < u.length; i++) h = (h * 31 + u[i]) >>> 0; return h; };

/* سند را در مرورگر باز می‌کند (پس XML باید درست باشد) و خلاصه‌ای از بندها و جدول‌ها برمی‌گرداند */
const analyse = xml => page.evaluate(xml => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) return { error: doc.getElementsByTagName('parsererror')[0].textContent.slice(0, 300) };
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main', R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const kids = (n, name) => [...n.children].filter(c => c.localName === name);
  const at = (n, path) => { for (const p of path.split('/')) { if (!n) return null; n = kids(n, p)[0] || null; } return n; };
  const val = n => n ? n.getAttributeNS(W, 'val') : null;
  const para = p => {
    const runs = [];
    const run = (r, link) => { const rp = at(r, 'rPr'); const drawing = r.getElementsByTagNameNS(W, 'drawing')[0];
      if (drawing) { const blip = [...drawing.getElementsByTagName('*')].find(e => e.localName === 'blip'), ext = [...drawing.getElementsByTagName('*')].find(e => e.localName === 'extent');
        runs.push({ img: blip.getAttributeNS(R, 'embed'), cx: +ext.getAttribute('cx'), cy: +ext.getAttribute('cy') }); return; }
      runs.push({ t: kids(r, 't').map(t => t.textContent).join(''), sz: val(at(rp, 'sz')), szCs: val(at(rp, 'szCs')), b: !!at(rp, 'b'), bCs: !!at(rp, 'bCs'), rtl: !!at(rp, 'rtl'),
        font: rp && at(rp, 'rFonts') ? at(rp, 'rFonts').getAttributeNS(W, 'cs') : null, color: val(at(rp, 'color')), link: !!link }); };
    [...p.children].forEach(c => { if (c.localName === 'r') run(c, false); if (c.localName === 'hyperlink') kids(c, 'r').forEach(r => run(r, true)); });
    return { style: val(at(p, 'pPr/pStyle')), jc: val(at(p, 'pPr/jc')), bidi: !!at(p, 'pPr/bidi'), outline: val(at(p, 'pPr/outlineLvl')), runs, text: runs.map(r => r.t || '').join('') };
  };
  const out = [];
  for (const el of doc.getElementsByTagNameNS(W, 'body')[0].children) {
    if (el.localName === 'p') out.push(Object.assign({ kind: 'p' }, para(el)));
    if (el.localName === 'tbl') out.push({ kind: 'tbl', jc: val(at(el, 'tblPr/jc')), bidiVisual: !!at(el, 'tblPr/bidiVisual'),
      grid: kids(at(el, 'tblGrid'), 'gridCol').map(g => +g.getAttributeNS(W, 'w')),
      rows: kids(el, 'tr').map(tr => ({ h: val(at(tr, 'trPr/trHeight')), rule: at(tr, 'trPr/trHeight') ? at(tr, 'trPr/trHeight').getAttributeNS(W, 'hRule') : null,
        cells: kids(tr, 'tc').map(tc => ({ fill: at(tc, 'tcPr/shd').getAttributeNS(W, 'fill'), vAlign: val(at(tc, 'tcPr/vAlign')), paras: kids(tc, 'p').map(para) })) })) });
    if (el.localName === 'sectPr') out.push({ kind: 'sect', bidi: !!at(el, 'bidi') });
  }
  return { body: out };
}, xml);

/* فایل ورد را می‌سازد و بازش می‌کند. answer: اگر پیش از ساخت پرسشی آمد چه جوابی داده شود */
async function word(fn, answer) {
  await clearDl(page); await fn(); let asked = null;
  for (let i = 0; i < 40; i++) { await sleep(120); const d = (await dialogs(page))[0]; if (d) { asked = d; await press(page, answer || 'ok'); break; } if (await page.evaluate(() => window.__dl.length)) break; }
  const dl = await downloads(page, 6000); await closeDialogs(page);
  if (!dl.length) return { asked, none: true };
  const parts = unzip(bin(dl[0])); const xml = parts['word/document.xml'].toString('utf8');
  const rels = {}; (parts['word/_rels/document.xml.rels'].toString('utf8').match(/<Relationship [^>]+>/g) || []).forEach(r => { rels[/Id="([^"]+)"/.exec(r)[1]] = /Target="([^"]+)"/.exec(r)[1]; });
  return Object.assign({ asked, name: dl[0].name, data: bin(dl[0]), parts, xml, rels, styles: parts['word/styles.xml'].toString('utf8') }, await analyse(xml));
}
const tables = w => w.body.filter(x => x.kind === 'tbl');
const cellText = c => c.paras.map(p => p.text).join('\n');
const FIXED = 'EEF3EF', VALUE = 'FFFFFF';
/* قاعده‌های همگانی که برای هر فایل ورد برنامه باید درست باشد */
function rules(w, label) {
  S.ok(!w.error && w.body && w.body.length > 5, label + ': سند درست ساخته شده و باز می‌شود', w.error);
  if (!w.body) return;
  const tb = tables(w), bad = [];
  const cells = tb.flatMap((t, ti) => t.rows.flatMap((r, ri) => r.cells.map((c, ci) => ({ t, ti, ri, ci, c }))));
  S.ok(tb.length > 0 && tb.every(t => t.jc === 'center' && t.bidiVisual), label + ': هر ' + tb.length + ' جدول وسطِ صفحه و راست‌به‌چپ است');
  cells.forEach(x => x.c.paras.forEach(p => { if (p.jc !== 'center') bad.push([x.ti, x.ri, x.ci, p.jc, p.text.slice(0, 20)]); }));
  S.eq(bad.splice(0), [], label + ': نوشتهٔ همهٔ خانه‌های جدول‌ها وسط‌چین است (' + cells.length + ' خانه)');
  cells.forEach(x => x.c.paras.forEach(p => p.runs.forEach(r => { if (!r.img && (r.sz !== '22' || r.szCs !== '22')) bad.push([x.ti, x.ri, x.ci, r.sz, r.szCs, r.t]); })));
  S.eq(bad.splice(0), [], label + ': اندازهٔ همهٔ نوشته‌های داخل جدول ۱۱ است');
  const fixed = cells.filter(x => x.c.fill === FIXED), value = cells.filter(x => x.c.fill === VALUE);
  S.ok(fixed.length + value.length === cells.length && fixed.length > 3 && value.length > 3, label + ': هر خانه یا «ثابت» است یا «مقدار» (' + fixed.length + ' ثابت، ' + value.length + ' مقدار)');
  fixed.forEach(x => x.c.paras.forEach(p => p.runs.forEach(r => { if (!r.img && r.t && !(r.b && r.bCs)) bad.push([x.ti, x.ri, x.ci, r.t]); })));
  S.eq(bad.splice(0), [], label + ': نوشته‌های ثابت (سرستون‌ها و ستون عنوان‌ها) پررنگ‌اند');
  value.forEach(x => x.c.paras.forEach(p => p.runs.forEach(r => { if (!r.img && (r.b || r.bCs)) bad.push([x.ti, x.ri, x.ci, r.t]); })));
  S.eq(bad.splice(0), [], label + ': مقدارها (متغیرها) معمولی‌اند، نه پررنگ');
  const heads = w.body.filter(x => x.kind === 'p' && x.style === 'Heading1');
  heads.forEach(h => h.runs.forEach(r => { if (r.sz !== '28' || r.szCs !== '28' || !r.b || !r.bCs) bad.push([h.text, r.sz, r.szCs, r.b]); }));
  S.ok(heads.length >= 3 && !bad.length && heads.every(h => h.outline === '0'), label + ': ' + heads.length + ' سرتیتر جمع‌شونده، همه ۱۴ و پررنگ (و هنوز جمع‌شونده)', bad.splice(0));
  const all = w.body.filter(x => x.kind === 'p').concat(cells.flatMap(x => x.c.paras));
  all.forEach(p => { if (p.text.trim() && !p.bidi) bad.push(['bidi', p.text.slice(0, 20)]); p.runs.forEach(r => { if (!r.img && r.t.trim() && (!r.rtl || r.font !== 'B Nazanin')) bad.push(['run', r.t.slice(0, 20), r.font]); }); });
  S.ok(!bad.length && w.body[w.body.length - 1].kind === 'sect' && w.body[w.body.length - 1].bidi, label + ': سند مثل قبل راست‌به‌چپ و با فونت «B Nazanin» است', bad.splice(0));
  S.ok(!w.xml.includes('مسئول فنی') && !/\.{6}/.test(w.xml), label + ': عبارت «مسئول فنی» و خط‌چینِ جای امضا دیگر در سند نیست');
}

/* ───── دادهٔ آزمایشی ───── */
await act(page, 'data:demo'); await closeDialogs(page);
const P = await page.evaluate(() => state.activeId); const [a, b] = await page.evaluate(() => state.projects[0].plots.map(p => p.id));
const set = (k, v) => type(page, '.vs-editor [data-input="visit:field"][data-k="' + k + '"]', v);
await page.$eval('[data-plot="' + a + '"] [data-act="visit:add"]', e => e.click()); await sleep(450); const v1 = await page.evaluate(() => V_OPEN);
for (const [k, v] of [['f:inspector', 'مهندس آزمایشی'], ['f:noteGen', 'وضعیت عمومی مزرعه خوب است و بوته‌ها یکنواخت‌اند.'], ['f:distSame', '۳۰۰'], ['f:irrigation', 'غرقابی'], ['f:summary', 'جمع‌بندی: مزرعه تأیید می‌شود.'], ['p:0:name', 'شته'], ['p:0:pct', '۵'], ['p:0:action', 'سم‌پاشی']]) await set(k, v);
await act(page, 'visit:addRow', '[data-list="s"]'); await act(page, 'visit:addRow', '[data-list="r"]'); await sleep(200);
await page.evaluate(([a, v]) => { vSet(a, v, 's:0:code', 'S-12'); vSet(a, v, 's:0:germ', '۹۵'); vSet(a, v, 'r:0:text', 'آبیاری منظم'); vSet(a, v, 'f:stage', V_STAGE[1]); render(); }, [a, v1]); await sleep(250);
await act(page, 'visit:photo', '[data-src="gal"]'); await sleep(200);
await page.evaluate(async () => { const cv = document.createElement('canvas'); cv.width = 800; cv.height = 600; const c = cv.getContext('2d'); c.fillStyle = '#2f8f58'; c.fillRect(0, 0, 800, 600);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png')); const el = document.getElementById('visitFile'); const dt = new DataTransfer(); dt.items.add(new File([blob], 'photo.png', { type: 'image/png' })); el.files = dt.files; el.dispatchEvent(new Event('change', { bubbles: true })); });
await sleep(1200);
await drawPad(page, v1, '', [[30, 60], [110, 190], [200, 50], [290, 200]]); await act(page, 'visit:sign'); await press(page, 'ok'); await sleep(400);
await drawPad(page, v1, 'x', [[120, 90], [170, 150], [220, 90], [270, 150]]); await act(page, 'visit:signX'); await press(page, 'ok', 'مهندس نمونه'); await sleep(400);
await page.evaluate(() => visitClose()); await sleep(150);
const xk1 = await sigXKey(page, v1);
const stored = await page.evaluate(async ([v, xk]) => { const out = {}; for (const k of [v, xk]) { const bl = await vIdbGet('sigs', k); const s = await vImgSize(bl); const u = new Uint8Array(await bl.arrayBuffer()); let h = 0; for (let i = 0; i < u.length; i++) h = (h * 31 + u[i]) >>> 0; out[k] = { h, w: s.w, ht: s.h }; } return out; }, [v1, xk1]);

/* ───── ۱) بازدید با هر دو امضا ───── */
S.sec('بازدید قطعه، با هر دو امضا');
const w1 = await word(() => page.evaluate(([a, v]) => { visitWord(a, v); }, [a, v1]));
S.ok(!w1.asked && !w1.none, 'فایل ورد بدون هیچ پرسشی ساخته شد', w1.asked);
rules(w1, 'بازدید');
const t1 = tables(w1), sig1 = t1[t1.length - 1];
S.eq(sig1.rows[0].cells.map(cellText), ['سمت', 'نام و نام خانوادگی', 'امضا', 'تاریخ امضا'], 'آخرین جدول سند، جدول امضاهاست: سمت، نام، امضا (درست کنار نام)، تاریخ');
const idx = w1.body.indexOf(sig1), after = w1.body.slice(idx + 1).filter(x => x.kind === 'p' && x.text.trim()).map(x => x.text), headBefore = w1.body.slice(0, idx).filter(x => x.kind === 'p' && x.style).pop();
S.ok(JSON.stringify(after) === JSON.stringify(['طراحی و توسعه: سجاد جمشیدپور']) && headBefore.text === '۱۱ — امضاها', 'جدول امضاها در پایان گزارش است، زیر سرتیتر «۱۱ — امضاها»', { after, head: headBefore && headBefore.text });
const [, rf, rx] = sig1.rows;
S.eq(rf.cells.slice(0, 2).map(cellText), ['کشاورز / بهره‌بردار', 'محمد رضایی'], 'ردیف کشاورز: عنوان و نام کشاورز');
S.eq(rx.cells.slice(0, 2).map(cellText), ['کارشناس فنی', 'مهندس نمونه'], 'ردیف کارشناس فنی: عنوان و نام کارشناس');
S.ok(/^[۰-۹]{4}\/[۰-۹]{1,2}\/[۰-۹]{1,2}$/.test(cellText(rf.cells[3])) && cellText(rx.cells[3]) === cellText(rf.cells[3]), 'تاریخ امضا در ستون خودش نوشته شده', [cellText(rf.cells[3]), cellText(rx.cells[3])]);
const imgF = rf.cells[2].paras.flatMap(p => p.runs).filter(r => r.img), imgX = rx.cells[2].paras.flatMap(p => p.runs).filter(r => r.img);
S.ok(imgF.length === 1 && imgX.length === 1 && w1.rels[imgF[0].img] === 'media/signature.png' && w1.rels[imgX[0].img] === 'media/signature-expert.png', 'امضای هر نفر در همان ردیف، روبه‌روی نام خودش است', [imgF, imgX, w1.rels]);
S.ok(hashOf(w1.parts['word/media/signature.png']) === stored[v1].h && hashOf(w1.parts['word/media/signature-expert.png']) === stored[xk1].h, 'و جابه‌جا نشده‌اند: تصویر ردیف کشاورز امضای کشاورز است و تصویر ردیف کارشناس امضای کارشناس');
const fits = (im, s) => im.cx <= 5.2 * CM_EMU + 2 && im.cy <= 2.4 * CM_EMU + 2 && Math.abs(im.cx / im.cy - s.w / s.ht) < 0.03 && (im.cx > 5.1 * CM_EMU || im.cy > 2.3 * CM_EMU);
S.ok(fits(imgF[0], stored[v1]) && fits(imgX[0], stored[xk1]), 'تصویر امضا خانهٔ خودش را پر می‌کند، بیرون نمی‌زند و کش نمی‌آید', [imgF[0], imgX[0], stored]);
S.ok(sig1.rows.slice(1).every(r => +r.h >= Math.round(1.8 * CM_TWIP) && r.rule === 'atLeast') && sig1.rows[0].h === null && Math.abs(sig1.grid.reduce((x, y) => x + y, 0) - 18 * CM_TWIP) < 30, 'ردیف‌های امضا بلندیِ کافی دارند و جدول هم‌پهنای بقیهٔ جدول‌هاست');
S.ok(t1[0].rows.some(r => cellText(r.cells[2]) === 'بازدیدکننده' && cellText(r.cells[3]) === 'مهندس آزمایشی') && w1.xml.includes('کارشناس فنی'), 'نام بازدیدکننده در شناسنامه مانده و «کارشناس فنی» در سند هست');
const noteL = w1.body.find(x => x.kind === 'p' && x.text === 'توضیح وضعیت عمومی:'), noteV = w1.body[w1.body.indexOf(noteL) + 1];
S.ok(noteL && noteL.runs[0].sz === '22' && noteL.runs[0].b && noteL.jc === 'start' && noteV.runs[0].sz === '22' && !noteV.runs[0].b && noteV.jc === 'start' && /بوته‌ها یکنواخت/.test(noteV.text), 'نوشته‌های بلندِ زیر جدول: عنوان ۱۱ پررنگ، متن ۱۱ معمولی، راست‌چین (جدول نیستند)');
const link = t1[0].rows.flatMap(r => r.cells).flatMap(c => c.paras).flatMap(p => p.runs).find(r => r.link);
S.ok(link && link.t === 'مشاهده در سامانه' && link.sz === '22' && w1.rels.rIdOfis === 'https://ofis.spcri.ir/login', 'پیوند «مشاهده در سامانه» سر جایش است و اندازه‌اش ۱۱ شده');
S.ok(w1.body[0].text === 'شرکت زرین دانه کشتزار' && w1.body[1].runs[0].sz === '34' && !w1.xml.includes('روژین'), 'سربرگ و عنوان سند مثل قبل است');
S.ok(/w:styleId="Heading1"/.test(w1.styles) && /<w:outlineLvl w:val="0"\/>/.test(w1.styles), 'سبک «Heading 1» (برای جمع‌شدن سرتیترها) دست نخورده');
const photoT = t1.find(t => t.rows[0].cells.some(c => c.paras.some(p => p.runs.some(r => r.img && /photo/.test(w1.rels[r.img] || '')))));
S.ok(!!photoT && Object.keys(w1.parts).filter(k => /^word\/media\//.test(k)).length === 3, 'عکس بازدید هم در سند است (۱ عکس + ۲ امضا)', Object.keys(w1.parts));

/* ───── ۲) بازدید بی‌امضا ───── */
S.sec('بازدیدی که هنوز امضا نشده');
await page.$eval('[data-plot="' + b + '"] [data-act="visit:add"]', e => e.click()); await sleep(450); const v2 = await page.evaluate(() => V_OPEN);
await set('f:inspector', 'کارشناس دوم'); await page.evaluate(() => visitClose()); await sleep(150);
const w2 = await word(() => page.evaluate(([b, v]) => { visitWord(b, v); }, [b, v2]));
rules(w2, 'بی‌امضا');
const sig2 = tables(w2).pop();
S.eq(sig2.rows.slice(1).map(r => r.cells.map(cellText)), [['کشاورز / بهره‌بردار', 'محمد رضایی', '', '—'], ['کارشناس فنی', 'کارشناس دوم', '', '—']], 'نام‌ها نوشته شده و خانه‌های امضا خالی است (برای امضا روی کاغذ)');
S.ok(sig2.rows.slice(1).every(r => +r.h >= 1000) && !Object.keys(w2.parts).some(k => /media/.test(k)) && !w2.xml.includes('امضا ثبت نشده'), 'ردیف‌ها جای امضای دستی دارند و تصویری در سند نیست');

/* ───── ۳) امتناع کشاورز + امضای کارشناس ───── */
S.sec('امتناع کشاورز از امضا');
await page.evaluate(([b, v]) => { visitOpen(b, v); }, [b, v2]); await sleep(400);
await act(page, 'visit:signRefuse'); await press(page, 'ok', 'دهیار روستا'); await sleep(300);
await drawPad(page, v2, 'x'); await act(page, 'visit:signX'); await press(page, 'ok'); await sleep(400); await page.evaluate(() => visitClose());
const w3 = await word(() => page.evaluate(([b, v]) => { visitWord(b, v); }, [b, v2]));
rules(w3, 'امتناع');
const sig3 = tables(w3).pop();
S.ok(cellText(sig3.rows[1].cells[2]) === 'از امضا امتناع کرد — شاهد: دهیار روستا' && cellText(sig3.rows[1].cells[1]) === 'محمد رضایی' && sig3.rows[2].cells[2].paras.some(p => p.runs.some(r => r.img)), 'در خانهٔ امضای کشاورز «از امضا امتناع کرد — شاهد: …» نوشته شده و امضای کارشناس در ردیف خودش است', sig3.rows.slice(1).map(r => r.cells.map(cellText)));

/* ───── ۳-ب) امضایی که نامی برایش وارد نشده ───── */
S.sec('امضا بدون نام');
await page.evaluate(([b, v]) => { const x = vFind(b, v); x.sig = { name: 'کشاورز', at: vToday(), refused: false }; x.sigExpert.name = 'کارشناس فنی'; x.f.inspector = ''; activeProject().farmerName = ''; save(); }, [b, v2]);
const w3b = await word(() => page.evaluate(([b, v]) => { visitWord(b, v); }, [b, v2]), 'ok');
const sig3b = tables(w3b).pop();
S.eq(sig3b.rows.slice(1).map(r => cellText(r.cells[1])), ['—', '—'], 'وقتی نامی وارد نشده، در ستون نام «—» می‌آید (نه واژهٔ «کشاورز» یا «کارشناس فنی»)');
await page.evaluate(() => { activeProject().farmerName = 'محمد رضایی'; save(); });

/* ───── ۴) تصویر امضای کارشناس روی این دستگاه نیست ───── */
S.sec('وقتی تصویر امضای کارشناس روی این دستگاه نیست');
await page.evaluate(k => vIdbDel('sigs', k), xk1);
let w4 = await word(() => page.evaluate(([a, v]) => { visitWord(a, v); }, [a, v1]), 'cancel');
S.ok(w4.asked && w4.asked.title === 'هشدار تصاویر گزارش' && /تصویر امضای کارشناس فنی/.test(w4.asked.msg) && !/تصویر امضای ثبت‌شده/.test(w4.asked.msg) && w4.none, 'پیش از ساخت هشدار می‌دهد که تصویر امضای کارشناس فنی نیست؛ با «انصراف» فایلی ساخته نمی‌شود', w4.asked);
w4 = await word(() => page.evaluate(([a, v]) => { visitWord(a, v); }, [a, v1]), 'ok');
rules(w4, 'بی‌تصویر');
const sig4 = tables(w4).pop();
S.ok(cellText(sig4.rows[2].cells[2]) === 'تصویر امضا در این دستگاه نیست' && sig4.rows[2].cells[2].paras[0].runs[0].color === 'AA0000' && sig4.rows[1].cells[2].paras.some(p => p.runs.some(r => r.img))
  && w4.body.some(x => x.kind === 'p' && /تصویر امضا در این دستگاه موجود نیست؛ گزارش کامل را از دستگاه اصلی بگیرید/.test(x.text)), 'با «ساخت گزارش ناقص»: امضای کشاورز هست و جای امضای کارشناس با رنگ قرمز نوشته «در این دستگاه نیست»');

/* ───── ۵) گزارش کلی پروژه و کارنامه ───── */
S.sec('گزارش کلی پروژه و کارنامه');
await page.$eval('#genCard [data-act="visit:add"]', e => e.click()); await sleep(450); const g1 = await page.evaluate(() => V_OPEN);
await type(page, '#genCard .vs-editor [data-input="visit:field"][data-k="f:summary"]', 'گزارش کلی پروژه'); await type(page, '#genCard .vs-editor [data-input="visit:field"][data-k="f:inspector"]', 'ناظر');
await drawPad(page, g1); await page.evaluate(() => document.querySelector('#genCard [data-act="visit:sign"]').click()); await press(page, 'ok', 'محمد رضایی'); await sleep(400);
await page.evaluate(() => visitClose()); await sleep(150);
const w5 = await word(() => page.evaluate(([p, g]) => { visitWord(p, g); }, [P, g1]));
rules(w5, 'گزارش کلی');
const sig5 = tables(w5).pop();
S.ok(/گزارش کلی بازدید/.test(w5.body[1].text) && sig5.rows[1].cells[2].paras.some(p => p.runs.some(r => r.img)) && cellText(sig5.rows[2].cells[1]) === 'ناظر' && cellText(sig5.rows[2].cells[2]) === '', 'گزارش کلی: همان جدول امضاها (کشاورز امضا کرده، خانهٔ کارشناس خالی است)', sig5.rows.slice(1).map(r => r.cells.map(cellText)));
const plotsCap = w5.body.find(x => x.kind === 'p' && x.text === 'قطعات پروژه:');
S.ok(plotsCap && plotsCap.runs[0].sz === '22' && plotsCap.runs[0].b, 'عنوان «قطعات پروژه:» هم ۱۱ پررنگ است');
const w6 = await word(() => page.evaluate(a => { visitWordAll(a); }, a));
rules(w6, 'کارنامه');
S.ok(/کارنامه/.test(w6.body[1].text) && tables(w6).length === 2, 'کارنامهٔ بازدیدهای قطعه با همان قالب ساخته می‌شود');

S.eq(page.__errors, [], 'خطایی در صفحه نیست');
/* KZ_WORD_SAVE=پوشه → همین سندهای آزمایشی (با دادهٔ ساختگی) در آن پوشه ذخیره می‌شوند، برای باز کردن در Word واقعی */
if (process.env.KZ_WORD_SAVE) { const fs = await import('fs'), path = await import('path'); const dir = path.resolve(process.env.KZ_WORD_SAVE); fs.mkdirSync(dir, { recursive: true });
  [[w1, 'نمونه-گزارش-ورد-با-دو-امضا'], [w2, 'نمونه-گزارش-ورد-بدون-امضا'], [w5, 'نمونه-گزارش-کلی-پروژه'], [w6, 'نمونه-کارنامه']].forEach(([w, n]) => fs.writeFileSync(path.join(dir, n + '.docx'), w.data)); S.note('سندهای نمونه در ' + dir); }
if (process.env.KZ_WORD_SHOTS) for (const r of await wordShots(browser, [w1, w2, w3, w4, w5, w6].map((w, i) => ({ name: ['1-دو-امضا', '2-بی-امضا', '3-امتناع', '4-بی-تصویر', '5-گزارش-کلی', '6-کارنامه'][i], data: w.data })))) S.note(r.error ? '✗ ' + r.file + ': ' + r.error : 'عکس: ' + r.png);
S.done(); await browser.close(); st.close();
