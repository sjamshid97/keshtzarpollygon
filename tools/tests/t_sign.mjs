// امضاها در برنامه: کادر بزرگ‌تر، امضای کارشناس فنی کنار امضای کشاورز، و اینکه هیچ امضایی بی‌صدا گم نشود
import { site, launch, open, suite, sleep, act, type, press, waitDialog, dialogs, closeDialogs, setFile, downloads, clearDl, txt, bin, drawPad, padInk, padSel, sigXKey, sigKeys } from './h.mjs';
import { fakeSupabase } from './sb.mjs';
import { device, UA_PC, UA_AND } from './dev.mjs';
import { unzip } from './zip.mjs';
const st = await site(); const sb = await fakeSupabase(); const browser = await launch(); const S = suite('امضای کشاورز و کارشناس فنی');
const PHONE = { width: 400, height: 820, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const A = await open(browser, st, { viewport: PHONE });
const visit = (page, plot, vid) => page.evaluate(([p, v]) => { const x = vFind(p, v); return x ? JSON.parse(JSON.stringify(x)) : null; }, [plot, vid]);
const sigImg = (page, key) => page.evaluate(async key => { const b = await vIdbGet('sigs', key); if (!(b instanceof Blob)) return null; const s = await vImgSize(b);
  const u = new Uint8Array(await b.arrayBuffer()); let h = 0; for (let i = 0; i < u.length; i++) h = (h * 31 + u[i]) >>> 0; return { size: b.size, w: s.w, h: s.h, hash: h, type: b.type }; }, key);
const shown = (page, key) => page.evaluate(async key => { const img = document.querySelector('img[data-sig="' + key + '"]'); if (!img) return null; if (!img.src) return { src: '' };
  const u = new Uint8Array(await (await fetch(img.src)).arrayBuffer()); let h = 0; for (let i = 0; i < u.length; i++) h = (h * 31 + u[i]) >>> 0; return { hash: h, size: u.length, w: img.naturalWidth }; }, key);
const toast = page => page.evaluate(() => { const e = document.getElementById('vToast'); return e && e.classList.contains('on') ? e.textContent : ''; });

await act(A, 'data:demo'); await closeDialogs(A);
const [a, b] = await A.evaluate(() => state.projects[0].plots.map(p => p.id)); const P = await A.evaluate(() => state.activeId);
await A.$eval('[data-plot="' + a + '"] [data-act="visit:add"]', e => e.click()); await sleep(450);
const v1 = await A.evaluate(() => V_OPEN);
await type(A, '.vs-editor [data-input="visit:field"][data-k="f:inspector"]', 'مهندس آزمایشی');

S.sec('دو کادر امضا، بزرگ‌تر از قبل');
let pf = await padInk(A, v1), px = await padInk(A, v1, 'x');
S.ok(pf && px, 'برگهٔ بازدید دو کادر امضا دارد: کشاورز و کارشناس فنی', { pf, px });
S.ok(pf.cssH === 240 && px.cssH === 240 && pf.cssW > 250, 'بلندی هر کادر ۲۴۰ است (پیش‌تر ۱۳۰ بود) و پهنای صفحه را می‌گیرد', [pf.cssW, pf.cssH, px.cssH]);
const titles = await A.evaluate(() => [...document.querySelectorAll('.vs-editor .vs-st')].map(e => e.textContent));
S.ok(titles.indexOf('امضای کارشناس فنی') === titles.indexOf('امضای کشاورز') + 1 && titles.indexOf('امضای کشاورز') > 0, 'بخش «امضای کارشناس فنی» درست بعد از «امضای کشاورز» است', titles);
S.ok(await A.evaluate(() => { const t = document.querySelector('.vs-editor').textContent; return t.includes('بازدیدکننده (کارشناس فنی)') && !t.includes('مسئول فنی') && !document.body.innerHTML.includes('مسئول فنی'); }), 'در برگه نوشته شده «بازدیدکننده (کارشناس فنی)» و عبارت «مسئول فنی» دیگر هیچ‌جای برنامه نیست');
S.eq(Object.keys(await visit(A, a, v1)).sort(), ['f', 'id', 'made', 'pests', 'photos', 'recs', 'samples', 'sig', 'touch', '_anc'].sort(), 'بازدیدِ بی‌امضای کارشناس همان شکلِ قبلی را دارد (چیزی به آن اضافه نشده)');

S.sec('امضای کشیده‌شده ولی ثبت‌نشده گم نمی‌شود');
await act(A, 'visit:sign'); let d = await waitDialog(A);
S.ok(d && /اول با انگشت/.test(d.msg), 'بدون کشیدن، «ثبت امضا» فقط راهنمایی می‌کند', d); await closeDialogs(A);
await act(A, 'visit:signX'); d = await waitDialog(A);
S.ok(d && /اول با انگشت/.test(d.msg), 'برای کارشناس فنی هم همین‌طور', d); await closeDialogs(A);
await drawPad(A, v1); await drawPad(A, v1, 'x', [[150, 100], [180, 125], [210, 100], [245, 135]]);
pf = await padInk(A, v1); px = await padInk(A, v1, 'x');
S.ok(pf.dirty && px.dirty && pf.ink > 300 && px.ink > 300, 'هر دو نفر در کادر خودشان کشیدند', [pf.ink, px.ink]);
await act(A, 'visit:addRow', '[data-list="r"]'); await sleep(300);             // صفحه از نو ساخته می‌شود
let pf2 = await padInk(A, v1), px2 = await padInk(A, v1, 'x');
S.ok(pf2.dirty && px2.dirty && Math.abs(pf2.ink - pf.ink) < pf.ink * 0.05 && Math.abs(px2.ink - px.ink) < px.ink * 0.05, 'با افزودن یک ردیف (که صفحه را از نو می‌سازد) هیچ‌کدام از دو امضا پاک نشد', [[pf.ink, pf2.ink], [px.ink, px2.ink]]);
await A.evaluate(() => render()); await sleep(250); await A.evaluate(() => { render(); render(); }); await sleep(300);
pf2 = await padInk(A, v1); px2 = await padInk(A, v1, 'x');
S.ok(pf2.dirty && px2.dirty && Math.abs(pf2.ink - pf.ink) < pf.ink * 0.08 && Math.abs(px2.ink - px.ink) < px.ink * 0.08, 'چند بار بازسازیِ پشت‌سرهم هم آن را پاک نمی‌کند', [[pf.ink, pf2.ink], [px.ink, px2.ink]]);
// دو بازسازیِ خیلی نزدیک به هم: دومی درست وقتی می‌رسد که خط‌های کنارگذاشته هنوز روی کادرِ تازه ننشسته
await A.evaluate(async () => { for (let k = 0; k < 4; k++) { render(); await new Promise(r => setTimeout(r, 0)); } render(); }); await sleep(400);
pf2 = await padInk(A, v1); px2 = await padInk(A, v1, 'x');
S.ok(pf2.dirty && px2.dirty && Math.abs(pf2.ink - pf.ink) < pf.ink * 0.08 && Math.abs(px2.ink - px.ink) < px.ink * 0.08, 'حتی وقتی بازسازی دوم پیش از نشستنِ خط‌های قبلی برسد، امضا پاک نمی‌شود', [[pf.ink, pf2.ink], [px.ink, px2.ink]]);
const listeners = await A.evaluate(async () => { let n = 0; const add = window.addEventListener, rem = window.removeEventListener;
  window.addEventListener = function (t, f, o) { if (t === 'resize') n++; return add.call(this, t, f, o); }; window.removeEventListener = function (t, f, o) { if (t === 'resize') n--; return rem.call(this, t, f, o); };
  for (let k = 0; k < 6; k++) { render(); await new Promise(r => setTimeout(r, 30)); } window.dispatchEvent(new Event('resize')); await new Promise(r => setTimeout(r, 60));
  window.addEventListener = add; window.removeEventListener = rem; return n; });
S.ok(listeners <= 2, 'کادرهای قدیمی که با بازسازی صفحه کنار رفته‌اند دیگر به تغییر اندازهٔ صفحه گوش نمی‌دهند (برنامه کند نمی‌شود)', listeners);
pf2 = await padInk(A, v1); px2 = await padInk(A, v1, 'x');
S.ok(pf2.dirty && px2.dirty && Math.abs(pf2.ink - pf.ink) < pf.ink * 0.1 && Math.abs(px2.ink - px.ink) < px.ink * 0.1, 'و بعد از تغییر اندازهٔ صفحه هم امضاها سر جایشان هستند', [[pf.ink, pf2.ink], [px.ink, px2.ink]]);

S.sec('ثبت امضای کشاورز');
await act(A, 'visit:sign'); d = await waitDialog(A);
const defF = await A.evaluate(() => document.querySelector('.dlg-wrap .dlg input').value);
S.ok(d && d.title === 'ثبت امضا' && defF === 'محمد رضایی', 'نام پیشنهادی = نام کشاورز در مشخصات پروژه', [d && d.title, defF]);
await press(A, 'ok'); await sleep(450);
let v = await visit(A, a, v1);
S.ok(v.sig && v.sig.name === 'محمد رضایی' && v.sig.refused === false && !('sigExpert' in v), 'امضای کشاورز ثبت شد؛ امضای کارشناس هنوز ثبت نشده', v.sig);
px2 = await padInk(A, v1, 'x');
S.ok(px2 && px2.dirty && Math.abs(px2.ink - px.ink) < px.ink * 0.08, 'با ثبت امضای کشاورز، خط‌های ثبت‌نشدهٔ کارشناس سر جایش ماند', [px.ink, px2 && px2.ink]);
const fImg = await sigImg(A, v1);
S.ok(fImg && fImg.type === 'image/png' && fImg.w < pf.w && fImg.h < pf.h && fImg.w >= 200 && fImg.h >= 100, 'تصویر امضا فقط به اندازهٔ خودِ خط‌ها بریده و ذخیره شد (کادر ' + pf.w + '×' + pf.h + ' → تصویر ' + (fImg && fImg.w) + '×' + (fImg && fImg.h) + ')', fImg);
await sleep(200); let sh = await shown(A, v1);
S.ok(sh && sh.hash === fImg.hash, 'همان تصویر در برگه نشان داده می‌شود', [sh, fImg]);

S.sec('ثبت امضای کارشناس فنی');
await act(A, 'visit:signX'); d = await waitDialog(A);
const defX = await A.evaluate(() => document.querySelector('.dlg-wrap .dlg input').value);
S.ok(d && d.title === 'ثبت امضای کارشناس فنی' && /نام کارشناس فنی/.test(d.msg) && defX === 'مهندس آزمایشی', 'نام پیشنهادی = همان که در «بازدیدکننده» نوشته شده', [d && d.title, defX]);
await press(A, 'ok', 'مهندس نمونه'); await sleep(450);
S.ok(/امضای کارشناس فنی ثبت شد/.test(await toast(A)), 'پیام کوتاه «امضای کارشناس فنی ثبت شد» دیده می‌شود', await toast(A));
v = await visit(A, a, v1);
S.eq(Object.keys(v.sigExpert || {}).sort(), ['at', 'id', 'name'], 'برای امضای کارشناس فقط نام، تاریخ و شناسهٔ همان امضا در بازدید نوشته می‌شود (نه خودِ تصویر)');
S.ok(v.sigExpert.name === 'مهندس نمونه' && /^[۰-۹]{4}\/[۰-۹]{1,2}\/[۰-۹]{1,2}$/.test(v.sigExpert.at) && v.sig.name === 'محمد رضایی', 'نام و تاریخ امضای کارشناس ثبت شد و امضای کشاورز دست نخورد', [v.sig, v.sigExpert]);
const k1 = await sigXKey(A, v1); const xImg = await sigImg(A, k1);
S.ok(k1 && k1.startsWith(v1 + '|x|') && k1.length > (v1 + '|x|').length && v.sigExpert.id && k1.endsWith('|' + v.sigExpert.id), 'تصویر امضای کارشناس با کلیدِ خودش ذخیره می‌شود (شناسهٔ بازدید + شناسهٔ همان امضا)', [k1, v.sigExpert]);
S.ok(xImg && xImg.hash !== fImg.hash && (await sigImg(A, v1)).hash === fImg.hash, 'تصویر امضای کارشناس جدا ذخیره شد و روی امضای کشاورز ننشست', [xImg, fImg]);
S.ok(await A.evaluate(() => !document.querySelector('canvas[data-sigcv], canvas[data-sigcvx]')) && (await shown(A, k1)).hash === xImg.hash && (await shown(A, v1)).hash === fImg.hash, 'هر دو امضا در برگه دیده می‌شوند، هر کدام در بخش خودش');
S.ok(await A.evaluate(() => /میان دستگاه‌ها منتقل نمی‌شوند/.test(document.querySelector('.vs-editor').textContent)), 'برگه یادآوری می‌کند که تصویر امضا میان دستگاه‌ها منتقل نمی‌شود');

S.sec('پاک‌کردن و امضای دوباره');
await act(A, 'visit:signXClear'); d = await waitDialog(A);
S.ok(d && /امضای ثبت‌شدهٔ کارشناس فنی پاک شود/.test(d.msg), 'پاک‌کردن امضای کارشناس اول می‌پرسد', d);
await press(A, 'cancel'); await sleep(200);
S.ok((await visit(A, a, v1)).sigExpert && await sigImg(A, k1), '«انصراف» چیزی را پاک نمی‌کند');
await act(A, 'visit:signXClear'); await press(A, 'ok'); await sleep(400);
v = await visit(A, a, v1);
S.ok(!('sigExpert' in v) && await sigImg(A, k1) === null && v.sig && (await sigImg(A, v1)).hash === fImg.hash, 'امضای کارشناس و تصویرش پاک شد؛ امضای کشاورز سر جایش است', Object.keys(v));
px = await padInk(A, v1, 'x');
S.ok(px && !px.dirty && px.ink === 0, 'کادر کارشناس دوباره خالی و آماده است', px);
await drawPad(A, v1, 'x', [[60, 60], [280, 60], [280, 180], [60, 180], [60, 60]]); await act(A, 'visit:signX'); await press(A, 'ok'); await sleep(450);
const k2 = await sigXKey(A, v1); const xImg2 = await sigImg(A, k2); sh = await shown(A, k2);
S.ok(k2 && k2 !== k1 && xImg2 && xImg2.hash !== xImg.hash && sh && sh.hash === xImg2.hash, 'بعد از امضای دوباره، امضای تازه (با کلید تازه) دیده می‌شود، نه امضای قبلی', { k1, k2, old: xImg.hash, now: xImg2 && xImg2.hash, shown: sh });
S.eq(await sigKeys(A), [v1, k2].sort(), 'در حافظهٔ دستگاه فقط همین دو تصویر هست (تصویر امضای پاک‌شده نمانده)');
S.ok((await visit(A, a, v1)).sigExpert.name === 'مهندس آزمایشی', 'و نام پیشنهادی پذیرفته شد');
// کشاورز هم: پاک‌کردن و دوباره
await act(A, 'visit:signClear'); await press(A, 'ok'); await sleep(400);
await drawPad(A, v1, '', [[30, 200], [150, 40], [290, 200]]); await act(A, 'visit:sign'); await press(A, 'ok', 'نمایندهٔ کشاورز'); await sleep(450);
const fImg2 = await sigImg(A, v1); sh = await shown(A, v1);
S.ok(fImg2.hash !== fImg.hash && sh && sh.hash === fImg2.hash && (await visit(A, a, v1)).sig.name === 'نمایندهٔ کشاورز', 'برای امضای کشاورز هم بعد از «پاک‌کردن و امضای دوباره» امضای تازه دیده می‌شود (پیش‌تر همان قبلی می‌ماند)', { old: fImg.hash, now: fImg2.hash, shown: sh });
// پاک‌کردنِ کادری که هنوز ثبت نشده
await A.evaluate(() => visitClose()); await sleep(150);
await A.$eval('[data-plot="' + b + '"] [data-act="visit:add"]', e => e.click()); await sleep(450); const v2 = await A.evaluate(() => V_OPEN);
await drawPad(A, v2); await drawPad(A, v2, 'x'); const before2 = JSON.stringify(await visit(A, b, v2));
await act(A, 'visit:signXClear'); await sleep(300);
S.ok((await dialogs(A)).length === 0 && (await padInk(A, v2, 'x')).ink === 0 && (await padInk(A, v2)).ink > 300 && JSON.stringify(await visit(A, b, v2)) === before2, '«پاک کردن امضا» روی کادرِ ثبت‌نشدهٔ کارشناس فقط همان کادر را پاک می‌کند (بدون پرسش، بدون دست‌زدن به بازدید)');
await act(A, 'visit:signClear'); await sleep(300);
S.ok((await padInk(A, v2)).ink === 0 && !(await padInk(A, v2)).dirty, 'و برای کادر کشاورز هم');
// کاربر نام را پاک می‌کند / انصراف می‌زند
await drawPad(A, v2, 'x'); await act(A, 'visit:signX'); await press(A, 'cancel'); await sleep(400);
S.ok((await visit(A, b, v2)).sigExpert && (await visit(A, b, v2)).sigExpert.name === 'کارشناس فنی' && await sigImg(A, await sigXKey(A, v2)), 'اگر نامی نباشد، امضا با نام «کارشناس فنی» ثبت می‌شود (خانهٔ «بازدیدکننده» خالی است)', (await visit(A, b, v2)).sigExpert);

S.sec('امتناع از امضا (مثل قبل)');
await act(A, 'visit:signRefuse'); await press(A, 'ok', 'دهیار'); await sleep(350);
v = await visit(A, b, v2);
S.ok(v.sig && v.sig.refused && v.sig.witness === 'دهیار' && v.sigExpert && await padInk(A, v2) === null, 'امتناع کشاورز ثبت می‌شود و امضای کارشناس سر جایش می‌ماند', v.sig);

S.sec('گزارش کلی پروژه');
await A.evaluate(() => visitClose()); await A.$eval('#genCard [data-act="visit:add"]', e => e.click()); await sleep(450); const g1 = await A.evaluate(() => V_OPEN);
S.ok(await padInk(A, g1) && await padInk(A, g1, 'x'), 'گزارش کلی پروژه هم هر دو کادر امضا را دارد');
await drawPad(A, g1, 'x'); await A.evaluate(() => document.querySelector('#genCard [data-act="visit:signX"]').click()); await press(A, 'ok', 'ناظر پروژه'); await sleep(450);
S.ok((await A.evaluate(([p, g]) => vFind(p, g).sigExpert, [P, g1])).name === 'ناظر پروژه' && await sigImg(A, await sigXKey(A, g1)), 'امضای کارشناس برای گزارش کلی ثبت شد');
await A.evaluate(() => visitClose()); await sleep(150);

S.sec('پشتیبان کامل');
await clearDl(A); await act(A, 'fullBackup:export'); await sleep(1500); await closeDialogs(A); let dl = await downloads(A);
const pack = dl.length ? JSON.parse(txt(dl[0])) : null;
const keys = pack ? pack.media.map(m => m.kind + ':' + m.key).sort() : [];
const kv2 = await sigXKey(A, v2), kg1 = await sigXKey(A, g1);
S.eq(keys, ['sigs:' + v1, 'sigs:' + k2, 'sigs:' + kv2, 'sigs:' + kg1].sort(), 'پشتیبان کامل هر دو جور امضا را دارد');
const B = await open(browser, st, { viewport: PHONE });
await setFile(B, '#fullBackupFile', 'پشتیبان-کامل.json', JSON.stringify(pack)); d = await waitDialog(B, 8000);
S.ok(d && /تصویر امضای تازه: ۴/.test(d.msg), 'دستگاه دیگر فایل را می‌پذیرد و ۴ تصویر امضا می‌شمارد', d && d.msg); await press(B, 'ok'); await sleep(900); await closeDialogs(B);
S.ok((await sigImg(B, k2) || {}).hash === xImg2.hash && (await sigImg(B, v1) || {}).hash === fImg2.hash && await sigXKey(B, v1) === k2, 'روی دستگاه دیگر هر دو تصویر امضا همان است');
// فایلی که نسخهٔ قدیمی‌تر برنامه ساخته: تصویر امضای کارشناس را ندارد
const oldPack = JSON.parse(JSON.stringify(pack)); oldPack.appVersion = '2.6.1'; oldPack.media = oldPack.media.filter(m => !/\|x\|/.test(m.key));
const C = await open(browser, st, { viewport: PHONE });
await setFile(C, '#fullBackupFile', 'پشتیبان-کامل-قدیمی.json', JSON.stringify(oldPack)); d = await waitDialog(C, 8000);
S.ok(d && /تصویر امضای تازه: ۱/.test(d.msg), 'فایلی که تصویر امضای کارشناس را ندارد (ساختِ نسخهٔ قدیمی‌تر) هم پذیرفته می‌شود', d && d.msg); await press(C, 'ok'); await sleep(900); await closeDialogs(C);
S.ok(await C.evaluate(() => state.projects.length === 1) && await sigImg(C, v1) && await sigImg(C, k2) === null && (await visit(C, a, v1)).sigExpert, 'داده و امضای کشاورز آمد؛ از امضای کارشناس فقط نام و تاریخ');
await C.evaluate(([a, v]) => { visitOpen(a, v); }, [a, v1]); await sleep(500);
S.ok(/در این دستگاه نیست/.test(await C.evaluate(k => (document.querySelector('img[data-sig="' + k + '"]') || {}).alt || '', k2)), 'و برگه می‌گوید تصویرش روی این دستگاه نیست');
// فایل دست‌کاری‌شده هنوز رد می‌شود
const bad1 = JSON.parse(JSON.stringify(pack)); bad1.media = bad1.media.filter(m => m.key !== v1);
const bad2 = JSON.parse(JSON.stringify(pack)); bad2.media.push(Object.assign({}, bad2.media[0], { key: v1 + '|x|zzz' }));
const D = await open(browser, st, { viewport: PHONE });
await setFile(D, '#fullBackupFile', 'bad1.json', JSON.stringify(bad1)); d = await waitDialog(D, 8000); const m1 = d && d.msg; await closeDialogs(D);
await setFile(D, '#fullBackupFile', 'bad2.json', JSON.stringify(bad2)); d = await waitDialog(D, 8000); const m2 = d && d.msg; await closeDialogs(D);
S.ok(/کامل نیست/.test(m1 || '') && /کامل نیست|اضافی یا تکراری/.test(m2 || '') && await D.evaluate(() => state.projects.length === 0), 'فایلی که تصویر امضای کشاورز را کم دارد یا تصویر اضافه دارد، مثل قبل پذیرفته نمی‌شود', [m1, m2]);

S.sec('حذف بازدید');
await A.evaluate(([b, v]) => { visitOpen(b, v); }, [b, v2]); await sleep(350); await act(A, 'visit:del'); await press(A, 'ok'); await sleep(500);
S.eq(await sigKeys(A), [v1, k2, kg1].sort(), 'با حذف بازدید، تصویر امضاهای همان بازدید پاک می‌شود و بقیه می‌مانند');

S.sec('همگام‌سازی: نام و تاریخ امضا می‌رود، تصویرش نه');
const X = await device(browser, st, sb, 'k-sign', { ua: UA_AND, viewport: PHONE });
await act(X, 'data:demo'); await closeDialogs(X);
const [xa] = await X.evaluate(() => state.projects[0].plots.map(p => p.id));
await X.$eval('[data-plot="' + xa + '"] [data-act="visit:add"]', e => e.click()); await sleep(450); const xv = await X.evaluate(() => V_OPEN);
await type(X, '.vs-editor [data-input="visit:field"][data-k="f:summary"]', 'بازدید با دو امضا');
await drawPad(X, xv); await act(X, 'visit:sign'); await press(X, 'ok'); await sleep(400);
await drawPad(X, xv, 'x'); await act(X, 'visit:signX'); await press(X, 'ok', 'کارشناس گوشی'); await sleep(400);
await X.evaluate(() => visitClose()); await X.push();
const Y = await device(browser, st, sb, 'k-sign', { ua: UA_PC }); await Y.pull();
let yv = await visit(Y, xa, xv);
S.ok(yv && yv.sigExpert && yv.sigExpert.name === 'کارشناس گوشی' && yv.sig && (await sigKeys(Y)).length === 0 && await sigXKey(Y, xv) === await sigXKey(X, xv), 'دستگاه دیگر نام و تاریخ امضای کارشناس را گرفت (تصویر فقط روی دستگاه امضاکننده است)', yv && yv.sigExpert);
await Y.evaluate(([a, v]) => { visitOpen(a, v); }, [xa, xv]); await sleep(400);
await type(Y, '.vs-editor [data-input="visit:field"][data-k="f:summary"]', 'ویرایش روی کامپیوتر'); await Y.evaluate(() => visitClose()); await Y.push(); await X.pull();
const xv2 = await visit(X, xa, xv);
S.ok(xv2.f.summary === 'ویرایش روی کامپیوتر' && xv2.sigExpert && xv2.sigExpert.name === 'کارشناس گوشی' && await sigImg(X, await sigXKey(X, xv)), 'ویرایش دستگاه دیگر برگشت و امضای کارشناس (نام، تاریخ و تصویر) سر جایش است');
const quiet = p => p.evaluate(() => document.getElementById('syncWarn').classList.contains('u-hidden') && !document.querySelector('.dlg-wrap .dlg'));
S.ok(await quiet(X) && await quiet(Y), 'هیچ هشدار «دو نسخه» یا پرسشی پیش نیامد');
// پاک‌کردن امضای کارشناس روی یک دستگاه به دستگاه دیگر می‌رسد
await X.evaluate(([a, v]) => { visitOpen(a, v); }, [xa, xv]); await sleep(400); await act(X, 'visit:signXClear'); await press(X, 'ok'); await sleep(300); await X.evaluate(() => visitClose()); await X.push(); await Y.pull();
S.ok(!('sigExpert' in (await visit(Y, xa, xv))) && (await visit(Y, xa, xv)).sig && await quiet(Y), 'پاک‌شدن امضای کارشناس هم به دستگاه دیگر رسید؛ امضای کشاورز مانده است');

S.sec('امضای دوباره روی دستگاه دیگر');
// X دوباره امضا می‌کند؛ بعد روی Y پاک و دوباره امضا می‌شود. X نباید تصویر قدیمیِ خودش را به‌جای امضای تازه نشان دهد یا در ورد بگذارد.
await X.evaluate(([a, v]) => { visitOpen(a, v); }, [xa, xv]); await sleep(400); await drawPad(X, xv, 'x'); await act(X, 'visit:signX'); await press(X, 'ok', 'امضای اول'); await sleep(400); await X.evaluate(() => visitClose());
const kOld = await sigXKey(X, xv); await X.push(); await Y.pull();
await Y.evaluate(([a, v]) => { visitOpen(a, v); }, [xa, xv]); await sleep(400); await act(Y, 'visit:signXClear'); await press(Y, 'ok'); await sleep(300);
await drawPad(Y, xv, 'x', [[30, 30], [300, 200]]); await act(Y, 'visit:signX'); await press(Y, 'ok', 'امضای دوم'); await sleep(400); await Y.evaluate(() => visitClose()); await Y.push(); await X.pull();
const kNew = await sigXKey(X, xv);
S.ok(kNew && kNew !== kOld && kNew === await sigXKey(Y, xv) && (await visit(X, xa, xv)).sigExpert.name === 'امضای دوم' && await sigImg(X, kNew) === null && await sigImg(Y, kNew), 'نام و تاریخ امضای دوم به دستگاه اول رسید؛ تصویرش فقط روی دستگاه دوم است', { kOld, kNew });
await X.evaluate(([a, v]) => { visitOpen(a, v); }, [xa, xv]); await sleep(500);
S.ok(/در این دستگاه نیست/.test(await X.evaluate(k => { const i = document.querySelector('img[data-sig="' + k + '"]'); return i ? (i.getAttribute('src') ? 'تصویر دارد' : i.alt) : 'نیست'; }, kNew)), 'دستگاه اول تصویرِ امضای قبلیِ خودش را به‌جای امضای تازه نشان نمی‌دهد؛ می‌گوید تصویر روی این دستگاه نیست');
await X.evaluate(() => visitClose());

const errs = [A, B, C, D, X, Y].flatMap(p => p.__errors);
S.eq(errs, [], 'خطایی در صفحه‌ها نیست');
S.done(); await browser.close(); st.close(); sb.close();
