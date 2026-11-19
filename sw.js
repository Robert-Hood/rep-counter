// Push only. No fetch handler and no caching, so the app loads exactly as before.

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  // Every push must show a notification, or Safari may revoke the subscription.
  let title = 'Reps';
  let body = 'just a wave. carry on.';
  let counterId = null;
  try {
    const data = event.data ? event.data.json() : null;
    if (data && data.title) title = data.title;
    if (data && data.body) body = data.body;
    if (data && data.counterId) counterId = data.counterId;
  } catch (e) { /* keep the defaults */ }
  event.waitUntil(self.registration.showNotification(title, { body, icon: '/icon.png', data: { counterId } }));
});

// Opens the app on the notification's activity card: an open window is told
// which card to show, otherwise the app starts with ?c=<id>.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const counterId = event.notification.data && event.notification.data.counterId;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if ('focus' in w) {
        if (counterId) w.postMessage({ type: 'open-counter', id: counterId });
        return w.focus();
      }
    }
    return self.clients.openWindow(counterId ? '/?c=' + encodeURIComponent(counterId) : '/');
  })());
});
