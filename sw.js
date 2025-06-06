// Service Worker for offline functionality
const CACHE_NAME = "birthday-wishes-v1"
const urlsToCache = [
  "/",
  "/index.html",
  "/styles.css",
  "/script.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
]

// Install event
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)))
})

// Fetch event
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      return response || fetch(event.request)
    }),
  )
})
