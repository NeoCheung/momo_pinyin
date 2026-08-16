// sw.js — service worker：离线缓存
// 策略：
//   1) install 时预缓存 ASSETS(代码/CSS/HTML,小体积必备资源)
//   2) fetch 时对所有同源请求做 cache-first + 运行时按需缓存
//      → audio/pinyin/*.mp3 采用这条路径,只有用户点过的音节才落缓存,首次访问不下 30MB
//   3) 修改静态资源后 CACHE 版本 +1,重装 SW 会清旧缓存
const CACHE = "pinyin-tool-v15";
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
  "./js/mistakes.js",
  "./icons/icon-192.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    // 不再自动 skipWaiting,由页面在 controllerchange 之前显式发消息触发
    caches.open(CACHE).then((c) => c.addAll(ASSETS))
  );
});

// 接收页面消息,决定何时激活新 SW
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
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
