// خروجی‌های قدیمی نباید عوض شوند: یک سناریوی یکسان روی نسخهٔ قبلی (۲٫۶٫۱) و نسخهٔ تازه اجرا می‌شود
// و همهٔ فایل‌های خروجی (GeoJSON، KML، CSV، JSON، Word، چاپ، پشتیبان‌ها) بایت‌به‌بایت مقایسه می‌شوند.
import { site, launch, open, suite, sleep, act, type, press, dialogs, closeDialogs } from './h.mjs';
import { oldSite } from './dev.mjs';
import { unzip } from './zip.mjs';
const browser = await launch(); const S = suite('خروجی‌ها مثل نسخهٔ قبلی');

async function run(st) {
  const page = await open(browser, st, { fixed: Date.UTC(2026, 10, 1, 6, 0, 0) });
  const out = {}; const tick = () => page.evaluate(() => window.__tick(60000));
  const grab = async (name, fn, wait = 500) => { await page.evaluate(() => { window.__dl.length = 0; window.__opened.length = 0; }); await tick(); await fn(); await sleep(wait);
    for (let i = 0; i < 60; i++) { if (await page.evaluate(() => window.__dl.every(x => x.b64 !== null))) break; await sleep(100); }
    await closeDialogs(page);
    const got = await page.evaluate(() => ({ dl: window.__dl.map(x => ({ name: x.name, b64: x.b64 })), op: window.__opened.map(o => o.html) }));
    got.dl.forEach((d, i) => { out[name + (got.dl.length > 1 ? '#' + (i + 1) : '') + ' → ' + d.name] = Buffer.from(d.b64 || '', 'base64'); });
    got.op.forEach((h, i) => { out[name + ' (چاپ' + (got.op.length > 1 ? ' ' + (i + 1) : '') + ')'] = Buffer.from(h, 'utf8'); }); };
  const set = async (sel, val, ev) => { await tick(); await type(page, sel, val, ev); };
  // پروژه
  await tick(); await act(page, 'proj:add'); await press(page, 'ok', 'جو بهاره – مزرعهٔ آزمایش');
  for (const [k, v] of [['crop', 'جو'], ['year', '۱۴۰۵-۱۴۰۶'], ['owner', 'تولیدکنندهٔ آزمایشی'], ['province', 'تهران'], ['region', 'ورامین'], ['farmerName', 'کشاورز آزمایشی'], ['farmerPhone', '۰۹۱۲۰۰۰۰۰۰۰'], ['farmerCity', 'ورامین'], ['farmerNationalId', '۰۰۱۲۳۴۵۶۷۸'], ['farmerAddress', 'روستای نمونه، کوچهٔ اول'], ['notes', 'طبقهٔ مادری؛ مجوز شمارهٔ ۱۲۳ & <آزمایش>']])
    await set('[data-input="proj:field"][data-key="' + k + '"]', v);
  await set('[data-change="proj:field"][data-key="contractType"]', await page.$eval('[data-change="proj:field"][data-key="contractType"]', e => e.options[1] ? e.options[1].value : ''), 'change');
  // قطعهٔ ۱: جغرافیایی + حفره
  await tick(); await act(page, 'plot:add'); await press(page, 'ok', 'قطعهٔ شمالی');
  const a = await page.evaluate(() => activeProject().plots[0].id);
  await set('[data-plot="' + a + '"] textarea[data-ring="outer"]', '35.151538, 51.528883\n35.150378, 51.527815\n35.149341, 51.528945\n35.150312, 51.530513\n35.150966, 51.529724'); await sleep(400);
  for (const [k, v] of [['code', 'N-۱'], ['variety', 'رقم آزمایشی'], ['seedClass', 'مادری'], ['plantDate', '۱۴۰۵/۰۸/۰۱'], ['seedRate', '۱۸۰'], ['lastVisit', '۱۴۰۵/۰۸/۲۰']])
    await set('[data-input="plot:field"][data-id="' + a + '"][data-key="' + k + '"]', v);
  await tick(); await act(page, 'hole:add', '[data-id="' + a + '"]'); await sleep(200);
  await set('[data-plot="' + a + '"] textarea[data-ring="h0"]', '35.150500, 51.528900\n35.150300, 51.528700\n35.150200, 51.529100'); await sleep(450);
  await tick(); await page.evaluate(a => finishHole(a), a); await sleep(200); await closeDialogs(page);
  // قطعهٔ ۲: UTM
  await tick(); await act(page, 'plot:add'); await press(page, 'ok', 'قطعهٔ جنوبی');
  const b = await page.evaluate(() => activeProject().plots[1].id);
  await tick(); await page.select('[data-plot="' + b + '"] select[data-change="plot:mode"]', 'utm'); await sleep(300);
  await set('[data-plot="' + b + '"] input[data-input="plot:zone"]', '39'); await sleep(450);
  await set('[data-plot="' + b + '"] textarea[data-ring="outer"]', '548201.5, 3889150.2\n548302.1, 3889320.7\n548455.9, 3889240.3\n548390.0, 3889101.8'); await sleep(450);
  await set('[data-input="plot:field"][data-id="' + b + '"][data-key="code"]', 'S-۲');
  // بازدید قطعهٔ ۱
  await tick(); await page.$eval('[data-plot="' + a + '"] [data-act="visit:add"]', e => e.click()); await sleep(350);
  const v1 = await page.evaluate(() => V_OPEN);
  for (const [k, v] of [['f:inspector', 'بازدیدکنندهٔ آزمایشی'], ['f:noteGen', 'وضعیت عمومی خوب است.\nخط دوم.'], ['f:distSame', '۳۰۰'], ['f:distOther', '۵۰'], ['f:previousCrop', 'آیش'], ['f:irrigation', 'غرقابی'], ['f:nutrition', 'اوره ۱۰۰ کیلو'], ['f:summary', 'جمع‌بندی بازدید: مزرعه یکنواخت است.'], ['p:0:name', 'شته'], ['p:0:pct', '۵'], ['p:0:action', 'سم‌پاشی']])
    await set('.vs-editor [data-input="visit:field"][data-k="' + k + '"]', v);
  await tick(); await page.evaluate(([a, v]) => { vSet(a, v, 'f:stage', V_STAGE[1]); vSet(a, v, 'f:weather', 'آفتابی'); render(); }, [a, v1]); await sleep(200);
  await tick(); await act(page, 'visit:addRow', '[data-list="s"]'); await sleep(150); await tick(); await act(page, 'visit:addRow', '[data-list="r"]'); await sleep(150);
  await tick(); await page.evaluate(([a, v]) => { const x = vFind(a, v); const ks = k => Object.keys(x[k][0] || {}); ks('samples').forEach((k, i) => { if (typeof x.samples[0][k] === 'string') vSet(a, v, 's:0:' + k, 'نمونه ' + i); }); ks('recs').forEach((k, i) => { if (typeof x.recs[0][k] === 'string') vSet(a, v, 'r:0:' + k, 'توصیه ' + i); }); render(); }, [a, v1]); await sleep(200);
  await tick(); await act(page, 'visit:photo', '[data-src="gal"]'); await sleep(200);
  await page.evaluate(async () => { const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 1200; const c = cv.getContext('2d'); c.fillStyle = '#2f8f58'; c.fillRect(0, 0, 1600, 1200); c.fillStyle = '#ffe08a'; c.fillRect(200, 200, 500, 300);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png')); const el = document.getElementById('visitFile'); const dt = new DataTransfer(); dt.items.add(new File([blob], 'photo.png', { type: 'image/png' })); el.files = dt.files; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(1500);
  await tick(); await page.evaluate(vid => { const cv = document.querySelector('canvas[data-sigcv="' + vid + '"]'); const c = cv.getContext('2d'); c.beginPath(); c.moveTo(10, 10); c.lineTo(120, 60); c.lineTo(200, 20); c.stroke(); cv.dataset.dirty = '1'; }, v1);
  await act(page, 'visit:sign'); await press(page, 'ok', 'کشاورز آزمایشی'); await sleep(500);
  await tick(); await page.evaluate(() => visitClose()); await sleep(200);
  // بازدید دوم (ساده) روی قطعهٔ ۲ و گزارش کلی پروژه
  await tick(); await page.$eval('[data-plot="' + b + '"] [data-act="visit:add"]', e => e.click()); await sleep(350);
  await set('.vs-editor [data-input="visit:field"][data-k="f:summary"]', 'بازدید کوتاه قطعهٔ جنوبی'); await tick(); await page.evaluate(() => visitClose());
  await tick(); await page.$eval('#genCard [data-act="visit:add"]', e => e.click()); await sleep(350);
  const g1 = await page.evaluate(() => V_OPEN); const P = await page.evaluate(() => state.activeId);
  await set('#genCard .vs-editor [data-input="visit:field"][data-k="f:summary"]', 'گزارش کلی پروژه: همه‌چیز طبق برنامه.'); await set('#genCard .vs-editor [data-input="visit:field"][data-k="f:inspector"]', 'ناظر'); await tick(); await page.evaluate(() => visitClose()); await sleep(200);
  // خروجی‌ها
  await grab('GeoJSON پروژه', () => act(page, 'exp:projGeo'));
  await grab('KML پروژه', () => act(page, 'exp:projKml'));
  await grab('CSV پروژه', () => act(page, 'exp:projCsv'));
  await grab('JSON پروژه', () => act(page, 'exp:projJson'));
  await grab('GeoJSON تک‌تک قطعات', () => act(page, 'exp:projZip'), 1800);
  await grab('چاپ پروژه', () => act(page, 'exp:projPrint'), 800);
  await grab('GeoJSON قطعه', () => act(page, 'plot:geo', '[data-id="' + a + '"]'));
  await grab('KML قطعه', () => act(page, 'plot:kml', '[data-id="' + a + '"]'));
  await grab('CSV قطعه', () => page.evaluate(a => exportPlotCsv(a), a));
  await grab('GeoJSON همه', () => act(page, 'exp:allGeo'));
  await grab('KML همه', () => act(page, 'exp:allKml'));
  await grab('CSV همه', () => act(page, 'exp:allCsv'));
  await grab('پشتیبان JSON', () => act(page, 'backup:export'));
  await grab('فایل همگام‌سازی', () => act(page, 'sync:exportOffline'));
  await grab('پشتیبان کامل', () => act(page, 'fullBackup:export'), 1500);
  await grab('Word بازدید', () => page.evaluate(([a, v]) => visitWord(a, v), [a, v1]), 1800);
  await grab('Word همهٔ بازدیدهای قطعه', () => page.evaluate(a => visitWordAll(a), a), 1800);
  await grab('Word گزارش کلی', () => page.evaluate(([p, v]) => visitWord(p, v), [P, g1]), 1800);
  await act(page, 'rep:open'); await sleep(300);
  await grab('CSV گزارش پروژه‌ها', () => act(page, 'rep:csv'));
  await grab('چاپ گزارش پروژه‌ها', () => act(page, 'rep:print'), 700);
  out['وضعیت ذخیره‌شده (localStorage)'] = Buffer.from(await page.evaluate(() => localStorage.getItem(STORE_KEY)), 'utf8');
  out['__ver'] = await page.evaluate(() => APP_VERSION); out['__errors'] = page.__errors.slice();
  await page.close(); return out;
}
const stOld = await oldSite(); const stNew = await site();
const O = await run(stOld); const N = await run(stNew);
S.ok(O.__ver === '2.6.1' && N.__ver === '2.6.2', 'مقایسهٔ نسخهٔ ' + O.__ver + ' با ' + N.__ver);
S.ok(!N.__errors.length, 'نسخهٔ تازه خطایی در صفحه ندارد', N.__errors);
S.ok(O.__errors.every(e => /toast is not defined/.test(e)), 'نسخهٔ قبلی فقط همان خطای شناخته‌شده را دارد (پیامِ پایانِ «GeoJSON تک‌تک قطعات»)', O.__errors);
const names = Object.keys(O).filter(k => !k.startsWith('__'));
S.ok(names.length >= 22 && JSON.stringify(names) === JSON.stringify(Object.keys(N).filter(k => !k.startsWith('__'))), 'هر دو نسخه همان ' + names.length + ' خروجی را با همان نام‌ها ساختند', [names.length, Object.keys(N).length]);
const norm = (name, buf) => { // تنها تفاوتِ مجاز: خودِ شمارهٔ نسخه که در پشتیبان کامل نوشته می‌شود
  if (/پشتیبان کامل/.test(name)) return Buffer.from(buf.toString('utf8').replace(/"appVersion":"[0-9.]+"/, '"appVersion":"X"'), 'utf8'); return buf; };
for (const k of names) {
  const a = norm(k, O[k]), b = N[k] ? norm(k, N[k]) : Buffer.alloc(0);
  if (/\.docx$/.test(k)) { const za = unzip(a), zb = unzip(b); const parts = Object.keys(za);
    const same = JSON.stringify(parts) === JSON.stringify(Object.keys(zb)) && parts.every(p => za[p].equals(zb[p]));
    S.ok(same && a.length > 2000, k + ' (' + parts.length + ' بخش، ' + a.length + ' بایت)', parts.filter(p => !zb[p] || !za[p].equals(zb[p]))); }
  else { let at = -1; if (!a.equals(b)) { const n = Math.min(a.length, b.length); at = n; for (let i = 0; i < n; i++) if (a[i] !== b[i]) { at = i; break; } }
    S.ok(at < 0 && a.length > 20, k + ' (' + a.length + ' بایت)', at >= 0 ? { at, old: a.slice(Math.max(0, at - 60), at + 80).toString('utf8'), new: b.slice(Math.max(0, at - 60), at + 80).toString('utf8') } : 'خالی'); }
}
S.done(); await browser.close(); stOld.close(); stNew.close();
