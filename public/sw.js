/* Bản quyền trí tuệ thuộc về BroAmStuck */
/**
 * PHẦN 5 — Progressive Web App Service Worker
 *  5.1 Stale-While-Revalidate: trả dữ liệu từ cache NGAY LẬP TỨC, đồng thời
 *      âm thầm cập nhật bản mới nhất ở background.
 *  5.2 Background Sync: kích hoạt đồng bộ lại hàng đợi hành động (gửi câu hỏi,
 *      mua vật phẩm, trang bị...) ngay khi thiết bị có mạng trở lại.
 */

const CACHE_NAME = 'fforum-swr-cache-v2';
const SWR_PATH_PREFIXES = [
  '/assets/decorations/',
  '/assets/',
  '/media/',
  '/fonts/',
  '/favicon.svg',
  '/icons.svg',
  '/manifest.webmanifest',
  '/api/edge/catalog',
];

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('fforum-swr-cache-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const isStaleWhileRevalidateTarget = (url) => {
  if (url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com') return true;
  if (url.origin !== self.location.origin) return false;
  return SWR_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (!isStaleWhileRevalidateTarget(url)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);
      const networkFetch = fetch(request)
        .then((freshResponse) => {
          if (freshResponse && freshResponse.status === 200) {
            cache.put(request, freshResponse.clone());
          }
          return freshResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    }),
  );
});

/* 5.2 Background Sync: báo cho các tab đang mở phát lại hàng đợi offline */
self.addEventListener('sync', (event) => {
  if (event.tag === 'fforum-bg-sync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: 'FFORUM_FLUSH_BG_SYNC' });
        }
      }),
    );
  }
});
