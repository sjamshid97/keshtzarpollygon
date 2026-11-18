// بازیابی از پشتیبان JSON: «انصراف» باید واقعاً لغو کند، هیچ پروژه‌ای دوتا نشود،
// و چیزی که حذف شده و از پشتیبان برمی‌گردد، سر جایش بماند.
import { site, launch, open, suite, sleep, act, type, press, waitDialog, dialogs, closeDialogs, setFile, downloads, clearDl, txt, snap, brief } from './h.mjs';
const st = await site(); const browser = await launch(); const S = suite('بازیابی از پشتیبان JSON');
const page = await open(browser, st);
const full = () => page.evaluate(() => JSON.stringify(state));
const ids = () => page.evaluate(() => ({ p: state.projects.map(p => p.id), l: state.projects.map(p => p.plots.map(x => x.id)) }));
const twins = () => page.evaluate(() => { const seen = {}, dup = []; state.projects.forEach(p => p.plots.forEach(pl => { if (seen[pl.id]) dup.push(pl.id); seen[pl.id] = 1; })); return dup; });
const addVisit = async (plotId, text) => { await page.$eval('[data-plot="' + plotId + '"] [data-act="visit:add"]', e => e.click()); await sleep(350);
  await type(page, '.vs-editor [data-input="visit:field"][data-k="f:summary"]', text); const vid = await page.evaluate(() => V_OPEN); await page.evaluate(() => visitClose()); await sleep(150); return vid; };
const backup = async () => { await clearDl(page); await act(page, 'backup:export'); const d = await downloads(page); return txt(d[d.length - 1]); };
const projJson = async () => { await clearDl(page); await act(page, 'exp:projJson'); const d = await downloads(page); return txt(d[d.length - 1]); };
const give = (text, name = 'پشتیبان.json') => setFile(page, '#importFile', name, text);

await act(page, 'data:demo'); await closeDialogs(page);
const [a, b] = (await ids()).l[0]; const P = (await ids()).p[0];
const v1 = await addVisit(a, 'بازدید اول قطعهٔ شمالی'); const v2 = await addVisit(b, 'بازدید قطعهٔ جنوبی');
const bk = await backup();
const before = await full();

S.sec('پنجرهٔ «بازیابی پشتیبان»');
await give(bk); let d = await waitDialog(page);
S.ok(d && d.title === 'بازیابی پشتیبان' && d.ok === 'افزودن' && d.alt === 'جایگزینی کن' && d.cancel === 'انصراف', 'سه دکمه دارد: افزودن، جایگزینی کن، انصراف', d);
S.ok(d && /۱ پروژه و ۲ قطعه/.test(d.msg), 'می‌گوید در فایل چند پروژه و قطعه هست', d && d.msg);
await press(page, 'cancel'); await sleep(200);
S.ok(await full() === before, '«انصراف» هیچ چیزی را عوض نمی‌کند');
await give(bk); await press(page, 'esc'); await sleep(200);
S.ok(await full() === before && !(await dialogs(page)).length, 'کلید Esc هم هیچ چیزی را عوض نمی‌کند');
await give(bk); await waitDialog(page); await page.mouse.click(5, 5); await sleep(250);
S.ok(await full() === before && !(await dialogs(page)).length, 'کلیک بیرون از پنجره هم هیچ چیزی را عوض نمی‌کند');

S.sec('«افزودن» وقتی همه‌چیز از قبل هست');
await give(bk); await press(page, 'ok'); d = await waitDialog(page);
S.ok(d && /چیزی اضافه نشد/.test(d.msg), 'می‌گوید چیزی اضافه نشد', d && d.msg); await closeDialogs(page);
let s = await snap(page);
S.ok(s.projects.length === 1 && !(await twins()).length, 'پروژه دوتا نشد: ' + brief(s));
S.ok(JSON.stringify(JSON.parse(await full()).projects) === JSON.stringify(JSON.parse(before).projects), 'پروژه‌ها دقیقاً همان قبلی‌اند');

S.sec('قطعهٔ حذف‌شده از پشتیبان برمی‌گردد');
await act(page, 'plot:delete', '[data-id="' + a + '"]'); d = await press(page, 'ok');
S.ok(/۱ بازدید/.test(d.msg), 'پیام حذف قطعه می‌گوید یک بازدید هم پاک می‌شود', d.msg);
s = await snap(page); S.ok(s.projects[0].plots.length === 1 && s.grave.plots.includes(a), 'قطعه حذف شد و نشان حذف گرفت');
const tDel = await page.evaluate(a => state.grave.plots.find(g => g.id === a).t, a);
await sleep(30); await give(bk); await press(page, 'ok'); d = await waitDialog(page);
S.ok(d && /قطعهٔ تازه: ۱/.test(d.msg) && /بازدید تازه: ۱/.test(d.msg), 'پیام: یک قطعه و یک بازدید برگشت', d && d.msg); await closeDialogs(page);
s = await snap(page);
S.ok(s.projects.length === 1 && s.projects[0].plots.length === 2 && s.projects[0].plots.find(x => x.id === a).visits[0] === v1, 'قطعه با بازدیدش برگشت: ' + brief(s));
S.ok(!s.grave.plots.includes(a), 'نشان حذفِ آن قطعه برداشته شد', s.grave);
/* همگام‌سازی با نسخه‌ای که هنوز نشان حذف را دارد نباید دوباره پاکش کند */
const stale = JSON.parse(before); stale.grave = { projects: [], plots: [{ id: a, t: tDel }] }; stale.projects[0].plots = stale.projects[0].plots.filter(x => x.id !== a);
await page.evaluate(x => syncApply({ app: 'seedcoord-sync', v: 2, device: 'دستگاه دیگر', state: x }, 'آزمایش'), stale); await closeDialogs(page);
s = await snap(page); S.ok(s.projects[0].plots.some(x => x.id === a), 'نشان حذفِ کهنهٔ دستگاه دیگر، قطعهٔ بازیابی‌شده را پاک نمی‌کند: ' + brief(s));

S.sec('پروژهٔ حذف‌شده از پشتیبان برمی‌گردد');
await act(page, 'proj:delete'); d = await press(page, 'ok');
S.ok(/۲ بازدید/.test(d.msg), 'پیام حذف پروژه می‌گوید دو بازدید هم پاک می‌شود', d.msg);
s = await snap(page); S.ok(s.projects.length === 0 && s.grave.projects.includes(P), 'پروژه حذف شد');
await give(bk); await press(page, 'ok'); d = await waitDialog(page);
S.ok(d && /پروژهٔ تازه: ۱/.test(d.msg) && /قطعهٔ تازه: ۲/.test(d.msg) && /بازدید تازه: ۲/.test(d.msg), 'پیام: پروژه با دو قطعه و دو بازدید برگشت', d && d.msg); await closeDialogs(page);
s = await snap(page);
S.ok(s.projects.length === 1 && s.projects[0].id === P && s.projects[0].plots.length === 2 && !s.grave.projects.length && !s.grave.plots.length, 'پروژه با همان شناسه برگشت و نشان حذفی نماند: ' + brief(s), s);

S.sec('بازدیدِ حذف‌شده');
await page.evaluate(([a, v1]) => visitOpen(a, v1), [a, v1]); await sleep(250);
await act(page, 'visit:del', '[data-vid="' + v1 + '"]'); await press(page, 'ok'); await sleep(300);
await give(bk); await press(page, 'ok'); d = await waitDialog(page);
S.ok(d && /۱ بازدید که قبلاً در برنامه حذف شده بود برنگشت/.test(d.msg), 'می‌گوید بازدیدِ حذف‌شده برنگشت (صادقانه)', d && d.msg); await closeDialogs(page);
s = await snap(page); S.ok(!s.projects[0].plots.find(x => x.id === a).visits.includes(v1) && !(await twins()).length, 'بازدیدِ حذف‌شده برنگشته و چیزی دوتا نشده');

S.sec('«پشتیبان JSON این پروژه»');
const pj = await projJson(); const b4 = await full();
await give(pj, 'project.json'); d = await waitDialog(page);
S.ok(d && d.title === 'بازیابی پشتیبان' && /چیزی اضافه نشد/.test(d.msg), 'وقتی خودِ پروژه هست: چیزی اضافه نمی‌شود', d); await closeDialogs(page);
s = await snap(page); S.ok(s.projects.length === 1 && !(await twins()).length, 'پروژه دوتا نشد: ' + brief(s));
S.ok(JSON.stringify(JSON.parse(await full()).projects) === JSON.stringify(JSON.parse(b4).projects), 'پروژه دست نخورد');
await act(page, 'proj:delete'); await press(page, 'ok'); await sleep(200);
await give(pj, 'project.json'); d = await waitDialog(page);
S.ok(d && /پروژهٔ تازه: ۱/.test(d.msg), 'پس از حذف پروژه: از فایل برمی‌گردد', d && d.msg); await closeDialogs(page);
s = await snap(page); S.ok(s.projects.length === 1 && s.projects[0].id === P && s.projects[0].plots.length === 2, 'با همان شناسه و دو قطعه برگشت: ' + brief(s));

S.sec('«جایگزینی کن»');
await act(page, 'proj:add'); await press(page, 'ok', 'پروژهٔ دوم'); await sleep(200); const b5 = await full(); const n5 = (await snap(page)).projects.length;
await clearDl(page); await give(bk); await press(page, 'alt'); d = await waitDialog(page);
S.ok(d && d.title === 'جایگزینی با پشتیبان' && /همهٔ ۲ پروژهٔ فعلی/.test(d.msg) && d.kind.includes('danger'), 'پیش از پاک‌کردن دوباره می‌پرسد', d);
await press(page, 'cancel'); await sleep(200);
S.ok(await full() === b5, '«انصراف» در پرسش دوم: هیچ تغییری');
await give(bk); await press(page, 'alt'); await press(page, 'ok'); await sleep(500);
s = await snap(page); const dl = await downloads(page);
S.ok(s.projects.length === 1 && s.projects[0].id === P && n5 === 2, 'فایل جای همهٔ پروژه‌ها نشست: ' + brief(s));
S.ok(dl.some(x => /^پشتیبان-دفترچه-مختصات_/.test(x.name) && JSON.parse(txt(x)).projects.length === 2), 'پیش از جایگزینی، پشتیبانِ وضعیت قبلی دانلود شد', dl.map(x => x.name));

S.sec('فایل‌های دیگر');
await clearDl(page); await act(page, 'sync:exportOffline'); const sf = txt((await downloads(page))[0]);
await give(sf, 'همگام‌سازی.json'); d = await waitDialog(page);
S.ok(d && /آوردن فایل از دستگاه دیگر/.test(d.msg), 'فایل همگام‌سازی: راهنمایی به دکمهٔ درست', d && d.msg); await closeDialogs(page);
await give(JSON.stringify({ format: 'seedcoord-full-backup-1', state: { projects: [] } })); d = await waitDialog(page);
S.ok(d && /ادغام پشتیبان کامل/.test(d.msg), 'پشتیبان کامل: راهنمایی به دکمهٔ درست', d && d.msg); await closeDialogs(page);
for (const [name, body] of [['null', 'null'], ['عدد', '5'], ['آرایه', '[1,2]'], ['شیء بی‌ربط', '{"x":1}']]) {
  await give(body); d = await waitDialog(page); S.ok(d && /ساختار فایل شناخته نشد/.test(d.msg), 'فایل نامربوط (' + name + '): پیام روشن', d && d.msg); await closeDialogs(page); }
await give('{خراب'); d = await waitDialog(page); S.ok(d && /JSON معتبر نیست/.test(d.msg), 'فایل خراب: پیام روشن', d && d.msg); await closeDialogs(page);

S.sec('پروژه‌ای که با نسخهٔ قبلی برنامه دوتا شده است');
await page.evaluate(() => { const c = JSON.parse(JSON.stringify(state.projects[0])); c.id = uid(); state.projects.push(c); save(); render(); });
S.ok((await twins()).length === 2, 'وضعیت «دوتا شده» ساخته شد (مثل نسخهٔ ۲٫۶٫۱)');
const dupId = await page.evaluate(() => state.projects[1].id);
await act(page, 'proj:select', '[data-id="' + dupId + '"]'); await act(page, 'proj:delete'); await press(page, 'ok'); await sleep(200);
s = await snap(page); S.ok(s.projects.length === 1 && s.projects[0].plots.length === 2 && s.grave.plots.length === 0, 'حذفِ نسخهٔ تکراری برای قطعه‌های مشترک نشان حذف نمی‌گذارد', s.grave);
await page.evaluate(() => syncApply(JSON.parse(JSON.stringify(syncPayload())), 'خودِ همین دستگاه')); await closeDialogs(page);
s = await snap(page); S.ok(s.projects.length === 1 && s.projects[0].plots.length === 2, 'پس از همگام‌سازی، قطعه‌های پروژهٔ اصلی سر جایشان هستند: ' + brief(s));
/* نشان حذفی که نسخهٔ قبلی برنامه گذاشته است (قطعه هنوز زنده است) */
await page.evaluate(() => { state.grave.plots.push({ id: state.projects[0].plots[0].id, t: Date.now() + 1000 }); localStorage.setItem(STORE_KEY, JSON.stringify(state)); });
const pay = await page.evaluate(() => JSON.parse(JSON.stringify(syncPayload())));
await page.evaluate(x => syncApply(x, 'ردیف سرور'), pay); await closeDialogs(page);
s = await snap(page); S.ok(s.projects[0].plots.length === 2 && s.grave.plots.length === 0, 'نشان حذفِ به‌جامانده از نسخهٔ قبلی هم قطعهٔ زنده را پاک نمی‌کند', s);

S.ok(page.__errors.length === 0, 'خطایی در صفحه نیست', page.__errors);
S.done(); await browser.close(); st.close();
