// نصبِ نسخهٔ تازه روی نسخهٔ نصب‌شدهٔ قبلی، همان‌طور که فایل نصب ویندوز انجام می‌دهد:
// فایل برنامه در همان مسیرِ روی کامپیوتر (file://) با نسخهٔ تازه جایگزین می‌شود و حافظهٔ مرورگر دست نمی‌خورد.
// نسخهٔ قدیمی از داخل فایل نصب قبلی می‌آید (در مخزن نیست):
//   python3 tools/installer/build_installer.py --base فایل-نصب-قبلی.exe --extract _local/base
//   KZ_OLD_INDEX=_local/base/index.html node tools/tests/t_upgrade_file.mjs
import { site, launch, open, reopen, suite, sleep, closeDialogs, dialogs, type, act, press, downloads, clearDl, txt, bin, REPO } from './h.mjs';
import { fakeSupabase } from './sb.mjs';
import { device, UA_PC, UA_AND } from './dev.mjs';
import { unzip } from './zip.mjs';
import fs from 'fs'; import os from 'os'; import path from 'path';

const NAME = 'نصب روی نسخهٔ قبلی (فایلِ روی کامپیوتر)';
const OLD = [process.env.KZ_OLD_INDEX, path.join(REPO, '_local', 'base', 'index.html')].find(f => f && fs.existsSync(f));
if (!OLD) { console.log('\n■ ' + NAME + '\n   • انجام نشد: فایل نسخهٔ قدیمی در دسترس نیست (KZ_OLD_INDEX)\n✓ [' + NAME + '] 0 درست، 0 نادرست'); process.exit(0); }

const S = suite(NAME); const sb = await fakeSupabase(); const st = await site(); const browser = await launch();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'seedcoord-up-'));
const WANT = (fs.readFileSync(path.join(REPO, 'index.html'), 'utf8').match(/const APP_VERSION = '([0-9.]+)'/) || [])[1];
const DAY = 86400000;
/* ساعتِ دستگاه: «window.name» بین بازشدن‌های پیاپیِ همان پنجره می‌ماند، پس می‌شود پیش از نصب ساعت را عقب نگه داشت و بعد جلو آورد */
const clock = off => '(' + (o => { if (!/^off:/.test(window.name || '')) window.name = 'off:' + o; const R = Date; const d = () => +(/^off:(-?\d+)$/.exec(window.name) || [0, 0])[1];
  class D extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + d()); } static now() { return R.now() + d(); } } window.Date = D; }).toString() + ')(' + off + ')';
const install = dir => { for (const f of ['index.html', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest']) fs.copyFileSync(path.join(REPO, f), path.join(dir, f)); };
const oldPc = async (name, key, off = 0) => { const dir = path.join(tmp, name, 'SeedCoordinates'); fs.mkdirSync(dir, { recursive: true }); fs.copyFileSync(OLD, path.join(dir, 'index.html'));
  const url = 'file://' + dir + '/index.html';
  const p = await open(browser, { base: 'file://' }, { url: url + '?' + sb.link(key, false).split('?')[1], allow: [sb.url], ua: UA_PC, settle: 1500, before: clock(off) });
  p.dir = dir; p.url = url; return p; };
const pull = async p => { await p.evaluate(() => { gsPull(false); }); await sleep(900); return closeDialogs(p); };
const push = async p => { await p.evaluate(() => { gsPush(false); }); await sleep(900); return closeDialogs(p); };
const projJson = p => p.evaluate(() => JSON.stringify(state.projects));
const visit = (p, id) => p.evaluate(id => { let r = null; state.projects.forEach(pr => { (pr.plots || []).forEach(pl => (pl.visits || []).forEach(v => { if (v.id === id) r = v; })); (pr.visits || []).forEach(v => { if (v.id === id) r = v; }); }); return r; }, id);
const sumOf = async (p, id) => { const v = await visit(p, id); return v ? JSON.stringify(v) : ''; };
const quiet = p => p.evaluate(() => document.getElementById('syncWarn').classList.contains('u-hidden') && !document.querySelector('.dlg-wrap .dlg'));
const bin0 = p => p.evaluate(() => { try { const b = JSON.parse(localStorage.getItem('seed_vbin_v1') || '[]'); return Array.isArray(b) ? b.length : Object.keys(b).length; } catch (e) { return -1; } });
const media = p => p.evaluate(async () => { const out = [];
  for (const pr of state.projects) for (const pl of pr.plots || []) for (const v of pl.visits || []) {
    for (const ph of v.photos || []) { const b = await vIdbGet('photos', vPhotoKey(pl.id, v.id, ph.id)); out.push('عکس ' + v.id + ':' + (b ? b.size : 'نیست')); }
    if (v.sig && !v.sig.refused) { const b = await vIdbGet('sigs', v.id); out.push('امضا ' + v.id + ':' + (b ? b.size : 'نیست')); } }
  return out; });
const newVisit = async (p, plot, text) => { await p.$eval('[data-plot="' + plot + '"] [data-act="visit:add"]', e => e.click()); await sleep(350); const id = await p.evaluate(() => V_OPEN);
  await type(p, '.vs-editor [data-input="visit:field"][data-k="f:summary"]', text); return id; };
const edit = async (p, plot, id, text) => { await p.evaluate(([a, v]) => visitOpen(a, v), [plot, id]); await sleep(350);
  await type(p, '.vs-editor [data-input="visit:field"][data-k="f:summary"]', text); await p.evaluate(() => visitClose()); await sleep(200); };
const phone = key => device(browser, st, sb, key, { ua: UA_AND, viewport: { width: 400, height: 800, isMobile: true, hasTouch: true } });

/* ═════ الف) کامپیوتری که تازه همگام شده، بعد نسخهٔ تازه رویش نصب می‌شود ═════ */
S.sec('الف-۱) کامپیوتر با نسخهٔ قدیمیِ نصب‌شده (file://)');
const pc = await oldPc('a', 'k-up-a');
const oldVer = await pc.evaluate(() => APP_VERSION);
S.ok(/^2\.5\./.test(oldVer) && await pc.evaluate(() => location.protocol) === 'file:', 'نسخهٔ قدیمی از روی فایل باز شد: ' + oldVer);
await act(pc, 'data:demo'); await closeDialogs(pc);
const [a, b] = await pc.evaluate(() => state.projects[0].plots.map(p => p.id));
const v1 = await newVisit(pc, a, 'بازدید ثبت‌شده با نسخهٔ قدیمی');
for (const [k, v] of [['f:inspector', 'کارشناس کامپیوتر'], ['f:irrigation', 'غرقابی'], ['p:0:name', 'شته'], ['p:0:pct', '۵']]) await type(pc, '.vs-editor [data-input="visit:field"][data-k="' + k + '"]', v);
await act(pc, 'visit:photo', '[data-src="gal"]'); await sleep(200);
await pc.evaluate(async () => { const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 1200; const c = cv.getContext('2d'); c.fillStyle = '#2f8f58'; c.fillRect(0, 0, 1600, 1200); c.fillStyle = '#ffe08a'; c.fillRect(200, 200, 500, 300);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png')); const el = document.getElementById('visitFile'); const dt = new DataTransfer(); dt.items.add(new File([blob], 'photo.png', { type: 'image/png' })); el.files = dt.files; el.dispatchEvent(new Event('change', { bubbles: true })); });
await sleep(1500);
await pc.evaluate(vid => { const cv = document.querySelector('canvas[data-sigcv="' + vid + '"]'); const c = cv.getContext('2d'); c.beginPath(); c.moveTo(10, 10); c.lineTo(120, 60); c.lineTo(200, 20); c.stroke(); cv.dataset.dirty = '1'; }, v1);
await act(pc, 'visit:sign'); await press(pc, 'ok', 'کشاورز آزمایشی'); await sleep(500);
await pc.evaluate(() => visitClose()); await sleep(200);
await push(pc);
S.ok(!!sb.row('k-up-a') && JSON.stringify(sb.row('k-up-a').data).includes(v1), 'نسخهٔ قدیمی بازدیدش را به سرور فرستاد', sb.log);
const mediaOld = await media(pc);
S.ok(mediaOld.length === 2 && mediaOld.every(x => !/نیست/.test(x)), 'یک عکس و یک امضا در حافظهٔ مرورگر هست', mediaOld);

S.sec('الف-۲) گوشی با نسخهٔ تازه کنار کامپیوترِ نسخهٔ قدیمی');
const ph = await phone('k-up-a'); await ph.pull();
S.ok(!!(await visit(ph, v1)), 'گوشی بازدیدِ کامپیوتر را گرفت');
const v2 = await ph.addVisit(b, 'بازدید ثبت‌شده با گوشی');
await ph.selectProject(await ph.evaluate(id => state.projects.find(p => (p.plots || []).some(pl => pl.id === id)).id, a));
await ph.$eval('#genCard [data-act="visit:add"]', e => e.click()); await sleep(350); const g1 = await ph.evaluate(() => V_OPEN);
await type(ph, '#genCard .vs-editor [data-input="visit:field"][data-k="f:summary"]', 'گزارش کلی پروژه از گوشی'); await ph.evaluate(() => visitClose()); await sleep(200);
await ph.push(); await pull(pc); await push(pc);
S.ok(!!(await visit(pc, v2)), 'کامپیوترِ نسخهٔ قدیمی بازدیدِ گوشی را گرفت');
const srvHasReport = () => JSON.stringify(sb.row('k-up-a').data).includes(g1);
if (!srvHasReport()) S.note('نسخهٔ قدیمی «گزارش کلی پروژه» را نمی‌شناسد و هنگام ارسال، آن را از نسخهٔ روی سرور جا می‌اندازد (رفتار شناخته‌شدهٔ ' + oldVer + ').');
await ph.pull();
S.ok(!!(await visit(ph, g1)), 'با این حال گزارش کلی پروژه روی گوشی می‌ماند (نبودن روی سرور به معنی «حذف» نیست)');
await ph.push();
S.ok(srvHasReport(), 'و با ارسال بعدیِ گوشی دوباره روی سرور می‌نشیند');

S.sec('الف-۳) نصب نسخهٔ تازه روی همان مسیر');
const before = { projects: await projJson(pc), media: await media(pc), ls: await pc.evaluate(() => Object.keys(localStorage).sort()), cfg: await pc.evaluate(() => ({ key: GS.key, url: GS.url, auto: !!GS.auto })) };
install(pc.dir);
await reopen(pc, { url: pc.url, settle: 3200, keepDialogs: true });
S.eq(await dialogs(pc), [], 'پس از نصب، برنامه بدون هیچ پنجره یا پرسشی باز می‌شود');
S.ok(await pc.evaluate(() => APP_VERSION) === WANT && await pc.evaluate(() => document.getElementById('footVer').textContent) === WANT, 'نسخهٔ تازه باز شد: ' + WANT);
const afterProjects = await projJson(pc);
S.ok(afterProjects === before.projects, 'همهٔ پروژه‌ها، قطعه‌ها و بازدیدها دقیقاً همان است که پیش از نصب بود', { طول: [before.projects.length, afterProjects.length] });
S.eq(await media(pc), before.media, 'عکس و امضا سر جایشان هستند و خوانده می‌شوند');
S.eq(await pc.evaluate(() => ({ key: GS.key, url: GS.url, auto: !!GS.auto })), before.cfg, 'تنظیم همگام‌سازی (نشانی سرور و کلید) سر جایش است');
S.ok(await pc.evaluate(() => document.getElementById('storageWarn').classList.contains('u-hidden')) && await quiet(pc), 'هیچ هشدار ذخیره‌سازی یا همگام‌سازی نشان داده نمی‌شود');
const lsAfter = await pc.evaluate(() => Object.keys(localStorage).sort());
S.ok(before.ls.every(k => lsAfter.includes(k)), 'هیچ‌کدام از داده‌های ذخیره‌شدهٔ قبلی پاک نشده است', { پیش: before.ls, پس: lsAfter });
S.ok(/خودش به‌روز نمی‌شود/.test(await pc.evaluate(() => document.getElementById('updState').textContent)), 'برنامهٔ نصب‌شده می‌گوید که خودش به‌روز نمی‌شود');

S.sec('الف-۴) پس از نصب: کار با گوشی');
let seen = (await pull(pc)).concat(await push(pc));
S.eq(seen, [], 'اولین همگام‌سازی پس از نصب هیچ پرسشی نکرد');
S.ok(!!(await visit(pc, g1)), 'کامپیوتر حالا گزارش کلی پروژه را هم دارد');
S.ok(!!(await visit(pc, v1)) && !!(await visit(pc, v2)) && await quiet(pc), 'هر دو بازدید سر جایشان هستند و هشدار «اختلاف» نیامد');
await edit(pc, a, v1, 'بازدید ویرایش‌شده پس از نصب'); await push(pc); await ph.pull();
S.ok(/ویرایش‌شده پس از نصب/.test(await sumOf(ph, v1)), 'ویرایش کامپیوتر (پس از نصب) به گوشی رسید');
await edit(ph, b, v2, 'بازدید گوشی، ویرایش دوم'); await ph.push(); await pull(pc);
S.ok(/ویرایش دوم/.test(await sumOf(pc, v2)), 'ویرایش گوشی به کامپیوتر رسید');
S.ok(await quiet(pc) && await quiet(ph) && await bin0(pc) === 0 && await bin0(ph) === 0, 'هیچ‌کدام از دو دستگاه هشدار اختلاف نمی‌دهد و نسخه‌ای کنار گذاشته نشد');
S.eq(await media(pc), before.media, 'عکس و امضا پس از همگام‌سازی هم سر جایشان هستند');

S.sec('الف-۵) خروجی‌ها پس از نصب');
await clearDl(pc); await pc.evaluate(([a, v]) => { visitWord(a, v); }, [a, v1]); await sleep(1800);
let dl = await downloads(pc); const dlg = await dialogs(pc);
S.ok(dlg.length === 0 && dl.length === 1 && /\.docx$/i.test(dl[0].name), 'فایل Word بازدید بدون هشدارِ «عکس یا امضا نیست» ساخته شد', { dlg, names: dl.map(d => d.name) });
const files = dl.length ? Object.keys(unzip(bin(dl[0]))) : [];
S.ok(files.filter(f => /^word\/media\//.test(f)).length >= 2, 'عکس و امضا داخل فایل Word هستند', files);
await clearDl(pc); await act(pc, 'fullBackup:export'); await sleep(2500); const fbDlg = await closeDialogs(pc); dl = await downloads(pc);
const full = dl.length ? txt(dl[0]) : '';
S.ok(dl.length === 1 && full.includes(v1) && (full.match(/"kind":"(photos|sigs)"/g) || []).length === 2, 'پشتیبان کامل (با عکس و امضا) پس از نصب ساخته می‌شود و هر دو تصویر را دارد', { fbDlg, names: dl.map(d => d.name), n: (full.match(/"kind":"(photos|sigs)"/g) || []).length });

/* ═════ ب) کامپیوتری که ده روز است باز نشده (دادهٔ کهنه) و حالا نسخهٔ تازه رویش نصب می‌شود ═════ */
S.sec('ب) نسخهٔ نصب‌شده‌ای که ده روز باز نشده');
const pcB = await oldPc('b', 'k-up-b', -10 * DAY);
S.ok(Math.abs(await pcB.evaluate(() => Date.now()) - (Date.now() - 10 * DAY)) < 60000, 'ساعتِ این کامپیوترِ آزمایشی ده روز عقب است');
await act(pcB, 'data:demo'); await closeDialogs(pcB);
await act(pcB, 'plot:add'); await press(pcB, 'ok', 'قطعهٔ سوم'); await sleep(200);   // قطعهٔ سوم، برای آزمایشِ حذف از روی گوشی
const pb = await pcB.evaluate(() => state.projects.find(p => p.id === state.activeId).plots.map(p => p.id));
S.ok(pb.length >= 3, 'پروژهٔ نمونه سه قطعه دارد', pb);
// پروژهٔ دوم (با یک قطعه)، برای آزمایشِ «حذف کامل یک پروژه از روی گوشی»
const p1 = await pcB.evaluate(() => state.activeId);
await act(pcB, 'proj:add'); await press(pcB, 'ok', 'پروژهٔ دوم'); await sleep(200);
await act(pcB, 'plot:add'); await press(pcB, 'ok', 'قطعهٔ پروژهٔ دوم'); await sleep(200);
const [p2, p2pl] = await pcB.evaluate(() => { const p = state.projects.find(p => p.id === state.activeId); return [p.id, p.plots[0].id]; });
await pcB.evaluate(id => selectProject(id), p1); await sleep(200);
S.ok(p2 !== p1 && !!p2pl, 'پروژهٔ دوم با یک قطعه ساخته شد');
const w1 = await newVisit(pcB, pb[0], 'متن ده روز پیشِ کامپیوتر'); await pcB.evaluate(() => visitClose()); await sleep(200);
const w3 = await newVisit(pcB, pb[1], 'بازدیدی که فقط روی کامپیوتر عوض می‌شود'); await pcB.evaluate(() => visitClose()); await sleep(200);
await push(pcB);
const phB = await phone('k-up-b'); await phB.pull();
await edit(phB, pb[0], w1, 'متن امروزِ گوشی'); const w2 = await phB.addVisit(pb[1], 'بازدید تازهٔ گوشی');
await phB.delPlot(pb[2]); await phB.delProject(p2); await phB.push();
const srvB = () => JSON.stringify(sb.row('k-up-b').data.state.projects);
S.ok(!srvB().includes('"id":"' + pb[2] + '"'), 'گوشی یک قطعه را حذف کرد و به سرور فرستاد');
S.ok(!srvB().includes('"id":"' + p2 + '"') && !srvB().includes('"id":"' + p2pl + '"'), 'گوشی یک پروژهٔ کامل را هم حذف کرد و به سرور فرستاد');
// روی کامپیوتر (هنوز ده روز پیش، بدون اتصال): یک ویرایش که هرگز فرستاده نشد
await edit(pcB, pb[1], w3, 'ویرایش فرستاده‌نشدهٔ کامپیوتر');
const beforeB = await projJson(pcB);
install(pcB.dir); await pcB.evaluate(() => { window.name = 'off:0'; });
await reopen(pcB, { url: pcB.url, settle: 3200, keepDialogs: true });
S.ok(await pcB.evaluate(() => APP_VERSION) === WANT && (await dialogs(pcB)).length === 0 && await projJson(pcB) === beforeB, 'پس از نصب، دادهٔ کهنه دست‌نخورده و بدون پرسش باز می‌شود');
S.ok(Math.abs(await pcB.evaluate(() => Date.now()) - Date.now()) < 60000, 'و ساعتش حالا امروز است');
seen = (await pull(pcB)).concat(await push(pcB));
S.note('پنجره‌های اولین همگام‌سازی: ' + (seen.length ? seen.map(d => d.title).join('، ') : 'هیچ') + ' · هشدار اختلاف: ' + ((await quiet(pcB)) ? 'نه' : 'بله'));
S.ok(/متن امروزِ گوشی/.test(await sumOf(pcB, w1)), 'بازدیدی که گوشی بعداً ویرایش کرده بود، با متنِ تازهٔ گوشی آمد (متن ده روز پیش رویش ننشست)', await sumOf(pcB, w1));
S.ok(!!(await visit(pcB, w2)), 'بازدید تازهٔ گوشی آمد');
S.ok(/ویرایش فرستاده‌نشدهٔ کامپیوتر/.test(await sumOf(pcB, w3)), 'ویرایشی که فقط روی کامپیوتر مانده بود از دست نرفت');
S.ok(!(await projJson(pcB)).includes('"id":"' + pb[2] + '"'), 'قطعه‌ای که گوشی حذف کرده بود، با دادهٔ کهنهٔ کامپیوتر برنگشت');
S.ok(!(await projJson(pcB)).includes('"id":"' + p2 + '"') && !(await projJson(pcB)).includes('"id":"' + p2pl + '"'), 'پروژه‌ای که گوشی حذف کرده بود (و قطعه‌اش)، با دادهٔ کهنهٔ کامپیوتر برنگشت');
S.ok(!srvB().includes('"id":"' + p2 + '"') && !srvB().includes('"id":"' + pb[2] + '"'), 'روی سرور هم برنگشت');
await phB.pull();
S.ok(/متن امروزِ گوشی/.test(await sumOf(phB, w1)) && /ویرایش فرستاده‌نشدهٔ کامپیوتر/.test(await sumOf(phB, w3)) && !(await projJson(phB)).includes('"id":"' + pb[2] + '"') && !(await projJson(phB)).includes('"id":"' + p2 + '"'), 'گوشی هم همان نتیجه را دارد: متن خودش مانده، ویرایش کامپیوتر رسیده، قطعه و پروژهٔ حذف‌شده برنگشته');
S.eq(await phB.evaluate(() => state.projects.length), await pcB.evaluate(() => state.projects.length), 'شمار پروژه‌ها روی گوشی و کامپیوتر یکی است (پروژهٔ تکراری ساخته نشد)');
S.ok(await quiet(pcB) && await quiet(phB) && await bin0(pcB) === 0 && await bin0(phB) === 0, 'هیچ هشدار اختلافی نماند و نسخه‌ای کنار گذاشته نشد');

/* ═════ ج) همان بازدید هم روی کامپیوترِ کهنه عوض شده (و فرستاده نشده) و هم بعداً روی گوشی ═════ */
S.sec('ج) یک بازدید، دو ویرایشِ جدا: کامپیوترِ کهنه (فرستاده‌نشده) و گوشی (تازه)');
const pcC = await oldPc('c', 'k-up-c', -10 * DAY);
await act(pcC, 'data:demo'); await closeDialogs(pcC);
const pcc = await pcC.evaluate(() => state.projects[0].plots.map(p => p.id));
const x1 = await newVisit(pcC, pcc[0], 'متن اول'); await pcC.evaluate(() => visitClose()); await sleep(200); await push(pcC);
const phC = await phone('k-up-c'); await phC.pull();
await edit(pcC, pcc[0], x1, 'ویرایش کامپیوتر که فرستاده نشد');
await edit(phC, pcc[0], x1, 'ویرایش گوشی'); await phC.push();
install(pcC.dir); await pcC.evaluate(() => { window.name = 'off:0'; });
await reopen(pcC, { url: pcC.url, settle: 3200, keepDialogs: true });
S.ok(/ویرایش کامپیوتر که فرستاده نشد/.test(await sumOf(pcC, x1)) && (await dialogs(pcC)).length === 0, 'پس از نصب، ویرایش کامپیوتر هنوز سر جایش است');
await pcC.evaluate(() => { gsPull(false); }); await sleep(1200); await closeDialogs(pcC);
S.ok(/ویرایش کامپیوتر که فرستاده نشد/.test(await sumOf(pcC, x1)), 'پس از دریافت از سرور، ویرایشِ فرستاده‌نشدهٔ کامپیوتر بی‌صدا عوض نشد', (await sumOf(pcC, x1)).slice(0, 200));
S.ok(await pcC.evaluate(() => !document.getElementById('syncWarn').classList.contains('u-hidden')), 'و برنامه با نوار هشدار می‌گوید که دو نسخه از یک بازدید هست');
await pcC.evaluate(() => { gsPush(false); }); await sleep(1200); await closeDialogs(pcC);
const srvX1 = () => { let s = ''; (sb.row('k-up-c').data.state.projects || []).forEach(p => (p.plots || []).forEach(pl => (pl.visits || []).forEach(v => { if (v.id === x1) s = JSON.stringify(v); }))); return s; };
S.ok(/ویرایش گوشی/.test(srvX1()), 'ارسالِ کامپیوتر هم نسخهٔ گوشی را روی سرور پاک نکرد', srvX1().slice(0, 200));
await phC.pull();
S.ok(/ویرایش گوشی/.test(await sumOf(phC, x1)), 'گوشی هنوز متن خودش را دارد');

const errs = [pc, ph, pcB, phB, pcC, phC].flatMap(p => p.__errors).filter(e => !/URL scheme "file" is not supported/.test(e));   // این خطا فقط از نسخهٔ قدیمی است
S.eq(errs, [], 'خطایی در صفحه‌ها نیست');
S.done(); await browser.close(); st.close(); sb.close(); fs.rmSync(tmp, { recursive: true, force: true });
