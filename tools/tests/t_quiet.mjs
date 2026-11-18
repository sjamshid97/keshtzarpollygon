// همگام‌سازی خودکار نباید هنگام کار در دفترچه پیام یا پنجره‌ای نشان بدهد
import { site, launch, suite, sleep, act, type, closeDialogs, dialogs, snap } from './h.mjs';
import { fakeSupabase } from './sb.mjs';
import { device, UA_PC, UA_AND } from './dev.mjs';
const st = await site(); const browser = await launch(); const S = suite('همگام‌سازی خودکار بی‌سروصدا');
const sb = await fakeSupabase(); const A = await device(browser, st, sb, 'k-quiet', { ua: UA_PC, auto: true });
await act(A, 'data:demo'); await closeDialogs(A); const [a] = (await snap(A)).projects[0].plots.map(x => x.id);
await A.evaluate(() => { window.__toasts = []; const el = () => document.getElementById('vToast'); new MutationObserver(() => { const e = el(); if (e && e.classList.contains('on')) window.__toasts.push(e.textContent); }).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }); });
await A.$eval('[data-plot="' + a + '"] [data-act="visit:add"]', e => e.click()); await sleep(300);
for (let i = 0; i < 3; i++) { await type(A, '.vs-editor [data-input="visit:field"][data-k="f:summary"]', 'متن بازدید ' + i); await sleep(6200); }
const B = await device(browser, st, sb, 'k-quiet', { ua: UA_AND, auto: true });
await type(B, '[data-input="proj:field"][data-key="notes"]', 'یادداشت گوشی'); await sleep(6500);
await type(A, '.vs-editor [data-input="visit:field"][data-k="f:summary"]', 'متن بازدید پس از گوشی'); await sleep(6500);
const toasts = await A.evaluate(() => [...new Set(window.__toasts)]);
S.ok(sb.log.filter(x => /PATCH|POST/.test(x)).length >= 4, 'همگام‌سازی خودکار چند بار انجام شد: ' + sb.log.length + ' بار');
S.ok(await A.evaluate(() => state.projects[0].notes) === 'یادداشت گوشی', 'تغییر دستگاه دیگر رسیده است');
S.ok(toasts.length === 0, 'هنگام نوشتن بازدید هیچ پیام کوتاهی روی صفحه نیامد', toasts);
S.ok(!(await dialogs(A)).length && await A.evaluate(() => !!document.querySelector('.vs-editor')), 'هیچ پنجره‌ای باز نشد و برگهٔ بازدید باز ماند');
S.ok(await A.evaluate(() => document.getElementById('syncWarn').classList.contains('u-hidden')), 'نوار هشدار همگام‌سازی هم نیامد');
S.ok(!A.__errors.length && !B.__errors.length, 'خطایی در صفحه نیست', A.__errors.concat(B.__errors));
S.done(); await browser.close(); st.close(); sb.close();
