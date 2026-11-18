// باز شدن برنامه، دادهٔ نمونه، و نبودِ خطا در صفحه
import { site, launch, open, suite, sleep, act, closeDialogs, snap, brief } from './h.mjs';
const st = await site(); const browser = await launch(); const S = suite('باز شدن برنامه');
const page = await open(browser, st);
const ver = await page.evaluate(() => ({ app: APP_VERSION, foot: document.getElementById('footVer').textContent, acts: Object.keys(ACTIONS).length }));
S.ok(/^\d+\.\d+\.\d+$/.test(ver.app) && ver.foot === ver.app, 'شمارهٔ نسخه پایین صفحه دیده می‌شود', ver);
await act(page, 'data:demo'); await closeDialogs(page);
const s = await snap(page); S.ok(s.projects.length === 1 && s.projects[0].plots.length === 2, 'دادهٔ نمونه ساخته شد: ' + brief(s), s);
S.ok(page.__errors.length === 0, 'خطایی در صفحه نیست', page.__errors);
console.log('   نسخه ' + ver.app + ' · ' + ver.acts + ' کار ثبت‌شده · درخواست بیرونیِ بسته‌شده: ' + new Set(page.__blocked).size);
S.done(); await browser.close(); st.close();
