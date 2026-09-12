// Sube este número cada vez que cambies archivos estáticos importantes:
// obliga a todos los dispositivos (incluyendo la app instalada) a botar
// el caché viejo y pedir la versión nueva al servidor.
const CACHE_NAME = 'rifa-ganadora-v3';
const STATIC_ASSETS = [
  '/css/theme.css',
  '/js/particles.js',
  '/js/welcome.js',
  '/js/pantalla.js',
  '/js/admin-draw.js',
  '/js/admin-raffle-info.js',
  '/manifest.json',
  '/manifest-pantalla.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// IMPORTANTE: nunca cachear /api/* — participantes, boletas, sorteos y resultados
// siempre deben ir al servidor/base de datos, tal como lo requiere la plataforma.
//
// Las páginas HTML (/, /admin/login, /admin, /pantalla) van SIEMPRE primero
// a la red ("network-first"). Así, si arreglamos un bug (como el botón de
// login), el cambio llega de inmediato incluso a quienes ya instalaron la
// app — nunca vuelve a quedar atascada una versión vieja. Solo si no hay
// conexión a internet se usa la copia guardada en caché como respaldo.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    return; // dejar pasar directo a la red
  }

  const isNavigation = event.request.mode === 'navigate';

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Archivos estáticos (css/js/imágenes): caché primero, y se actualiza
  // el caché en segundo plano para la próxima vez.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
