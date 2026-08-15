// sw.js — service worker：离线缓存
// 策略：cache-first（优先缓存）+ 版本号控制。
// 重要：修改任何静态资源后，务必把 CACHE 版本号 +1（如 v1 → v2），
// 这样部署后 service worker 重新安装会清掉旧缓存并拉取新资源。
const CACHE = "pinyin-tool-v3";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/pinyin-data.js",
  "./js/tts.js",
  "./js/app.js",
  "./js/learn.js",
  "./js/practice.js",
  "./js/checkin.js",
  "./js/parents.js",
  "./icons/icon-192.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((resp) => {
        // 缓存同源资源
        if (resp.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = resp.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
