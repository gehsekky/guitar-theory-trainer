/// <reference lib="webworker" />
// Service worker: makes the app installable and usable offline.
//
// Update strategy: the page itself is fetched network-first, so opening the
// app while online always loads the latest deploy (no "new version" reload
// mid-practice); offline, the last cached copy is used. Everything else is a
// content-hashed build asset, served cache-first from the precache.
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

const PAGES_CACHE = 'pages';

// JS, CSS, and icons from the build (the HTML is deliberately excluded).
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: PAGES_CACHE,
      // On a flaky connection, fall back to the cached page rather than hang.
      networkTimeoutSeconds: 3,
      // Revalidate past the host's HTTP cache (GitHub Pages sends max-age=600)
      // so a fresh deploy shows up immediately.
      fetchOptions: { cache: 'no-cache' },
    }),
  ),
);

self.addEventListener('install', (event) => {
  // Cache the page now, so the app works offline from the very first visit.
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.add(new Request('/', { cache: 'no-cache' }))),
  );
  // The page is already current (network-first), so a new worker can take
  // over right away without reloading anything.
  void self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
