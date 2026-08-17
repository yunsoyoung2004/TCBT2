// Deliberately minimal: exists only so browsers consider this app
// "installable" as a PWA (Chrome's installability criteria wants an
// active service worker with a fetch handler). No caching at all -- every
// request just passes straight through to the network. This app is a
// live clinical tool; serving anything stale (a session's state, a
// worksheet value) would be a real correctness problem, so there is
// nothing here to go stale. Revisit only if genuine offline support is
// ever requested as its own feature, with its own caching strategy.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
