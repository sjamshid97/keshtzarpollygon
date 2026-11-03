/* Service Worker — دفترچهٔ مختصات قطعات (نسخه 1.10.0)
   هدف: باز شدن برنامه بدون اینترنت. کاشی‌های نقشه در IndexedDB خود برنامه ذخیره می‌شوند. */
const CACHE = 'seedcoord-v1.10.0';
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
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(new Request(req.url, { cache: 'no-store', credentials: 'same-origin' }))
        .then(r => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
          return r;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // بقیهٔ فایل‌های خودمان: اول کش، بعد شبکه
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return r;
    }).catch(() => hit))
  );
});
