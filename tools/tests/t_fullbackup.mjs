// «پشتیبان کامل» (با عکس و امضا): برای همهٔ پروژه‌ها، برای یک پروژه، و وقتی عکس‌ها زیاد شده‌اند
import { site, launch, open, suite, sleep, act, type, press, waitDialog, dialogs, closeDialogs, setFile, downloads, clearDl, txt, snap } from './h.mjs';
const st = await site(); const browser = await launch(); const S = suite('پشتیبان کامل');
const A = await open(browser, st);
const addPhotos = (page, plotId, vid, n, kb) => page.evaluate(async ([pid, vid, n, kb]) => { const v = vFind(pid, vid); v.photos = v.photos || [];
  for (let i = 0; i < n; i++) { const id = uid(); const u = new Uint8Array(kb * 1024); for (let k = 0; k < u.length; k += 97) u[k] = (k * 31 + i + n) & 255;
    await vIdbPut('photos', vPhotoKey(pid, vid, id), new Blob([u], { type: 'image/jpeg' })); v.photos.push({ id, cap: 'عکس ' + (i + 1) }); }
  v.touch = Date.now(); save(); return v.photos.length; }, [plotId, vid, n, kb]);
const newVisit = async (page, plotId, text) => { await page.$eval('[data-plot="' + plotId + '"] [data-act="visit:add"]', e => e.click()); await sleep(300);
  await type(page, '.vs-editor [data-input="visit:field"][data-k="f:summary"]', text); const vid = await page.evaluate(() => V_OPEN); await page.evaluate(() => visitClose()); await sleep(100); return vid; };
const exportFull = async (page, which) => { await clearDl(page); await act(page, which); let d = null, n = 0;
  for (let i = 0; i < 300; i++) { await sleep(150); d = (await dialogs(page))[0] || null; n = await page.evaluate(() => window.__dl.length); if (d || n) break; }
  await sleep(400); d = (await dialogs(page))[0] || d; await closeDialogs(page);
  const meta = await page.evaluate(() => window.__dl.map(x => ({ name: x.name, size: x.size }))[0] || null);
  if (!meta) return { file: null, msg: d ? d.msg : null };
  if (meta.size < 8e6) { for (let i = 0; i < 100; i++) { if (await page.evaluate(() => window.__dl[0].b64 !== null)) break; await sleep(100); } meta.b64 = await page.evaluate(() => window.__dl[0].b64); }
  return { file: meta, msg: d ? d.msg : null }; };
const photoBlobs = page => page.evaluate(async () => { let n = 0, miss = 0; for (const p of state.projects) for (const h of [p, ...p.plots]) for (const v of (h.visits || [])) for (const ph of (v.photos || [])) { const b = await vIdbGet('photos', vPhotoKey(h.id, v.id, ph.id)); if (b instanceof Blob && b.size > 0) n++; else miss++; } return { n, miss }; });

await act(A, 'data:demo'); await closeDialogs(A);
const P1 = await A.evaluate(() => state.projects[0].id); const [a, b] = await A.evaluate(() => state.projects[0].plots.map(x => x.id));
const v1 = await newVisit(A, a, 'بازدید پروژهٔ اول'); await addPhotos(A, a, v1, 3, 40);
await A.evaluate(async ([a, v1]) => { const cv = document.createElement('canvas'); cv.width = 200; cv.height = 80; cv.getContext('2d').fillRect(10, 10, 100, 20); const blob = await new Promise(r => cv.toBlob(r, 'image/png')); await vIdbPut('sigs', v1, blob); const v = vFind(a, v1); v.sig = { name: 'کشاورز', at: vToday(), refused: false }; save(); }, [a, v1]);
await act(A, 'proj:add'); await press(A, 'ok', 'پروژهٔ دوم'); await act(A, 'plot:add'); await press(A, 'ok', 'قطعهٔ پروژهٔ دوم');
const P2 = await A.evaluate(() => state.activeId); const c = await A.evaluate(() => activeProject().plots[0].id);
await type(A, '[data-plot="' + c + '"] textarea[data-ring="outer"]', '35.1515, 51.5288\n35.1503, 51.5278\n35.1493, 51.5289\n35.1503, 51.5305'); await sleep(400);
const v2 = await newVisit(A, c, 'بازدید پروژهٔ دوم'); await addPhotos(A, c, v2, 2, 40);

S.sec('پشتیبان کامل همهٔ پروژه‌ها (مثل قبل)');
let r = await exportFull(A, 'fullBackup:export'); let all = r.file && JSON.parse(txt(r.file));
S.ok(all && all.format === 'seedcoord-full-backup-1' && all.state.projects.length === 2 && all.media.length === 6 && /^پشتیبان-کامل-مختصات_/.test(r.file.name), 'دو پروژه، ۵ عکس و ۱ امضا در یک فایل', r.file && r.file.name);
S.ok(r.msg === null, 'وقتی عکس‌ها کم است پیام اضافه‌ای نمی‌آید', r.msg);

S.sec('پشتیبان کامل این پروژه');
S.ok(await A.$('[data-act="fullBackup:exportProject"]') !== null, 'دکمهٔ «پشتیبان کامل این پروژه» کنار «پشتیبان JSON این پروژه» هست');
r = await exportFull(A, 'fullBackup:exportProject'); const one2 = r.file && JSON.parse(txt(r.file));
S.ok(one2 && one2.state.projects.length === 1 && one2.state.projects[0].id === P2 && one2.media.length === 2, 'فقط پروژهٔ باز و عکس‌های خودش در فایل است', r.file && [r.file.name, one2.media.length]);
S.ok(r.file && /^پشتیبان-کامل-پروژهٔ_دوم_/.test(r.file.name), 'نام فایل، نام پروژه را دارد', r.file && r.file.name);
await act(A, 'proj:select', '[data-id="' + P1 + '"]'); r = await exportFull(A, 'fullBackup:exportProject'); const one1 = JSON.parse(txt(r.file));
S.ok(one1.state.projects[0].id === P1 && one1.media.length === 4, 'پروژهٔ اول: ۳ عکس و ۱ امضا');
const before = await A.evaluate(() => JSON.stringify(state));
S.ok(JSON.stringify(JSON.parse(before).projects.map(p => p.id)) === JSON.stringify([P1, P2]), 'ساختن پشتیبان چیزی را در برنامه عوض نمی‌کند');

S.sec('برگرداندن فایلِ یک پروژه روی دستگاه دیگر');
const B = await open(browser, st);
await setFile(B, '#fullBackupFile', 'p2.json', JSON.stringify(one2)); let d = await waitDialog(B, 6000);
S.ok(d && /پروژهٔ تازه: ۱/.test(d.msg), 'با همان دکمهٔ «ادغام پشتیبان کامل» خوانده می‌شود', d && d.msg); await press(B, 'ok'); await sleep(600); await closeDialogs(B);
let sB = await snap(B); S.ok(sB.projects.length === 1 && sB.projects[0].id === P2, 'پروژهٔ دوم اضافه شد');
await setFile(B, '#fullBackupFile', 'p1.json', JSON.stringify(one1)); await waitDialog(B, 6000); await press(B, 'ok'); await sleep(600); await closeDialogs(B);
sB = await snap(B); let pb = await photoBlobs(B);
S.ok(sB.projects.length === 2 && pb.n === 5 && pb.miss === 0, 'پروژهٔ اول هم اضافه شد و هر ۵ عکس روی دستگاه دوم هست', [sB.projects.map(p => p.name), pb]);
S.ok(await B.evaluate(async v1 => (await vIdbGet('sigs', v1)) instanceof Blob, v1), 'تصویر امضا هم آمده است');
await setFile(B, '#fullBackupFile', 'p2-again.json', JSON.stringify(one2)); d = await waitDialog(B, 6000); await closeDialogs(B); await sleep(300);
sB = await snap(B); S.ok(sB.projects.length === 2 && (!d || /پروژهٔ تازه: ۰/.test(d.msg) || /تازه/.test(d.msg)), 'دوباره دادنِ همان فایل، چیزی را دوتا نمی‌کند', d && d.msg);

S.sec('وقتی عکس‌ها زیاد می‌شوند');
await addPhotos(A, a, v1, 210, 170);            // حدود ۳۵ مگابایت = ۶۲٪ ظرفیت
r = await exportFull(A, 'fullBackup:export');
S.ok(r.file && r.msg && /٪ ظرفیتِ پشتیبانِ یک‌فایلی/.test(r.msg) && /پشتیبان کامل این پروژه/.test(r.msg), 'از ۶۰٪ به بعد، فایل ساخته می‌شود و هشدار زودهنگام می‌دهد', r.msg && r.msg.slice(0, 120));
await addPhotos(A, a, v1, 140, 170);            // حدود ۵۸ مگابایت = بیش از سقف
r = await exportFull(A, 'fullBackup:export');
S.ok(!r.file && /بیش از حد مجاز/.test(r.msg || '') && /پشتیبان کامل این پروژه/.test(r.msg || ''), 'بالاتر از سقف: ساخته نمی‌شود و راه چاره را می‌گوید', r.msg);
await act(A, 'proj:select', '[data-id="' + P2 + '"]'); r = await exportFull(A, 'fullBackup:exportProject');
S.ok(r.file && JSON.parse(txt(r.file)).media.length === 2, 'پروژهٔ دیگر هنوز جداگانه پشتیبان می‌شود', r.msg);
S.ok(!A.__errors.length && !B.__errors.length, 'خطایی در صفحه نیست', A.__errors.concat(B.__errors));
S.done(); await browser.close(); st.close();
