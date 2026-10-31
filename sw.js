// 오프라인 실행용 서비스 워커: 캐시를 먼저 보여 주고 뒤에서 새 버전을 받아 둔다.
// 파일 구성을 바꾸면 VERSION 을 올린다.
const VERSION = 'sf-v4';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const FILES = [
  './',
  './index.html',
  './matter.min.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  // 글꼴은 한 번 받으면 바뀌지 않으므로 캐시 우선
  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.open(VERSION).then(async cache => {
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true });
    const fresh = fetch(req).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || fresh;
  }));
});
