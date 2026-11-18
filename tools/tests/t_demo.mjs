// نسخهٔ نمایشی: دادهٔ ساختگی، حافظهٔ جدا، بدون سرور، بدون پیوند به برنامهٔ واقعی
import { site, launch, open, suite, sleep, act, type, press, closeDialogs, snap } from './h.mjs';
const st = await site(); const browser = await launch(); const S = suite('نسخهٔ نمایشی');
const ctx = await browser.createBrowserContext();
const main = await open(browser, st, { ctx });
await act(main, 'proj:add'); await press(main, 'ok', 'پروژهٔ واقعیِ آزمایش'); await sleep(200);
const demo = await open(browser, st, { ctx, path: 'demo.html' });
const info = await demo.evaluate(() => ({ title: document.title, ver: APP_VERSION, robots: (document.querySelector('meta[name="robots"]') || {}).content, bar: !!document.getElementById('demoBar'),
  links: [...document.querySelectorAll('#demoBar a')].map(a => a.getAttribute('href')), anyIndexLink: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => /index\.html|keshtzarpollygon\/?$/.test(h)),
  names: state.projects.map(p => p.name), key: STORE_KEY, syncHidden: (() => { const c = document.getElementById('syncCard'); return !c || getComputedStyle(c).display === 'none'; })() }));
S.ok(/^\[نمایشی\]/.test(info.title) && info.bar, 'عنوان و نوار «نسخهٔ نمایشی» دارد', info.title);
S.ok(info.ver === await main.evaluate(() => APP_VERSION), 'همان نسخهٔ برنامهٔ اصلی است: ' + info.ver);
S.ok(/noindex/.test(info.robots || ''), 'موتورهای جست‌وجو آن را فهرست نمی‌کنند (noindex)', info.robots);
S.ok(info.names.length >= 1 && info.names.every(n => !/واقعی/.test(n)) && /نمونه/.test(info.names[0]), 'فقط دادهٔ ساختگی دارد: ' + info.names.join('، '));
S.ok(info.key === 'seed_coord_notebook_demo_v1', 'در حافظهٔ جداگانه ذخیره می‌کند', info.key);
S.ok(info.links.length === 0 && info.anyIndexLink.length === 0, 'هیچ پیوندی به برنامهٔ واقعی ندارد', [info.links, info.anyIndexLink]);
S.ok(info.syncHidden, 'کارت همگام‌سازی با سرور پنهان است');
await act(demo, 'proj:add'); await press(demo, 'ok', 'پروژهٔ ساختهٔ بازدیدکننده'); await sleep(300);
const keys = await demo.evaluate(() => Object.keys(localStorage));
const mainNow = await main.evaluate(() => JSON.parse(localStorage.getItem('seed_coord_notebook_v1')).projects.map(p => p.name));
S.ok(JSON.stringify(mainNow) === JSON.stringify(['پروژهٔ واقعیِ آزمایش']), 'کار در نسخهٔ نمایشی، دادهٔ برنامهٔ اصلی را عوض نمی‌کند', mainNow);
S.ok(keys.includes('seed_coord_notebook_demo_v1'), 'کلیدهای حافظه: ' + keys.filter(k => /seed/.test(k)).join('، '));
const sent = demo.__blocked.filter(u => /supabase|rest\/v1/.test(u));
await demo.evaluate(() => { try { gsPush(true); gsPull(true); } catch (e) {} }); await sleep(500);
S.ok(sent.length === 0 && demo.__blocked.filter(u => /supabase|rest\/v1/.test(u)).length === 0, 'به هیچ سروری وصل نمی‌شود');
S.ok(!demo.__errors.length && !main.__errors.length, 'خطایی در صفحه نیست', demo.__errors.concat(main.__errors));
S.done(); await browser.close(); st.close();
