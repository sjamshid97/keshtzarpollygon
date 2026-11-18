// ابزار مشترک آزمایش‌های مرورگری دفترچهٔ مختصات.
// برنامه را در یک کروم بی‌صفحه باز می‌کند و مثل کاربر روی دکمه‌ها می‌زند.
// هیچ دادهٔ واقعی در این پوشه نیست؛ همهٔ داده‌ها ساختگی‌اند.
process.env.AWS_LAMBDA_JS_RUNTIME = process.env.AWS_LAMBDA_JS_RUNTIME || 'nodejs22.x';
import fs from 'fs'; import path from 'path'; import http from 'http'; import { fileURLToPath } from 'url';
const { default: puppeteer } = await import('puppeteer-core');
const { default: chromium } = await import('@sparticuz/chromium');

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(HERE, '..', '..');           // ریشهٔ مخزن = خودِ سایت
export const OUT = path.join(HERE, 'out');                      // خروجی‌های موقت آزمایش (در گیت نمی‌رود)
export const sleep = ms => new Promise(r => setTimeout(r, ms));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.md': 'text/plain; charset=utf-8', '.json': 'application/json' };

/* سرور کوچک فایل. st.fail = (مسیر) => کد خطا | null ؛ st.down = true یعنی شبکه قطع است. */
export async function site(opts = {}) {
  const root = opts.root || REPO;
  const st = { hits: [], fail: null, down: false, root };
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    if (st.down) { q.socket.destroy(); return; }
    st.hits.push(p);
    const forced = st.fail ? st.fail(p) : null;
    if (forced) { r.writeHead(forced, { 'content-type': 'text/html; charset=utf-8' }); return r.end('<h1>' + forced + ' خطای آزمایشی سرور</h1>'); }
    const f = path.join(st.root, p);
    if (!f.startsWith(st.root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404, { 'content-type': 'text/html' }); return r.end('<h1>404</h1>'); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' }); r.end(fs.readFileSync(f));
  });
  await new Promise(ok => srv.listen(0, '127.0.0.1', ok));
  st.base = 'http://127.0.0.1:' + srv.address().port + '/'; st.close = () => srv.close();
  return st;
}

export async function launch() {
  /* گاهی اولین بالا آمدنِ مرورگر شکست می‌خورد (فایل اجراییِ نیمه‌بازشده)؛ یک بار دیگر از نو امتحان می‌شود */
  for (let i = 0; ; i++) {
    try { fs.rmSync('/tmp/chromium', { force: true }); } catch (e) {}
    try {
      return await puppeteer.launch({
        args: [...chromium.args.filter(a => a !== '--single-process' && !a.startsWith('--no-zygote')), '--no-sandbox'],
        executablePath: await chromium.executablePath(), headless: 'shell', defaultViewport: { width: 1280, height: 900 } });
    } catch (e) { if (i >= 2) throw e; await sleep(1500); }
  }
}

/* پیش از بارشدن صفحه: دانلودها و پنجره‌های چاپ را به‌جای انجام واقعی، ثبت می‌کند. */
const HOOK = () => {
  const blobs = new Map(); window.__dl = []; window.__opened = []; window.__popupBlocked = false;
  const oc = URL.createObjectURL.bind(URL);
  URL.createObjectURL = b => { const u = oc(b); try { blobs.set(u, b); } catch (e) {} return u; };
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute('download') && blobs.has(this.href)) {
      const b = blobs.get(this.href); const entry = { name: this.download, size: b.size, type: b.type, b64: null }; window.__dl.push(entry);
      const fr = new FileReader(); fr.onload = () => { entry.b64 = String(fr.result).split(',')[1] || ''; }; fr.readAsDataURL(b); return;
    }
    if (this.hasAttribute('download')) { window.__dl.push({ name: this.download, size: -1, type: 'href', b64: '', href: String(this.href).slice(0, 200000) }); return; }
    return click.call(this);
  };
  window.open = (url) => {
    if (window.__popupBlocked) return null;
    const rec = { url: String(url || ''), html: '', printed: 0 }; window.__opened.push(rec);
    return { document: { write: h => { rec.html += h; }, close() {}, title: '' }, print() { rec.printed++; }, focus() {}, close() {}, addEventListener() {}, location: { href: '' } };
  };
};
/* ساعت و شناسه‌های ثابت، تا دو بار اجرای یک سناریو خروجی یکسان بدهد (برای مقایسهٔ نسخه‌ها). */
const FIXED = (t0) => {
  let seed = 1234567; Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const RealDate = Date; let now = t0;
  class FakeDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } }
  window.Date = FakeDate; window.__tick = ms => { now += ms; return now; }; window.__setNow = t => { now = t; };
  const st = window.setTimeout; void st;
};

export async function open(browser, st, o = {}) {
  const ctx = o.ctx || await browser.createBrowserContext();
  const page = await ctx.newPage(); page.__ctx = ctx; page.__errors = []; page.__blocked = []; page.__warn = []; page.__st = st;
  if (o.viewport) await page.setViewport(o.viewport);
  if (o.ua) await page.setUserAgent(o.ua);
  page.on('pageerror', e => page.__errors.push('pageerror: ' + (e && e.message || e)));
  page.on('console', m => { const t = m.text();
    if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(t)) page.__errors.push('console.error: ' + t.slice(0, 300));
    if (m.type() === 'warn' || m.type() === 'warning') page.__warn.push(t.slice(0, 200)); });
  await page.setRequestInterception(true);
  page.on('request', q => { const u = q.url();
    if (u.startsWith(st.base) || u.startsWith('data:') || u.startsWith('blob:') || u.startsWith('file:')) return q.continue();
    if (o.allow && o.allow.some(a => u.startsWith(a))) return q.continue();
    page.__blocked.push(u.slice(0, 120)); q.abort(); });
  if (o.hook !== false) await page.evaluateOnNewDocument(HOOK);
  if (o.fixed) await page.evaluateOnNewDocument(FIXED, typeof o.fixed === 'number' ? o.fixed : Date.UTC(2026, 10, 1, 6, 0, 0));
  if (o.before) await page.evaluateOnNewDocument(o.before);
  await page.goto((o.url || st.base + (o.path || 'index.html')), { waitUntil: 'load' });
  await page.waitForFunction(() => typeof state !== 'undefined' && typeof ACTIONS_READY !== 'undefined' ? true : typeof state !== 'undefined');
  await sleep(o.settle == null ? 700 : o.settle);
  if (!o.keepDialogs) await closeDialogs(page);
  return page;
}
export async function reopen(page, o = {}) {
  await page.goto(o.url || (page.__st.base + (o.path || 'index.html')), { waitUntil: 'load' });
  await page.waitForFunction(() => typeof state !== 'undefined');
  await sleep(o.settle == null ? 700 : o.settle);
  if (!o.keepDialogs) await closeDialogs(page);
}

/* ---------- پنجره‌های پیام برنامه (.dlg-wrap) ---------- */
export const dialogs = page => page.evaluate(() => [...document.querySelectorAll('.dlg-wrap .dlg')].map(d => ({
  title: (d.querySelector('.ttl') || {}).textContent || '', msg: (d.querySelector('.msg') || {}).textContent || '',
  ok: (d.querySelector('.ok') || {}).textContent || '', alt: (d.querySelector('.alt') || {}).textContent || null,
  cancel: (d.querySelector('.cancel') || {}).textContent || null, input: !!d.querySelector('input, textarea.code:not([readonly])'),
  kind: d.className.replace('dlg', '').trim() })));
export async function waitDialog(page, ms = 3000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const d = await dialogs(page); if (d.length) return d[d.length - 1]; await sleep(60); }
  return null;
}
/* روی دکمهٔ بالاترین پنجره می‌زند: 'ok' | 'alt' | 'cancel' | 'esc' ؛ value برای پنجره‌های متنی */
export async function press(page, which, value, ms = 3000) {
  const d = await waitDialog(page, ms); if (!d) throw new Error('پنجره‌ای باز نشد که «' + which + '» زده شود');
  if (which === 'esc') { await page.keyboard.press('Escape'); await sleep(120); return d; }
  const okk = await page.evaluate(([which, value]) => {
    const all = document.querySelectorAll('.dlg-wrap .dlg'); const d = all[all.length - 1];
    if (value != null) { const f = d.querySelector('input, textarea.code'); if (f) f.value = value; }
    const b = d.querySelector('.' + which); if (!b) return false; b.click(); return true; }, [which, value]);
  if (!okk) throw new Error('دکمهٔ «' + which + '» در پنجرهٔ «' + d.title + '» نیست');
  await sleep(120); return d;
}
export async function closeDialogs(page, max = 8) {
  const seen = [];
  for (let i = 0; i < max; i++) { const d = await dialogs(page); if (!d.length) break; seen.push(d[d.length - 1]);
    await page.evaluate(() => { const all = document.querySelectorAll('.dlg-wrap .dlg'); const d = all[all.length - 1]; (d.querySelector('.cancel') || d.querySelector('.ok')).click(); }); await sleep(80); }
  return seen;
}

/* ---------- کارهای کاربر ---------- */
/* زدن دکمه‌ای که data-act دارد؛ extra برای انتخاب دقیق‌تر (مثلاً '[data-id="…"]') */
export async function act(page, name, extra = '') {
  const r = await page.evaluate(([name, extra]) => {
    const el = document.querySelector('[data-act="' + name + '"]' + extra); if (!el) return 'نیست';
    el.click(); return 'ok'; }, [name, extra]);
  if (r !== 'ok') throw new Error('دکمهٔ data-act="' + name + '"' + extra + ' پیدا نشد');
  await sleep(150);
}
/* نوشتن در یک خانه (input/textarea/select) و خبر دادن به برنامه */
export async function type(page, sel, value, ev = 'input') {
  const r = await page.evaluate(([sel, value, ev]) => { const el = document.querySelector(sel); if (!el) return false;
    el.value = value; el.dispatchEvent(new Event(ev, { bubbles: true })); if (ev !== 'change') el.dispatchEvent(new Event('change', { bubbles: true })); return true; }, [sel, value, ev]);
  if (!r) throw new Error('خانهٔ ' + sel + ' پیدا نشد'); await sleep(80);
}
/* دادن فایل به یک input[type=file] (نام فارسی هم کار می‌کند) */
export async function setFile(page, sel, name, content, mime = 'application/json') {
  const r = await page.evaluate(([sel, name, content, mime]) => { const el = document.querySelector(sel); if (!el) return false;
    const dt = new DataTransfer(); dt.items.add(new File([content], name, { type: mime })); el.files = dt.files;
    el.dispatchEvent(new Event('change', { bubbles: true })); return true; }, [sel, name, content, mime]);
  if (!r) throw new Error('ورودی فایل ' + sel + ' پیدا نشد'); await sleep(350);
}
export async function downloads(page, ms = 4000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { const ok = await page.evaluate(() => window.__dl.length > 0 && window.__dl.every(x => x.b64 !== null)); if (ok) break; await sleep(80); }
  return page.evaluate(() => window.__dl.map(x => ({ name: x.name, size: x.size, type: x.type, b64: x.b64 })));
}
export const clearDl = page => page.evaluate(() => { window.__dl.length = 0; window.__opened.length = 0; });
export const txt = d => Buffer.from(d.b64 || '', 'base64').toString('utf8');
export const bin = d => Buffer.from(d.b64 || '', 'base64');
export const idle = (page, ms = 250) => sleep(ms);

/* ---------- گزارش‌دهی ---------- */
export function suite(name) {
  let ok = 0, bad = 0; const fails = [];
  console.log('\n■ ' + name);
  return {
    ok(cond, label, detail) { if (cond) { ok++; if (process.env.V) console.log('   ✓ ' + label); }
      else { bad++; fails.push(label); console.log('   ✗ ' + label + (detail !== undefined ? '  ← ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 600) : '')); } return !!cond; },
    eq(a, b, label) { return this.ok(JSON.stringify(a) === JSON.stringify(b), label, { got: a, want: b }); },
    sec(t) { console.log(' ── ' + t); }, note(t) { console.log('   • ' + t); },
    done() { console.log((bad ? '✗' : '✓') + ' [' + name + '] ' + ok + ' درست، ' + bad + ' نادرست'); if (bad) process.exitCode = 1; return { ok, bad, fails }; } };
}
/* وضعیت خلاصهٔ برنامه برای مقایسه */
export const snap = page => page.evaluate(() => ({
  projects: state.projects.map(p => ({ id: p.id, name: p.name, reports: (p.visits || []).length,
    plots: (p.plots || []).map(pl => ({ id: pl.id, name: pl.name, pts: (pl.points || []).length, visits: (pl.visits || []).map(v => v.id) })) })),
  grave: { projects: ((state.grave || {}).projects || []).map(g => g.id), plots: ((state.grave || {}).plots || []).map(g => g.id) } }));
export const brief = s => s.projects.map(p => p.name + '[' + p.plots.map(pl => pl.name + ':' + pl.visits.length).join(',') + ']' + (p.reports ? '+' + p.reports + 'گ' : '')).join(' | ');
