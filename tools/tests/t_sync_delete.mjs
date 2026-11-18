// حذف و بازیابی میان دو دستگاه (گوشی و کامپیوتر) از راه سرور:
// حذف باید به دستگاه دیگر برسد؛ چیزی که بازیابی شده باید روی هر دو بماند و بعدش همگام‌سازی دوطرفه کار کند.
import { site, launch, suite, sleep, act, type, press, waitDialog, closeDialogs, snap, brief } from './h.mjs';
import { fakeSupabase } from './sb.mjs';
import { device, twins, UA_PC, UA_AND } from './dev.mjs';
const st = await site(); const browser = await launch(); const S = suite('حذف و بازیابی میان دو دستگاه');
const plotNames = s => s.projects.map(p => p.name + '[' + p.plots.map(x => x.name + ':' + x.visits.length).join(',') + ']').join(' | ');

{ S.sec('حذف قطعه و پروژه به دستگاه دیگر می‌رسد');
  const sb = await fakeSupabase(); const A = await device(browser, st, sb, 'k-del-1', { ua: UA_PC }); const B = await device(browser, st, sb, 'k-del-1', { ua: UA_AND });
  await act(A, 'data:demo'); await closeDialogs(A); const sA = await snap(A); const P = sA.projects[0].id, [a, b] = sA.projects[0].plots.map(x => x.id);
  await A.addVisit(a, 'بازدید کامپیوتر'); await A.push(); await B.pull();
  let sB = await snap(B); S.ok(sB.projects.length === 1 && sB.projects[0].plots.length === 2 && sB.projects[0].plots[0].visits.length === 1, 'گوشی همه‌چیز را گرفت: ' + plotNames(sB));
  await A.delPlot(a); await A.push(); await B.pull();
  sB = await snap(B); S.ok(sB.projects[0].plots.length === 1 && sB.projects[0].plots[0].id === b, 'حذف قطعه به گوشی رسید: ' + plotNames(sB));
  await B.delProject(); await B.push(); await A.pull();
  const s2 = await snap(A); S.ok(s2.projects.length === 0, 'حذف پروژه از گوشی به کامپیوتر رسید');
  S.ok(!A.__errors.length && !B.__errors.length, 'خطایی در صفحه نیست', A.__errors.concat(B.__errors)); sb.close(); }

{ S.sec('پروژهٔ حذف‌شده از پشتیبان برمی‌گردد و روی هر دو دستگاه می‌ماند');
  const sb = await fakeSupabase(); const A = await device(browser, st, sb, 'k-del-2', { ua: UA_PC }); const B = await device(browser, st, sb, 'k-del-2', { ua: UA_AND });
  await act(A, 'data:demo'); await closeDialogs(A); let sA = await snap(A); const P = sA.projects[0].id, [a, b] = sA.projects[0].plots.map(x => x.id);
  const v1 = await A.addVisit(a, 'بازدید مهم'); await A.push(); await B.pull();
  const bk = await A.backup();
  await A.delProject(); await A.push(); await B.pull();
  let sB = await snap(B); S.ok(sB.projects.length === 0, 'پروژه از هر دو دستگاه حذف شد');
  await sleep(40); await A.give(bk); await press(A, 'ok'); await closeDialogs(A);
  sA = await snap(A); S.ok(sA.projects.length === 1 && sA.projects[0].plots.length === 2, 'روی کامپیوتر از پشتیبان برگشت: ' + plotNames(sA));
  await A.push(); await B.pull();
  sB = await snap(B); S.ok(sB.projects.length === 1 && sB.projects[0].plots.length === 2 && sB.projects[0].plots.find(x => x.id === a).visits[0] === v1, 'به گوشی هم برگشت، با قطعه‌ها و بازدید: ' + plotNames(sB), sB);
  S.ok(!sB.grave.projects.length && !sB.grave.plots.length, 'روی گوشی نشان حذفِ کهنه‌ای نماند', sB.grave);
  // باز کردن دوبارهٔ برنامه (دریافت ردیفِ خودِ دستگاه) چیزی را پاک نکند
  await A.pull(); await B.push(); await A.pull(); await B.pull();
  sA = await snap(A); sB = await snap(B);
  S.ok(sA.projects.length === 1 && sA.projects[0].plots.length === 2 && sB.projects.length === 1 && sB.projects[0].plots.length === 2, 'پس از چند دور همگام‌سازی، هر دو دستگاه پروژه و قطعه‌ها را دارند');
  // همگام‌سازی دوطرفهٔ همان پروژهٔ بازیابی‌شده
  const v2 = await B.addVisit(b, 'بازدید گوشی پس از بازیابی'); await B.push(); await A.pull();
  sA = await snap(A); S.ok(sA.projects[0].plots.find(x => x.id === b).visits.includes(v2), 'بازدیدی که گوشی در پروژهٔ بازیابی‌شده ساخت به کامپیوتر رسید', sA);
  await type(A, '[data-input="plot:field"][data-id="' + a + '"][data-key="variety"]', 'رقم تازه'); await sleep(50); await A.push(); await B.pull();
  S.ok(await B.evaluate(a => state.projects[0].plots.find(x => x.id === a).variety, a) === 'رقم تازه', 'تغییر کامپیوتر در قطعهٔ بازیابی‌شده به گوشی رسید');
  S.ok(!A.__errors.length && !B.__errors.length, 'خطایی در صفحه نیست', A.__errors.concat(B.__errors)); sb.close(); }

{ S.sec('ویرایشِ تازه‌تر از حذف: قطعه می‌ماند و بعدش دوطرفه همگام می‌شود');
  const sb = await fakeSupabase(); const A = await device(browser, st, sb, 'k-del-3', { ua: UA_PC }); const B = await device(browser, st, sb, 'k-del-3', { ua: UA_AND });
  await act(A, 'data:demo'); await closeDialogs(A); let sA = await snap(A); const [a, b] = sA.projects[0].plots.map(x => x.id);
  await A.push(); await B.pull();
  await A.delPlot(a);                                   // کامپیوتر حذف می‌کند، ولی هنوز نفرستاده
  await sleep(60); await type(B, '[data-input="plot:field"][data-id="' + a + '"][data-key="code"]', 'کد-گوشی'); await sleep(60);
  await B.push();                                        // گوشی (بی‌خبر از حذف) بعداً همان قطعه را ویرایش می‌کند
  await A.sync(); await B.pull();
  sA = await snap(A); let sB = await snap(B);
  S.ok(sA.projects[0].plots.some(x => x.id === a) && sB.projects[0].plots.some(x => x.id === a), 'قطعه روی هر دو دستگاه ماند (ویرایش تازه‌تر از حذف بود)', [plotNames(sA), plotNames(sB)]);
  S.ok(!sA.grave.plots.length, 'کامپیوتر نشان حذفِ کهنه را کنار گذاشت', sA.grave);
  await type(A, '[data-input="plot:field"][data-id="' + a + '"][data-key="variety"]', 'رقم-کامپیوتر'); await sleep(50); await A.push(); await B.pull();
  S.ok(await B.evaluate(a => state.projects[0].plots.find(x => x.id === a).variety, a) === 'رقم-کامپیوتر', 'تغییر بعدیِ کامپیوتر به گوشی رسید');
  await type(B, '[data-input="plot:field"][data-id="' + a + '"][data-key="seedClass"]', 'مادری'); await sleep(50); await B.push(); await A.pull();
  S.ok(await A.evaluate(a => state.projects[0].plots.find(x => x.id === a).seedClass, a) === 'مادری', 'تغییر بعدیِ گوشی به کامپیوتر رسید');
  S.ok(!A.__errors.length && !B.__errors.length, 'خطایی در صفحه نیست', A.__errors.concat(B.__errors)); sb.close(); }

{ S.sec('همان زنجیرهٔ خطرناکِ قبلی، این بار با همگام‌سازی خودکار');
  const sb = await fakeSupabase(); const A = await device(browser, st, sb, 'k-del-4', { ua: UA_PC, auto: true });
  await act(A, 'data:demo'); await closeDialogs(A); let sA = await snap(A); const [a, b] = sA.projects[0].plots.map(x => x.id);
  await A.addVisit(a, 'بازدید مهم'); await sleep(6500);
  const B = await device(browser, st, sb, 'k-del-4', { ua: UA_AND, auto: true });
  const bk = await A.backup();
  await A.give(bk); await press(A, 'cancel'); await sleep(300);
  await act(A, 'exp:projJson'); const pj = await (async () => { const { downloads, txt } = await import('./h.mjs'); const d = await downloads(A); return txt(d[d.length - 1]); })();
  await A.give(pj, 'project.json'); await closeDialogs(A); await sleep(6500);
  sA = await snap(A); S.ok(sA.projects.length === 1 && !(await twins(A)).length, '«انصراف» و «پشتیبان JSON این پروژه» دیگر پروژه را دوتا نمی‌کنند: ' + plotNames(sA));
  await A.goto(st.base + 'index.html', { waitUntil: 'load' }); await A.waitForFunction(() => typeof state !== 'undefined'); await sleep(4200); await closeDialogs(A);
  await B.goto(st.base + 'index.html', { waitUntil: 'load' }); await B.waitForFunction(() => typeof state !== 'undefined'); await sleep(4200); await closeDialogs(B);
  sA = await snap(A); const sB = await snap(B);
  S.ok(sA.projects.length === 1 && sA.projects[0].plots.length === 2 && sA.projects[0].plots[0].visits.length === 1, 'کامپیوتر پس از باز و بسته شدن: ' + plotNames(sA));
  S.ok(sB.projects.length === 1 && sB.projects[0].plots.length === 2 && sB.projects[0].plots[0].visits.length === 1, 'گوشی پس از باز و بسته شدن: ' + plotNames(sB));
  S.ok(!A.__errors.length && !B.__errors.length, 'خطایی در صفحه نیست', A.__errors.concat(B.__errors)); sb.close(); }

S.done(); await browser.close(); st.close();
