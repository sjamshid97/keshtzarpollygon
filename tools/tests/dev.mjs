// «دستگاه»های آزمایشی: هر کدام یک مرورگر جدا با حافظهٔ جدا، وصل به سرور ساختگی.
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
import { open, sleep, closeDialogs, type, act, press, setFile, downloads, clearDl, txt, REPO, OUT, site } from './h.mjs';

export const BASE_REV = '6814820';                 // نسخهٔ منتشرشدهٔ قبلی (۲٫۶٫۱) برای آزمایش «دو نسخه کنار هم»
export const BASE_VER = '2.6.1';                   // شمارهٔ همان نسخه (پس از هر انتشار، هر دو با هم عوض شوند)
export const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
export const UA_AND = 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';

/* فایل‌های نسخهٔ قبلی را از تاریخچهٔ گیت بیرون می‌کشد و یک سرور برایشان بالا می‌آورد */
export async function oldSite(rev = BASE_REV) {
  const dir = path.join(OUT, 'base-' + rev); fs.mkdirSync(dir, { recursive: true });
  for (const f of ['index.html', 'sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'])
    if (!fs.existsSync(path.join(dir, f))) fs.writeFileSync(path.join(dir, f), execFileSync('git', ['show', rev + ':' + f], { cwd: REPO, maxBuffer: 1 << 26 }));
  return site({ root: dir });
}
/* یک دستگاه تازه. st = سایت (نسخهٔ نو یا قدیمی) ، sb = سرور ساختگی */
export async function device(browser, st, sb, key, o = {}) {
  const ctx = await browser.createBrowserContext();
  const page = await open(browser, st, { ctx, path: sb ? sb.link(key, !!o.auto) : 'index.html', allow: sb ? [sb.url] : [], ua: o.ua, settle: o.auto ? 3600 : 900, viewport: o.viewport });
  page.name = o.name || 'دستگاه';
  page.push = async () => { await page.evaluate(() => gsPush(false)); await closeDialogs(page); return page.evaluate(() => (GS.msg || '').replace(/<[^>]+>/g, '')); };
  page.pull = async () => { await page.evaluate(() => gsPull(false)); await closeDialogs(page); return page.evaluate(() => (GS.msg || '').replace(/<[^>]+>/g, '')); };
  page.sync = async () => { await page.pull(); return page.push(); };
  page.ver = () => page.evaluate(() => APP_VERSION);
  page.addVisit = async (plotId, text) => { await page.$eval('[data-plot="' + plotId + '"] [data-act="visit:add"]', e => e.click()); await sleep(350);
    await type(page, '.vs-editor [data-input="visit:field"][data-k="f:summary"]', text); const vid = await page.evaluate(() => V_OPEN); await page.evaluate(() => visitClose()); await sleep(150); return vid; };
  page.backup = async () => { await clearDl(page); await act(page, 'backup:export'); const d = await downloads(page); return txt(d[d.length - 1]); };
  page.give = (text, name = 'پشتیبان.json') => setFile(page, '#importFile', name, text);
  page.selectProject = async id => { await act(page, 'proj:select', '[data-id="' + id + '"]'); };
  page.delProject = async id => { if (id) await page.selectProject(id); await act(page, 'proj:delete'); await press(page, 'ok'); await sleep(150); };
  page.delPlot = async id => { await act(page, 'plot:delete', '[data-id="' + id + '"]'); await press(page, 'ok'); await sleep(150); };
  return page;
}
export const twins = page => page.evaluate(() => { const seen = {}, dup = []; state.projects.forEach(p => (p.plots || []).forEach(pl => { if (seen[pl.id]) dup.push(pl.id); seen[pl.id] = 1; })); return dup; });
