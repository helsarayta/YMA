// Minimal service worker: caches the app shell so it opens fast / works offline.
// IMPORTANT: NEVER cache /api/* (AI answers must always be fresh).
const CACHE = "interview-ai-v1"

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/"])))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url)

  // API & non-GET: always go to the network, no caching.
  if (url.pathname.startsWith("/api/") || event.request.method !== "GET") return

  // Network-first, fallback to cache (so updates are always picked up while online).
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(event.request, copy))
        return res
      })
      .catch(() => caches.match(event.request).then((hit) => hit || caches.match("/")))
  )
})
