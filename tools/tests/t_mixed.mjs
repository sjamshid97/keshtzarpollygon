// دو نسخه کنار هم: یک دستگاه نسخهٔ تازه دارد و دیگری هنوز نسخهٔ قبلی (مثل روزهای اولِ پس از انتشار).
// همگام‌سازی باید مثل قبل کار کند و هیچ‌کدام دادهٔ دیگری را خراب نکند.
import { site, launch, suite, sleep, act, type, press, closeDialogs, snap } from './h.mjs';
import { fakeSupabase } from './sb.mjs';
import { device, oldSite, UA_PC, UA_AND } from './dev.mjs';
const stNew = await site(); const stOld = await oldSite(); const browser = await launch(); const S = suite('نسخهٔ تازه کنار نسخهٔ قبلی');
const names = s => s.projects.map(p => p.name + '[' + p.plots.map(x => x.name + ':' + x.visits.length).join(',') + ']' + (p.reports ? '+' + p.reports : '')).join(' | ');
const field = (pg, id, key) => pg.evaluate(([id, key]) => { for (const p of state.projects) for (const pl of p.plots) if (pl.id === id) return pl[key]; return null; }, [id, key]);
const summary = (pg, vid) => pg.evaluate(vid => { for (const p of state.projects) for (const pl of p.plots) for (const v of (pl.visits || [])) if (v.id === vid) return (v.f || {}).summary; return null; }, vid);

for (const [title, newIsPc] of [['کامپیوتر نسخهٔ تازه، گوشی نسخهٔ قبلی', true], ['گوشی نسخهٔ تازه، کامپیوتر نسخهٔ قبلی', false]]) {
  S.sec(title);
  const sb = await fakeSupabase(); const key = 'k-mix-' + (newIsPc ? 1 : 2);
  const N = await device(browser, stNew, sb, key, { ua: newIsPc ? UA_PC : UA_AND });     // نسخهٔ تازه
  const O = await device(browser, stOld, sb, key, { ua: newIsPc ? UA_AND : UA_PC });     // نسخهٔ قبلی
  S.ok((await O.ver()) === '2.6.1' && (await N.ver()) !== '2.6.1', 'نسخه‌ها: تازه ' + (await N.ver()) + ' و قبلی ' + (await O.ver()));
  await act(N, 'data:demo'); await closeDialogs(N); let sN = await snap(N); const P = sN.projects[0].id, [a, b] = sN.projects[0].plots.map(x => x.id);
  const v1 = await N.addVisit(a, 'بازدید از نسخهٔ تازه'); await N.push(); await O.pull();
  let sO = await snap(O); S.ok(sO.projects.length === 1 && sO.projects[0].plots[0].visits[0] === v1, 'نسخهٔ قبلی داده‌های نسخهٔ تازه را می‌گیرد: ' + names(sO));
  const v2 = await O.addVisit(b, 'بازدید از نسخهٔ قبلی'); await O.push(); await N.pull();
  sN = await snap(N); S.ok(sN.projects[0].plots.find(x => x.id === b).visits.includes(v2), 'نسخهٔ تازه بازدیدِ نسخهٔ قبلی را می‌گیرد: ' + names(sN));
  // ویرایش همان بازدید روی هر دو طرف، یکی پس از دیگری
  await O.evaluate(([a, v1]) => { visitOpen(a, v1); }, [a, v1]); await sleep(250); await type(O, '.vs-editor [data-input="visit:field"][data-k="f:summary"]', 'ویرایش در نسخهٔ قبلی'); await O.evaluate(() => visitClose()); await O.push(); await N.pull();
  S.ok(await summary(N, v1) === 'ویرایش در نسخهٔ قبلی', 'ویرایشِ نسخهٔ قبلی به نسخهٔ تازه می‌رسد');
  await N.evaluate(([a, v1]) => { visitOpen(a, v1); }, [a, v1]); await sleep(250); await type(N, '.vs-editor [data-input="visit:field"][data-k="f:summary"]', 'ویرایش دوباره در نسخهٔ تازه'); await N.evaluate(() => visitClose()); await N.push(); await O.pull();
  S.ok(await summary(O, v1) === 'ویرایش دوباره در نسخهٔ تازه', 'ویرایشِ نسخهٔ تازه به نسخهٔ قبلی می‌رسد');
  // مرحلهٔ رشد تازه و فیلدهای قطعه
  await type(N, '[data-input="plot:field"][data-id="' + a + '"][data-key="code"]', 'N-1'); await sleep(40); await N.push(); await O.pull();
  await type(O, '[data-input="plot:field"][data-id="' + b + '"][data-key="code"]', 'O-2'); await sleep(40); await O.push(); await N.pull();
  S.ok(await field(O, a, 'code') === 'N-1' && await field(N, b, 'code') === 'O-2', 'تغییر فیلد قطعه در هر دو جهت می‌رسد');
  // حذف در هر دو جهت
  const bk = await N.backup();
  await N.delPlot(a); await N.push(); await O.pull();
  sO = await snap(O); S.ok(!sO.projects[0].plots.some(x => x.id === a), 'حذف قطعه در نسخهٔ تازه به نسخهٔ قبلی می‌رسد: ' + names(sO));
  // بازیابی در نسخهٔ تازه → نسخهٔ قبلی هم پس می‌گیرد
  await sleep(40); await N.give(bk); await press(N, 'ok'); await closeDialogs(N); await N.push(); await O.pull();
  sO = await snap(O); sN = await snap(N);
  S.ok(sN.projects[0].plots.some(x => x.id === a), 'قطعه در نسخهٔ تازه از پشتیبان برگشت: ' + names(sN));
  S.ok(sO.projects[0].plots.some(x => x.id === a) && sO.projects[0].plots.find(x => x.id === a).visits.includes(v1), 'و به نسخهٔ قبلی هم برگشت، با بازدیدش: ' + names(sO));
  // پس از بازیابی، دوطرفه
  await type(O, '[data-input="plot:field"][data-id="' + a + '"][data-key="variety"]', 'رقم-قبلی'); await sleep(40); await O.push(); await N.pull();
  S.ok(await field(N, a, 'variety') === 'رقم-قبلی', 'تغییر نسخهٔ قبلی در قطعهٔ بازیابی‌شده به نسخهٔ تازه می‌رسد');
  await type(N, '[data-input="plot:field"][data-id="' + a + '"][data-key="seedClass"]', 'گواهی‌شده'); await sleep(40); await N.push(); await O.pull();
  S.ok(await field(O, a, 'seedClass') === 'گواهی‌شده', 'تغییر نسخهٔ تازه در قطعهٔ بازیابی‌شده به نسخهٔ قبلی می‌رسد');
  // حذف پروژه در نسخهٔ قبلی
  await O.delProject(); await O.push(); await N.pull();
  sN = await snap(N); S.ok(sN.projects.length === 0, 'حذف پروژه در نسخهٔ قبلی به نسخهٔ تازه می‌رسد');
  await N.pull(); await O.pull(); await N.push(); await O.pull();
  sN = await snap(N); sO = await snap(O);
  S.ok(sN.projects.length === 0 && sO.projects.length === 0, 'پس از چند دور، هر دو خالی می‌مانند (چیزی خودبه‌خود برنمی‌گردد)');
  S.ok(!N.__errors.length && !O.__errors.length, 'خطایی در صفحه نیست', N.__errors.concat(O.__errors)); sb.close();
}
S.done(); await browser.close(); stNew.close(); stOld.close();
