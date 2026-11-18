/* Service Worker — دفترچهٔ مختصات قطعات
   هدف: باز شدن برنامه بدون اینترنت. کاشی‌های نقشه در IndexedDB خود برنامه ذخیره می‌شوند.
   نام کش (CACHE) با هر نسخهٔ برنامه عوض می‌شود تا فایل‌های نسخهٔ قبلی کنار بروند. */
const CACHE = 'seedcoord-v2.6.2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('message', (e) => {
  const d = (e.data && e.data.type) || e.data;
  if (d === 'SKIP_WAITING' || d === 'skipWaiting') self.skipWaiting();
  if (d === 'CLEAR_CACHE' || d === 'clear') {
    e.waitUntil ? null : null;
    caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))));
  }
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // درخواست‌های کاشی/نقشه (دامنهٔ دیگر) را دست نزن — خود برنامه در IndexedDB نگه می‌دارد
  if (url.origin !== location.origin) return;

  // صفحهٔ اصلی: همیشه اول شبکه و بدون کش مرورگر (تا با یک رفرش نسخهٔ تازه بیاید)
  // هر صفحهٔ برنامه (index.html یا demo.html): اول شبکه — همیشه تازه؛ بعد کش
  // (قبلاً demo.html از کش می‌آمد و نسخهٔ قدیمی روی صفحه می‌ماند)
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const isIndex = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
      try {
        const fresh = await fetch(new Request(req.url, { cache: 'no-store', credentials: 'same-origin' }));
        if (!fresh.ok) {
          // سرور صفحهٔ خطا داد (مثلاً خطای موقت): صفحهٔ خطا ذخیره نمی‌شود؛ اگر نسخهٔ سالمی در حافظه هست همان باز می‌شود
          const kept = (await caches.match(req)) || (isIndex ? (await caches.match('./index.html')) : null);
          return kept || fresh;
        }
        const c = await caches.open(CACHE);
        if (isIndex) c.put('./index.html', fresh.clone()).catch(() => {});
        else c.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch (err) {
        const hit = await caches.match(req);
        if (hit) return hit;
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  // درخواست‌هایی که «?…» دارند (مثل «بررسی به‌روزرسانی») همیشه از شبکه می‌آیند و در حافظه نمی‌مانند.
  // پیش‌تر هر بار بررسی، یک رونوشت کامل برنامه در حافظه می‌ماند و حافظهٔ دستگاه کم‌کم پر می‌شد.
  if (url.search) return;

  // بقیهٔ فایل‌های خودمان: اول کش، بعد شبکه
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r && r.ok) {                       // پاسخِ خطا در حافظه نمی‌ماند
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return r;
    }).catch(() => hit))
  );
});
