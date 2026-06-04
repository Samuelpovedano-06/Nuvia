const CACHE = 'nuvia-game-v1';

const ASSETS = [
  '/juego/sala.png',
  '/juego/dormitorio.png',
  '/juego/bano.png',
  '/juego/compresa.png',
  '/juego/mascota-idle.png',
  '/juego/mascota-jump.png',
  '/juego/mascota-caida.png',
  '/juego/por_saltar.png',
  '/juego/caratula-esquiva.png',
  '/juego/Sky_Jump/fondo_plantas.png',
  '/juego/Sky_Jump/fondo_nubes.png',
  '/juego/Sky_Jump/fondo_nubes_1.png',
  '/juego/Sky_Jump/fondo_nubes_2.png',
  '/juego/Sky_Jump/fondo_nubes_portal.png',
  '/juego/Sky_Jump/fondo_nubes_portal_arriba.png',
  '/juego/Sky_Jump/plataforma.png',
  '/juego/Sky_Jump/plataforma_portal.png',
  '/juego/Sky_Jump/nube.png',
  '/juego/Sky_Jump/estrella.png',
  '/juego/Sky_Jump/flor.png',
  '/juego/Sky_Jump/portal.png',
  '/juego/Sky_Jump/enemigo.png',
];

// Al instalar: cachear todos los assets del juego
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Limpiar caches viejas
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// En cada petición de imagen del juego: servir desde cache, actualizar en background
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (!url.pathname.startsWith('/juego/')) return;

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request);
      const networkFetch = fetch(e.request).then((res) => {
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(() => null);
      return cached || networkFetch;
    })
  );
});
