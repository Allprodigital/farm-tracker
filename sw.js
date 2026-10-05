// Farm Tracker service worker: offline cache of the app shell.
const CACHE = 'farmtracker-v1.5.0';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'print.css', 'lib/photos.js', 'lib/voice.js', 'lib/reminders.js', 'lib/backup.js', 'lib/print.js', 'lib/welcome.js', 'lib/weather.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Network first (so updates show up), cache fallback when offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match('index.html'))));
});

// Tapping a service reminder focuses Farm Tracker and opens the alerts (bell) list.
self.addEventListener('notificationclick', e => {
  e.notification.close(); const url = new URL('./#/alerts', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(cs => {
    for (const c of cs) if ('focus' in c) { c.postMessage({type: 'open-alerts'}); return c.focus(); }
    return self.clients.openWindow(url); }));
});
