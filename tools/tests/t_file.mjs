// برنامه وقتی از روی «فایلِ روی کامپیوتر» باز می‌شود (همان چیزی که فایل نصب ویندوز می‌گذارد): file://
import { launch, suite, sleep, closeDialogs, REPO, press, waitDialog, setFile } from './h.mjs';
import { fakeSupabase } from './sb.mjs';
import fs from 'fs'; import os from 'os'; import path from 'path';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seedcoord-file-'));
for (const f of ['index.html', 'icon-192.png', 'icon-512.png', 'manifest.webmanifest']) fs.copyFileSync(path.join(REPO, f), path.join(dir, f));
const sb = await fakeSupabase(); const browser = await launch(); const S = suite('اجرا از روی فایلِ روی کامپیوتر (نصب ویندوز)');
sb.rows.set('k-file', { key: 'k-file', updated_at: new Date().toISOString(), data: { app: 'seedcoord-sync', v: 2, device: 'اندروید', exportedAt: Date.now(), state: { projects: [{ id: 'p-srv1', name: 'پروژهٔ سرور', updatedAt: Date.now(),
  plots: [{ id: 'pl-srv1', name: 'قطعهٔ سرور', mode: 'geo', points: [[35.7, 51.4], [35.701, 51.4], [35.701, 51.401], [35.7, 51.401]], holes: [], visits: [], updatedAt: Date.now() }] }], activeId: 'p-srv1', grave: { projects: [], plots: [] } } } });
const ctx = await browser.createBrowserContext(); const page = await ctx.newPage(); const errors = [];
page.on('pageerror', e => errors.push(String(e && e.message || e)));
const consoleErrors = []; page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) consoleErrors.push(m.text().slice(0, 200)); });
await page.evaluateOnNewDocument(() => { window.__dl = []; const oc = URL.createObjectURL.bind(URL); const blobs = new Map(); URL.createObjectURL = b => { const u = oc(b); blobs.set(u, b); return u; };
  const click = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.hasAttribute('download') && blobs.has(this.href)) { const b = blobs.get(this.href); const e = { name: this.download, b64: null }; window.__dl.push(e); const fr = new FileReader(); fr.onload = () => { e.b64 = String(fr.result).split(',')[1] || ''; }; fr.readAsDataURL(b); return; } return click.call(this); }; });
await page.setRequestInterception(true);
page.on('request', q => { const u = q.url(); if (u.startsWith('file:') || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith(sb.url)) return q.continue(); q.abort(); });
const url = 'file://' + dir + '/index.html';
await page.goto(url + '?srv=' + encodeURIComponent(sb.url) + '&tok=anon&skey=k-file&auto=1', { waitUntil: 'load' }); await page.waitForFunction(() => typeof state !== 'undefined'); await sleep(4300); await closeDialogs(page);
let info = await page.evaluate(() => ({ ver: document.getElementById('footVer').textContent, proto: location.protocol, names: state.projects.map(p => p.name), warn: !document.getElementById('storageWarn').classList.contains('u-hidden') }));
S.ok(info.proto === 'file:' && /^\d+\.\d+\.\d+$/.test(info.ver), 'برنامه از روی فایل باز می‌شود و نسخه را نشان می‌دهد: ' + info.ver, info);
S.ok(info.names.includes('پروژهٔ سرور'), 'دریافت خودکار از سرور کار می‌کند', info.names);
S.ok(!info.warn, 'هشدار «ذخیره نمی‌شود» نشان داده نمی‌شود');
await page.evaluate(() => document.querySelector('[data-plot="pl-srv1"] [data-act="visit:add"]').click()); await sleep(500);
const photoOk = await page.evaluate(async () => { const cv = document.createElement('canvas'); cv.width = 400; cv.height = 300; cv.getContext('2d').fillRect(0, 0, 400, 300); const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', .8));
  const v = vFind('pl-srv1', V_OPEN); const id = uid(); await vIdbPut('photos', vPhotoKey('pl-srv1', V_OPEN, id), blob); v.photos = v.photos || []; v.photos.push({ id, cap: 'آزمایش' }); save(); const back = await vIdbGet('photos', vPhotoKey('pl-srv1', V_OPEN, id)); return !!back && back.size === blob.size; }).catch(e => String(e));
S.ok(photoOk === true, 'حافظهٔ عکس‌ها کار می‌کند', photoOk);
await page.evaluate(() => visitClose()); await sleep(6500);
S.ok(((sb.row('k-file').data.state.projects[0].plots[0].visits) || []).length === 1, 'ارسال خودکار به سرور کار می‌کند', sb.log);
// بازیابی پشتیبان روی فایل محلی
await page.evaluate(() => document.querySelector('[data-act="backup:export"]').click()); await sleep(600);
const bk = await page.evaluate(() => atob(window.__dl[window.__dl.length - 1].b64)); const before = await page.evaluate(() => JSON.stringify(state.projects));
await setFile(page, '#importFile', 'backup.json', Buffer.from(bk, 'binary').toString('utf8')); const d = await waitDialog(page);
S.ok(d && d.title === 'بازیابی پشتیبان' && d.alt === 'جایگزینی کن', 'پنجرهٔ تازهٔ بازیابی روی فایل محلی هم کار می‌کند', d); await press(page, 'cancel'); await sleep(200);
S.ok(await page.evaluate(() => JSON.stringify(state.projects)) === before, '«انصراف» چیزی را عوض نمی‌کند');
await page.goto(url, { waitUntil: 'load' }); await page.waitForFunction(() => typeof state !== 'undefined'); await sleep(1500); await closeDialogs(page);
info = await page.evaluate(() => ({ p: state.projects.map(p => p.name + ':' + p.plots.map(pl => (pl.visits || []).length).join(',')), key: GS.key, auto: GS.auto }));
S.ok(info.p[0] === 'پروژهٔ سرور:1' && info.key === 'k-file' && info.auto === true, 'پس از بستن و باز کردن، داده و تنظیم سرور سر جایش است', info);
await sleep(1800);                                      // بررسی خودکار ۲٫۵ ثانیه پس از باز شدن برنامه انجام می‌شود
const upd0 = await page.evaluate(() => (document.getElementById('updState') || {}).textContent);
S.ok(/خودش به‌روز نمی‌شود/.test(upd0 || '') && !/آفلاین/.test(upd0 || ''), 'نسخهٔ نصب‌شده از همان اول روشن می‌گوید که خودش به‌روز نمی‌شود (نه «آفلاین؟»)', upd0);
await page.evaluate(() => document.querySelector('[data-act="app:check"]').click()); await sleep(400);
const toast = await page.evaluate(() => { const e = document.getElementById('vToast'); return e && e.classList.contains('on') ? e.textContent : ''; });
S.ok(/فایل نصب تازه لازم است/.test(toast), 'دکمهٔ «بررسی به‌روزرسانی» همین را با پیام کوتاه می‌گوید', toast);
const urlBefore = await page.evaluate(() => { window.__mark = 1; return location.href; });
await page.evaluate(() => document.querySelector('[data-act="app:force"]').click()); await sleep(900);
S.ok(await page.evaluate(() => window.__mark === 1) && await page.evaluate(() => location.href) === urlBefore, 'دکمهٔ «به‌روزرسانی کامل» روی نسخهٔ نصب‌شده صفحه را بی‌دلیل از نو باز نمی‌کند');
S.ok(consoleErrors.length === 0, 'هیچ خطایی در کنسول مرورگر نیست (پیش‌تر هر بار یک خطای «file» ثبت می‌شد)', consoleErrors);
S.ok(errors.length === 0, 'خطایی در صفحه نیست', errors);
S.done(); await browser.close(); sb.close(); fs.rmSync(dir, { recursive: true, force: true });
