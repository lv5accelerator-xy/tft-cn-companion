const CACHE_PREFIX = "tft-cn-companion-";
const BUILD_CACHE = `${CACHE_PREFIX}v1.6.9-practice-loop-safety-1`;
const SHELL_CACHE = `${BUILD_CACHE}-shell`;
const DATA_CACHE = `${BUILD_CACHE}-data`;
const RUNTIME_CACHE = `${BUILD_CACHE}-runtime`;

const APP_SHELL = [
  "/", "/resume", "/opening", "/coach", "/compare", "/focus", "/review", "/review/history", "/insights", "/preferences", "/share", "/demo", "/comps", "/champions", "/items", "/traits", "/augments", "/builder", "/stats", "/tft-companion.svg", "/manifest.webmanifest",
];

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((request) => cache.delete(request)));
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all(APP_SHELL.map(async (path) => {
      try {
        const response = await fetch(path, { cache: "reload" });
        if (response.ok) await cache.put(path, response.clone());
      } catch {
        // A partial shell is still useful when one route is temporarily unavailable.
      }
    }));
    await trimCache(SHELL_CACHE, 48);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && !name.startsWith(BUILD_CACHE)).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

async function staleWhileRevalidate(event, request, cacheName, stableKey, maxEntries = 96) {
  const cache = await caches.open(cacheName);
  const key = stableKey || request;
  const cached = await cache.match(key);
  const refresh = fetch(request).then(async (response) => {
    if (response.ok || response.type === "opaque") {
      await cache.put(key, response.clone());
      await trimCache(cacheName, maxEntries);
    }
    return response;
  }).catch(() => null);
  event.waitUntil(refresh.then(() => undefined));
  if (cached) return cached;
  const response = await refresh;
  if (response) return response;
  throw new Error("offline");
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  const url = new URL(request.url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2800);
  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok) { await cache.put(url.pathname, response.clone()); await trimCache(SHELL_CACHE, 48); }
    return response;
  } catch {
    clearTimeout(timeout);
    return await cache.match(request) || await cache.match(url.pathname) || await cache.match("/") || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.cache === "no-store") return;
  const url = new URL(request.url);
  if (request.mode === "navigate") { event.respondWith(networkFirstNavigation(request)); return; }
  if (url.origin === self.location.origin && url.pathname === "/api/tft") { event.respondWith(staleWhileRevalidate(event, request, DATA_CACHE, "/api/tft", 8)); return; }
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) { event.respondWith(staleWhileRevalidate(event, request, RUNTIME_CACHE, undefined, 96)); return; }
  if (request.destination === "image") {
    const allowedRemoteImage = url.origin === self.location.origin || url.hostname === "ddragon.leagueoflegends.com" || url.hostname === "raw.communitydragon.org";
    if (allowedRemoteImage) event.respondWith(staleWhileRevalidate(event, request, RUNTIME_CACHE, undefined, 96));
  }
});
