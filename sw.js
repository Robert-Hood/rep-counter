// Push only. No fetch handler and no caching, so the app loads exactly as before.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  // Every push must show a notification, or Safari may revoke the subscription.
  let title = '100 things';
  let body = 'just a wave. carry on.';
  try {
    const data = event.data ? event.data.json() : null;
    if (data && data.title) title = data.title;
    if (data && data.body) body = data.body;
  } catch (e) { /* keep the defaults */ }
  event.waitUntil(self.registration.showNotification(title, { body, icon: '/icon.png' }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) { if ('focus' in w) return w.focus(); }
    return self.clients.openWindow('/');
  })());
});
