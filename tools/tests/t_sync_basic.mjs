// همگام‌سازی گوشی و کامپیوتر از راه سرور: رفت‌وبرگشت بازدیدها، و اختلاف واقعی که نباید بی‌صدا چیزی را پاک کند
import { site, launch, suite, sleep, act, type, press, waitDialog, dialogs, closeDialogs, snap } from './h.mjs';
import { fakeSupabase } from './sb.mjs';
import { device, UA_PC, UA_AND } from './dev.mjs';
const st = await site(); const browser = await launch(); const S = suite('همگام‌سازی از راه سرور');
const sb = await fakeSupabase(); const A = await device(browser, st, sb, 'k-basic', { ua: UA_PC, name: 'کامپیوتر' }); const B = await device(browser, st, sb, 'k-basic', { ua: UA_AND, name: 'گوشی' });
const summary = (pg, vid) => pg.evaluate(vid => { let out = null; vsEach(state, v => { if (v.id === vid) out = (v.f || {}).summary || ''; }); return out; }, vid);
const edit = async (pg, holder, vid, text) => { await pg.evaluate(([h, v]) => visitOpen(h, v), [holder, vid]); await sleep(250); await type(pg, '.vs-editor [data-input="visit:field"][data-k="f:summary"]', text); await pg.evaluate(() => visitClose()); await sleep(80); };
const banner = pg => pg.evaluate(() => { const el = document.getElementById('syncWarn'); return { on: !el.classList.contains('u-hidden'), text: el.textContent.trim().slice(0, 80) }; });

await act(A, 'data:demo'); await closeDialogs(A); const sA = await snap(A); const P = sA.projects[0].id, [a, b] = sA.projects[0].plots.map(x => x.id);
const nameA = await A.evaluate(() => syncDeviceName()); S.ok(nameA !== 'اندروید' && (await B.evaluate(() => syncDeviceName())) === 'اندروید', 'دو دستگاه با دو نام: ' + nameA + ' و اندروید');
const v1 = await A.addVisit(a, 'بازدید کامپیوتر'); await A.push(); await B.pull();
S.ok(await summary(B, v1) === 'بازدید کامپیوتر', 'بازدید کامپیوتر به گوشی می‌رسد');
const v2 = await B.addVisit(b, 'بازدید گوشی'); await B.push(); await A.pull();
S.ok(await summary(A, v2) === 'بازدید گوشی', 'بازدید گوشی به کامپیوتر می‌رسد');
// گزارش کلی پروژه
await B.$eval('#genCard [data-act="visit:add"]', e => e.click()); await sleep(300); const g1 = await B.evaluate(() => V_OPEN);
await type(B, '#genCard .vs-editor [data-input="visit:field"][data-k="f:summary"]', 'گزارش کلی از گوشی'); await B.evaluate(() => visitClose()); await B.push(); await A.pull();
S.ok(await summary(A, g1) === 'گزارش کلی از گوشی', 'گزارش کلی پروژه به کامپیوتر می‌رسد');
// ویرایش‌های پشت‌سرهم (بدون اختلاف)
await edit(A, a, v1, 'ویرایش ۱ در کامپیوتر'); await A.push(); await B.pull(); await edit(B, a, v1, 'ویرایش ۲ در گوشی'); await B.push(); await A.pull();
S.ok(await summary(A, v1) === 'ویرایش ۲ در گوشی' && !(await banner(A)).on && !(await banner(B)).on, 'ویرایش‌های نوبتی بدون هیچ هشداری رد و بدل می‌شوند');
// تایپ طولانی روی گوشی بدون ارسال (همان چیزی که در ۲٫۶٫۰ خطای اشتباهی می‌داد)
await B.evaluate(([b, v2]) => { for (let i = 0; i < 180; i++) vSet(b, v2, 'f:summary', 'تایپ طولانی ' + i); }, [b, v2]); await B.push(); await A.pull();
S.ok(await summary(A, v2) === 'تایپ طولانی 179' && !(await banner(A)).on && !(await banner(B)).on, '۱۸۰ تغییر پشت‌سرهم روی گوشی: بدون خطای اختلاف به کامپیوتر می‌رسد');
// اختلاف واقعی: هر دو همان بازدید را جداگانه عوض می‌کنند
await edit(A, a, v1, 'نسخهٔ کامپیوتر'); await edit(B, a, v1, 'نسخهٔ گوشی'); await A.push();
await B.push(); let bb = await banner(B);
S.ok(bb.on && (await summary(B, v1)) === 'نسخهٔ گوشی' && sb.row('k-basic').data.device === nameA, 'اختلاف واقعی: گوشی چیزی را بی‌صدا عوض نمی‌کند و هشدار می‌دهد', bb);
S.ok(!(await dialogs(B)).length, 'و وسط کار پنجره‌ای باز نمی‌کند');
await B.evaluate(() => { gsPush(true); }); const d = await waitDialog(B, 5000);
S.ok(d && /دو نسخه/.test(d.title + d.msg) && d.ok === 'نسخهٔ این دستگاه' && d.alt === 'نسخهٔ سرور', 'با «انتخاب نسخه» می‌پرسد کدام بماند', d);
await press(B, 'ok'); const d2 = await waitDialog(B, 4000); S.ok(d2 && d2.title === 'نسخهٔ این دستگاه بماند', 'پیش از جایگزینیِ نسخهٔ سرور یک بار دیگر می‌پرسد', d2); await press(B, 'ok'); await sleep(1200); await closeDialogs(B); await B.push(); await A.pull();
S.ok(await summary(A, v1) === 'نسخهٔ گوشی' && await summary(B, v1) === 'نسخهٔ گوشی' && !(await banner(B)).on, 'نسخهٔ انتخاب‌شده روی هر دو دستگاه می‌نشیند و هشدار می‌رود', [await summary(A, v1), await banner(B)]);
// حذف بازدید
await B.evaluate(([b, v2]) => visitOpen(b, v2), [b, v2]); await sleep(250); await act(B, 'visit:del', '[data-vid="' + v2 + '"]'); await press(B, 'ok'); await sleep(300); await B.push(); await A.pull();
S.ok(await summary(A, v2) === null, 'حذف بازدید روی گوشی به کامپیوتر می‌رسد');
await A.pull(); await B.pull(); await A.push(); await B.pull();
const fa = await snap(A), fb = await snap(B);
S.ok(JSON.stringify(fa.projects) === JSON.stringify(fb.projects), 'در پایان هر دو دستگاه دقیقاً یک چیز دارند', [fa.projects, fb.projects]);
S.ok(!A.__errors.length && !B.__errors.length, 'خطایی در صفحه نیست', A.__errors.concat(B.__errors));
S.done(); await browser.close(); st.close(); sb.close();
