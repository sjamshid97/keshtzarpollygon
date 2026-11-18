// کادر «آخرین بازدید»، پیام‌های پایان کار، فایل Word با نویسه‌های نادیدنی، حافظهٔ پر، و نام‌ها در بازیابی GeoJSON
import { site, launch, open, reopen, suite, sleep, act, type, press, waitDialog, dialogs, closeDialogs, setFile, downloads, clearDl, txt, bin, snap } from './h.mjs';
import { unzip } from './zip.mjs';
const st = await site(); const browser = await launch(); const S = suite('کادر آمار، پیام‌ها، Word، حافظه و GeoJSON');
const page = await open(browser, st);
await act(page, 'data:demo'); await closeDialogs(page);
const [a, b] = await page.evaluate(() => state.projects[0].plots.map(x => x.id));
const kpi = () => page.$eval('#kpiVisit', e => ({ text: e.textContent, html: e.innerHTML }));
const toast = () => page.evaluate(() => { const el = document.getElementById('vToast'); if (!el) return null; const r = el.getBoundingClientRect(); return { on: el.classList.contains('on') && r.width > 0 && r.height > 0, text: el.textContent }; });
const xmlOk = text => page.evaluate(t => { const d = new DOMParser().parseFromString(t, 'application/xml'); const e = d.querySelector('parsererror'); return e ? e.textContent.slice(0, 160) : true; }, text);
const setVisitDate = (plotId, vid, date) => page.evaluate(([p, v, d]) => { vSet(p, v, 'f:date', d); render(); }, [plotId, vid, date]);
const newVisit = async plotId => { await page.$eval('[data-plot="' + plotId + '"] [data-act="visit:add"]', e => e.click()); await sleep(300); const vid = await page.evaluate(() => V_OPEN); await page.evaluate(() => visitClose()); return vid; };

S.sec('کادر «آخرین بازدید ثبت‌شده»');
await page.evaluate(() => { state.projects[0].plots.forEach(pl => { pl.lastVisit = ''; }); save(); render(); });
S.ok((await kpi()).text === '—', 'بی‌بازدید: خط تیره');
const v1 = await newVisit(a); await setVisitDate(a, v1, '۱۴۰۵/۹/۲۸'); await sleep(200);
S.ok((await kpi()).text === '۱۴۰۵/۹/۲۸', 'تاریخِ بازدیدِ ثبت‌شده را نشان می‌دهد (پیش‌تر همیشه خط تیره بود)', await kpi());
const v2 = await newVisit(b); await setVisitDate(b, v2, '۱۴۰۵/۱۰/۳'); await sleep(200);
S.ok((await kpi()).text === '۱۴۰۵/۱۰/۳', 'ماه ۱۰ بعد از ماه ۹ حساب می‌شود', await kpi());
await type(page, '[data-input="plot:field"][data-id="' + a + '"][data-key="lastVisit"]', '۱۴۰۵/۱۱/۰۱'); await sleep(500); await page.evaluate(() => render());
S.ok((await kpi()).text === '۱۴۰۵/۱۱/۰۱', 'خانهٔ دستیِ «آخرین بازدید» هم مثل قبل حساب می‌شود', await kpi());
await page.evaluate(a => { const pl = state.projects[0].plots.find(x => x.id === a); pl.lastVisit = '۱۴۰۵/۱۲/۲۹<img src=x onerror="window.__hacked=1"><b>x</b>'; save(); render(); }, a); await sleep(300);
const k = await kpi(); S.ok(!/<img|<b>/.test(k.html) && /&lt;img/.test(k.html) && !(await page.evaluate(() => window.__hacked)), 'متنِ دست‌کاری‌شده فقط به شکل متن نشان داده می‌شود و اجرا نمی‌شود', k.html);
await page.evaluate(a => { state.projects[0].plots.find(x => x.id === a).lastVisit = ''; save(); render(); }, a);

S.sec('پیام پایان کار');
await clearDl(page); await act(page, 'exp:projZip'); await sleep(1600);
let t = await toast(); const dl = await downloads(page);
S.ok(dl.length === 2 && dl.every(x => /\.geojson$/.test(x.name)), '«GeoJSON تک‌تک قطعات»: دو فایل ساخته شد', dl.map(x => x.name));
S.ok(t && t.on && /جداگانه دانلود شد \(۲ فایل\)/.test(t.text), 'و پیام پایان کار دیده می‌شود', t);
await act(page, 'rep:open'); await sleep(300); await clearDl(page); await act(page, 'rep:csv'); await sleep(400);
t = await toast(); S.ok(t && t.on && /گزارش CSV ذخیره شد/.test(t.text), 'CSV گزارش پروژه‌ها: پیام دیده می‌شود', t);
await page.evaluate(() => { window.__popupBlocked = true; }); await act(page, 'rep:print');
let d = await waitDialog(page); S.ok(d && d.title === 'چاپ' && /پنجرهٔ بازشو/.test(d.msg), 'چاپ گزارش وقتی مرورگر پنجره را می‌بندد: پیام روشن', d); await closeDialogs(page);
await act(page, 'rep:close'); await sleep(200); await act(page, 'exp:projPrint');
d = await waitDialog(page); S.ok(d && d.title === 'چاپ' && /پنجرهٔ بازشو/.test(d.msg), '«چاپ / PDF» وقتی مرورگر پنجره را می‌بندد: پیام روشن (پیش‌تر خطا می‌داد)', d); await closeDialogs(page);
await page.evaluate(() => { window.__popupBlocked = false; window.__opened.length = 0; }); await act(page, 'exp:projPrint'); await sleep(700);
const op = await page.evaluate(() => window.__opened.map(o => ({ n: o.html.length, printed: o.printed })));
S.ok(op.length === 1 && op[0].n > 500 && op[0].printed === 1, '«چاپ / PDF» در حالت عادی مثل قبل کار می‌کند', op);
await page.evaluate(() => cloudToast('پیام آزمایشی')); await sleep(300); t = await toast();
S.ok(t && t.on && t.text === 'پیام آزمایشی', 'پیام‌های کوتاهِ برنامه (مثل «نسخهٔ تازه آماده است») در دفترچه دیده می‌شوند', t);

S.sec('نویسه‌های نادیدنی در Word و KML');
const weird = 'متن\u0001 با\u000B نویسهٔ\u001F نادیدنی \uD83C و علامت < & > "';
await page.evaluate(([a, v, w]) => { vSet(a, v, 'f:summary', w); vSet(a, v, 'f:inspector', 'بازدیدکننده\u0002'); state.projects[0].plots.find(x => x.id === a).name = 'قطعه\u0003 شمالی'; save(); render(); }, [a, v1, weird]);
await clearDl(page); await page.evaluate(([a, v]) => visitWord(a, v), [a, v1]); await sleep(1500); await closeDialogs(page);
let files = await downloads(page); const docx = files.find(x => /\.docx$/.test(x.name));
S.ok(!!docx, 'فایل Word ساخته شد', files.map(x => x.name));
if (docx) { const z = unzip(bin(docx)); const xml = z['word/document.xml'].toString('utf8');
  S.ok(await xmlOk(xml) === true, 'فایل Word سالم است (پیش‌تر با این نویسه‌ها باز نمی‌شد)', await xmlOk(xml));
  S.ok(/متن با نویسهٔ? نادیدنی/.test(xml) && /&lt; &amp; &gt;/.test(xml), 'متنِ اصلی سر جایش است و فقط نویسه‌های نادیدنی حذف شده‌اند'); }
S.ok(await page.evaluate(([a, v, w]) => vFind(a, v).f.summary === w, [a, v1, weird]), 'دادهٔ ذخیره‌شده دست نخورده است');
await clearDl(page); await act(page, 'exp:projKml'); files = await downloads(page);
const kml = txt(files[0]); S.ok(await xmlOk(kml) === true && /قطعه شمالی/.test(kml), 'فایل KML سالم است', await xmlOk(kml));
await clearDl(page); await act(page, 'exp:projGeo'); files = await downloads(page);
S.ok(JSON.parse(txt(files[0])).features.length === 2, 'GeoJSON مثل قبل سالم است');

S.sec('بازیابی GeoJSON برنامه‌های دیگر');
const gj = { type: 'FeatureCollection', name: 'exported', features: [
  { type: 'Feature', properties: { Name: '3هکتار', description: 'زمین نمونه', tessellate: -1, extrude: 0, visibility: -1 }, geometry: { type: 'Polygon', coordinates: [[[51.5288, 35.1515], [51.5278, 35.1503], [51.5289, 35.1493], [51.5305, 35.1503], [51.5288, 35.1515]]] } },
  { type: 'Feature', properties: { name: 'قطعهٔ دوم' }, geometry: { type: 'Polygon', coordinates: [[[51.55, 35.14], [51.551, 35.141], [51.552, 35.14], [51.55, 35.14]]] } },
  { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[51.56, 35.14], [51.561, 35.141], [51.562, 35.14], [51.56, 35.14]]] } }] };
await setFile(page, '#importFile', 'Export ۲۰۲۶-۱۱-۱۶ ۱۱۳۸.geojson', JSON.stringify(gj)); await closeDialogs(page);
let s = await snap(page); let np = s.projects[s.projects.length - 1];
S.ok(np.name === 'Export ۲۰۲۶-۱۱-۱۶ ۱۱۳۸', 'نام پروژه = نام فایل (نه «exported»)', np.name);
S.ok(JSON.stringify(np.plots.map(x => x.name)) === JSON.stringify(['3هکتار', 'قطعهٔ دوم', 'قطعه 3']), 'نام قطعه‌ها از خودِ فایل خوانده می‌شود', np.plots.map(x => x.name));
await page.evaluate(id => { state.activeId = id; render(); }, s.projects[0].id); await clearDl(page); await act(page, 'exp:projGeo'); const own = txt((await downloads(page))[0]);
await setFile(page, '#importFile', 'خروجی-خود-برنامه.geojson', own); await closeDialogs(page);
s = await snap(page); np = s.projects[s.projects.length - 1];
S.ok(np.name === s.projects[0].name && np.plots.length === 2 && np.plots[1].name === 'قطعه جنوبی', 'خروجی خودِ برنامه مثل قبل برمی‌گردد (نام پروژه و قطعه از فایل)', np);

S.sec('حافظهٔ دستگاه');
const warn = () => page.evaluate(() => { const el = document.getElementById('storageWarn'); return { shown: !el.classList.contains('u-hidden'), text: el.textContent.trim().slice(0, 90), btn: !!el.querySelector('[data-act="store:reset"]') }; });
S.ok(!(await warn()).shown, 'در حالت عادی هشداری نیست');
await page.evaluate(() => { window.__realSet = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { if (k === STORE_KEY) throw new DOMException('پر است', 'QuotaExceededError'); return window.__realSet.call(this, k, v); }; });
await type(page, '[data-input="proj:field"][data-key="notes"]', 'یادداشتِ وقتی که حافظه پر بود'); await sleep(200);
let w = await warn(); S.ok(w.shown && /حافظهٔ مرورگر پر است/.test(w.text), 'حافظهٔ پر: پیامِ درست (نه پیامِ «حالت پیش‌نمایش»)', w);
await page.evaluate(() => { Storage.prototype.setItem = window.__realSet; });
await type(page, '[data-input="proj:field"][data-key="notes"]', 'یادداشتِ بعد از خالی‌شدن حافظه'); await sleep(200);
w = await warn(); S.ok(!w.shown, 'وقتی جا باز شد، ذخیره خودش دوباره انجام می‌شود و هشدار می‌رود', w);
S.ok(await page.evaluate(() => JSON.parse(localStorage.getItem(STORE_KEY)).projects.some(p => p.notes === 'یادداشتِ بعد از خالی‌شدن حافظه')), 'آخرین تغییر واقعاً ذخیره شده است');
const good = await page.evaluate(() => localStorage.getItem(STORE_KEY));
await page.evaluate(() => localStorage.setItem(STORE_KEY, '{"projects":[{"id":"x1","name":"نیمه‌کاره'));
await reopen(page); w = await warn();
S.ok(w.shown && /خوانده نشد/.test(w.text) && w.btn && !page.__errors.length, 'دادهٔ خراب: برنامه باز می‌شود و پیام روشن می‌دهد', [w, page.__errors]);
await act(page, 'proj:add'); await press(page, 'ok', 'پروژهٔ موقت'); await sleep(200);
S.ok(await page.evaluate(() => localStorage.getItem(STORE_KEY)) === '{"projects":[{"id":"x1","name":"نیمه‌کاره', 'روی دادهٔ خوانده‌نشده چیزی نوشته نمی‌شود (از بین نمی‌رود)');
await clearDl(page); await act(page, 'store:reset'); d = await waitDialog(page);
S.ok(d && d.title === 'دادهٔ خوانده‌نشده', 'پیش از کنار گذاشتنِ دادهٔ خراب می‌پرسد', d); await press(page, 'ok');
const rescue = await downloads(page); await sleep(2200); await page.waitForFunction(() => typeof state !== 'undefined'); await sleep(600);
S.ok(rescue.length === 1 && /^داده-خوانده-نشده_/.test(rescue[0].name) && txt(rescue[0]) === '{"projects":[{"id":"x1","name":"نیمه‌کاره', 'دادهٔ خوانده‌نشده به شکل فایل دانلود شد', rescue.map(x => x.name));
w = await warn(); S.ok(!w.shown && (await snap(page)).projects.length === 0, 'برنامه با حافظهٔ خالی دوباره باز شد و هشدار رفت', w);
await act(page, 'proj:add'); await press(page, 'ok', 'پروژهٔ تازه'); await sleep(200);
S.ok(await page.evaluate(() => JSON.parse(localStorage.getItem(STORE_KEY)).projects[0].name) === 'پروژهٔ تازه', 'و دوباره ذخیره می‌کند');
for (const bad of ['null', '5', '[1,2]', '{"projects":7}']) { await page.evaluate(v => localStorage.setItem(STORE_KEY, v), bad); page.__errors.length = 0; await reopen(page); w = await warn();
  S.ok(w.shown && /خوانده نشد/.test(w.text) && !page.__errors.length, 'دادهٔ بی‌معنا («' + bad + '»): برنامه از کار نمی‌افتد', [w, page.__errors]); }
await page.evaluate(v => localStorage.setItem(STORE_KEY, v), good); await reopen(page);
S.ok(!(await warn()).shown && (await snap(page)).projects.length >= 1, 'با دادهٔ سالم مثل قبل باز می‌شود');
const p2 = await open(browser, st, { before: () => { const g = Storage.prototype.getItem; Storage.prototype.getItem = function (k) { if (k === 'seed_coord_notebook_v1') throw new DOMException('no', 'SecurityError'); return g.call(this, k); }; } });
const w2 = await p2.evaluate(() => { const el = document.getElementById('storageWarn'); return { shown: !el.classList.contains('u-hidden'), text: el.textContent.trim() }; });
S.ok(w2.shown && /حالت پیش‌نمایش/.test(w2.text), 'وقتی مرورگر اجازهٔ ذخیره نمی‌دهد: همان پیامِ قبلیِ «حالت پیش‌نمایش»', w2);

S.ok(page.__errors.length === 0, 'خطایی در صفحه نیست', page.__errors);
S.done(); await browser.close(); st.close();
