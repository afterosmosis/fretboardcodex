/* fretboard codex — service worker
 * Strategy:
 *   - Precache the app shell on install so the site boots offline.
 *   - HTML: network-first (so deploys land fast), cache fallback when offline.
 *   - Same-origin JS/CSS/JSX: stale-while-revalidate (instant load, refresh in background).
 *   - CDN deps (React, Babel, Tonal, Google Fonts): stale-while-revalidate in a runtime cache.
 *   - Icons / images: cache-first.
 *
 * Bump CACHE_VERSION whenever the precache list or strategy changes; old caches are pruned.
 */

const CACHE_VERSION = "v9";
const SHELL_CACHE   = `fretboard-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `fretboard-runtime-${CACHE_VERSION}`;

// App shell — everything the page needs to render its first frame.
// Keep paths relative so the SW scope works on subpath deploys (GH Pages etc.).
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./foundation.css",
  "./theory.js",
  "./tweaks-panel.jsx",
  "./collapsible.jsx",
  "./fretboard.jsx",
  "./voicings.jsx",
  "./circle.jsx",
  "./interchange.jsx",
  "./practice.jsx",
  "./foundation.jsx",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Use { cache: "reload" } so install always picks up fresh bytes, not the HTTP cache.
      cache.addAll(SHELL_ASSETS.map((u) => new Request(u, { cache: "reload" })))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
        .map((k) => caches.delete(k))
    );
    // Enable navigation preload where supported — speeds up first navigation after activate.
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (_) {}
    }
    await self.clients.claim();
  })());
});

// Allow the page to trigger an immediate update (used by the "new version" prompt).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

const CDN_HOSTS = new Set([
  "unpkg.com",
  "cdn.jsdelivr.net",
  "fonts.googleapis.com",
  "fonts.gstatic.com"
]);

function isHTML(request) {
  if (request.mode === "navigate") return true;
  const accept = request.headers.get("accept") || "";
  return accept.includes("text/html");
}

function isImage(request, url) {
  if (request.destination === "image") return true;
  return /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname);
}

function isShellAsset(url) {
  return /\.(css|js|jsx|json|webmanifest)$/i.test(url.pathname);
}

async function networkFirst(request, cacheName, preloadPromise) {
  const cache = await caches.open(cacheName);
  try {
    const preload = preloadPromise ? await preloadPromise : null;
    const fresh = preload || await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (_) {
    const cached = await cache.match(request) || await cache.match("./index.html") || await cache.match("./");
    if (cached) return cached;
    throw _;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((res) => {
    if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone());
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Don't intercept the SW file itself or chrome-extension URLs.
  if (url.pathname.endsWith("/service-worker.js")) return;
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  // Navigations / HTML — network-first so users get fresh deploys.
  if (isHTML(request)) {
    event.respondWith(networkFirst(request, SHELL_CACHE, event.preloadResponse));
    return;
  }

  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    if (isShellAsset(url)) {
      event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
      return;
    }
    if (isImage(request, url)) {
      event.respondWith(cacheFirst(request, RUNTIME_CACHE));
      return;
    }
    // Fallthrough: SWR for any other same-origin GET.
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // Cross-origin CDN deps — SWR in runtime cache.
  if (CDN_HOSTS.has(url.host)) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // Anything else: let the network handle it.
});
