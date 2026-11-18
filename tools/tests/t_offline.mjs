// کار بدون اینترنت (Service Worker)، خطای موقت سرور، و به‌روز شدن از نسخهٔ قبلی
import { site, launch, open, reopen, suite, sleep, act, press, closeDialogs, snap, REPO } from './h.mjs';
import { oldSite, BASE_REV } from './dev.mjs';
const browser = await launch(); const S = suite('بدون اینترنت و به‌روزرسانی');
const swState = page => page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); return { ctrl: !!navigator.serviceWorker.controller, active: !!(reg && reg.active), caches: await caches.keys() }; });
const waitSw = async page => { for (let i = 0; i < 60; i++) { const s = await swState(page); if (s.active && s.caches.length) return s; await sleep(150); } return swState(page); };
const view = page => page.evaluate(() => ({ ver: typeof APP_VERSION !== 'undefined' ? APP_VERSION : null, title: document.title, body: document.body.innerText.slice(0, 40) }));
const tryOpen = async page => { try { await page.goto(page.__st.base + 'index.html', { waitUntil: 'load', timeout: 8000 }); await sleep(600); return await view(page); } catch (e) { return { ver: null, err: String(e.message).slice(0, 80) }; } };

{ S.sec('باز شدن بدون اینترنت');
  const st = await site(); const page = await open(browser, st);
  let sw = await waitSw(page); S.ok(sw.active && sw.caches.includes('seedcoord-v2.6.2'), 'برنامه خودش را برای کار بدون اینترنت ذخیره کرد', sw);
  await act(page, 'proj:add'); await press(page, 'ok', 'پروژهٔ آفلاین'); await reopen(page);
  st.down = true; let v = await tryOpen(page);
  S.ok(v.ver === '2.6.2', 'با اینترنتِ قطع، برنامه باز می‌شود', v);
  S.ok((await snap(page)).projects[0].name === 'پروژهٔ آفلاین', 'و داده‌ها سر جایشان هستند');
  st.down = false;
  S.sec('خطای موقتِ سرور');
  st.fail = p => (p === '/index.html' || p === '/') ? 500 : null; v = await tryOpen(page);
  S.ok(v.ver === '2.6.2', 'وقتی سرور صفحهٔ خطا می‌دهد، برنامه از حافظهٔ خودش باز می‌شود (نه صفحهٔ خطا)', v);
  st.fail = null; st.down = true; v = await tryOpen(page);
  S.ok(v.ver === '2.6.2', 'و بعد از آن، بدون اینترنت هم باز می‌شود (صفحهٔ خطا ذخیره نشده است)', v);
  st.down = false; st.fail = p => p === '/README.md' ? 404 : null;
  const bad = await page.evaluate(async () => { const r = await fetch('./README.md'); return r.status; });
  st.fail = null; const good = await page.evaluate(async () => { const r = await fetch('./README.md'); return r.status; });
  S.ok(bad === 404 && good === 200, 'پاسخِ خطای فایل‌های دیگر هم در حافظه نمی‌ماند', [bad, good]);
  S.sec('«بررسی به‌روزرسانی» حافظه را پر نمی‌کند');
  const entries = () => page.evaluate(async () => { let n = 0, kb = 0; for (const k of await caches.keys()) { const c = await caches.open(k); for (const r of await c.keys()) { n++; kb += (await (await c.match(r)).clone().blob()).size / 1024; } } return { n, kb: Math.round(kb) }; });
  await page.goto(st.base + 'index.html', { waitUntil: 'load' }); await sleep(800); const e0 = await entries();
  for (let i = 0; i < 6; i++) { await page.evaluate(() => appUpdateCheck(true)); await sleep(350); }
  const e1 = await entries(); const upd = await page.$eval('#updState', e => e.textContent);
  S.ok(/به‌روز است/.test(upd), 'بررسی به‌روزرسانی کار می‌کند: «' + upd.trim() + '»');
  S.ok(e1.n === e0.n && e1.kb === e0.kb, 'شش بار بررسی، چیزی به حافظه اضافه نکرد (پیش‌تر هر بار یک رونوشت کامل برنامه می‌ماند): ' + e1.n + ' فایل، ' + e1.kb + ' کیلوبایت', [e0, e1]);
  S.ok(!page.__errors.length, 'خطایی در صفحه نیست', page.__errors); st.close(); }

{ S.sec('به‌روز شدن گوشی از نسخهٔ قبلی (۲٫۶٫۱) به نسخهٔ تازه');
  const st = await oldSite(); const oldRoot = st.root; const page = await open(browser, st);
  let v = await view(page); let sw = await waitSw(page);
  S.ok(v.ver === '2.6.1' && sw.caches.includes('seedcoord-v2.6.1'), 'نسخهٔ قبلی نصب است', [v.ver, sw.caches]);
  await act(page, 'data:demo'); await closeDialogs(page); const pid = await page.evaluate(() => state.projects[0].plots[0].id);
  await page.$eval('[data-plot="' + pid + '"] [data-act="visit:add"]', e => e.click()); await sleep(300); await page.evaluate(() => visitClose());
  const before = await page.evaluate(() => localStorage.getItem(STORE_KEY)); await reopen(page);
  for (let i = 0; i < 3; i++) { await page.evaluate(() => appUpdateCheck(true)); await sleep(350); }
  st.root = REPO;                                       // سایت به‌روز شد
  // برنامه وقتی نسخهٔ تازه را بگیرد یک بار خودش صفحه را تازه می‌کند؛ تا آرام شدن صبر می‌کنیم
  try { await page.goto(st.base + 'index.html', { waitUntil: 'load' }); } catch (e) {}
  for (let i = 0; i < 40; i++) { await sleep(300); try { v = await view(page); if (v.ver === '2.6.2') { await sleep(900); v = await view(page); if (v.ver === '2.6.2') break; } } catch (e) {} }
  S.ok(v.ver === '2.6.2', 'با یک بار باز کردن، نسخهٔ تازه می‌آید', v);
  for (let i = 0; i < 40; i++) { sw = await swState(page); if (sw.caches.length === 1 && sw.caches[0] === 'seedcoord-v2.6.2') break; await sleep(250); }
  S.ok(sw.caches.length === 1 && sw.caches[0] === 'seedcoord-v2.6.2', 'حافظهٔ نسخهٔ قبلی کنار رفت و نسخهٔ تازه ذخیره شد', sw.caches);
  S.ok(await page.evaluate(() => localStorage.getItem(STORE_KEY)) === before || (await snap(page)).projects[0].plots[0].visits.length === 1, 'داده‌های کاربر (پروژه، قطعه، بازدید) دست نخورده است');
  const leak = await page.evaluate(async () => { const out = []; for (const k of await caches.keys()) { const c = await caches.open(k); for (const r of await c.keys()) if (new URL(r.url).search) out.push(r.url); } return out; });
  S.ok(leak.length === 0, 'رونوشت‌های اضافه‌ای که نسخهٔ قبلی در حافظه گذاشته بود پاک شده‌اند', leak);
  await reopen(page); st.down = true; v = await tryOpen(page);
  S.ok(v.ver === '2.6.2' && (await snap(page)).projects.length === 1, 'نسخهٔ تازه بدون اینترنت هم باز می‌شود', v);
  st.down = false; S.ok(!page.__errors.length, 'خطایی در صفحه نیست', page.__errors); st.close(); void oldRoot; void BASE_REV; }
S.done(); await browser.close();
