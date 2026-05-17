/* Service Worker de Nuvia: recibe Web Push y muestra notificaciones del SO. */

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// Recibe el push y muestra la notificación
self.addEventListener('push', (event) => {
  let payload = { title: 'Nuvia', body: '' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (e) {
    if (event.data) payload.body = event.data.text();
  }

  const options = {
    body: payload.body || '',
    icon: '/logo.png',
    badge: '/logo.png',
    data: payload.data || {},
    vibrate: [120, 60, 120],
  };
  event.waitUntil(self.registration.showNotification(payload.title || 'Nuvia', options));
});

// Al pulsar la notificación, abrir o enfocar la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = '/';
  if (data.tipo === 'chat')              url = '/pareja';
  else if (data.tipo === 'foro_respuesta') url = '/comunidad';
  else if (data.tipo === 'foro_eliminacion' || data.tipo === 'foro_bane') url = '/comunidad';

  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) { c.navigate(url); return c.focus(); }
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});
