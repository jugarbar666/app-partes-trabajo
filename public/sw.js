/**
 * Service Worker de PWA — Gestión de Partes de Trabajo
 * Estrategia explícita:
 * - Cachea únicamente recursos estáticos de la aplicación (HTML base, JS, CSS, iconos).
 * - NUNCA cachea respuestas de API (Supabase REST/RPC), fotografías privadas, firmas ni datos personales.
 * - Actualización controlada mediante mensaje SKIP_WAITING solicitado explícitamente por el usuario
 *   para no provocar recargas inesperadas ni pérdidas de formularios en edición.
 */

const CACHE_NAME = 'partes-trabajo-static-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // No ejecutamos self.skipWaiting() automáticamente para no interrumpir formularios abiertos
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return undefined;
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CLEAR_SENSITIVE_CACHE') {
    // Limpieza adicional solicitada al cerrar sesión o cambiar de usuario
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve()))
        )
      )
    );
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Prohibido cachear llamadas a API, Auth, Storage, funciones o métodos distintos de GET
  if (
    request.method !== 'GET' ||
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/auth/v1/') ||
    url.pathname.includes('/storage/v1/') ||
    url.pathname.includes('/functions/v1/') ||
    url.pathname.includes('/.netlify/functions/') ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Navegación HTML: Network-first con fallback a index.html en caché
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Activos estáticos propios (JS, CSS, SVG): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);
      return cachedResponse || fetchPromise;
    })
  );
});
