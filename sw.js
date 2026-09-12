/**
 * 离线缓存。
 * 应用外壳（HTML / JS / 图标）装好之后就走缓存，断网照常打开。
 * 数据不经过这里，它在 localStorage 里，Service Worker 碰不到也不会清掉。
 */
const CACHE = 'plan-app-v1';

// registration.scope 已经带上子路径，相对地址即可，不要写死根目录
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.addAll(['./', './index.html', './manifest.json']).catch(() => {})
    )
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then((hit) => {
      // 先给缓存，后台悄悄更新，这样断网能开、联网也不会一直用旧的
      const net = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
