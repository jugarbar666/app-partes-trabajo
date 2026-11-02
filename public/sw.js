/**
 * Service Worker de PWA — Gestión de Partes de Trabajo
 * Estrategia de Caché y Ciclo de Vida:
 * - Cachea recursos estáticos de la aplicación (HTML base, JS compilado, CSS, iconos, fuentes).
 * - NUNCA cachea llamadas a API (Supabase REST/RPC), funciones de Netlify, autenticación, fotos ni datos privados.
 * - version.json NUNCA se cachea (pasa directo a la red sin interceptar).
 * - Navegación HTML (index.html): Network-First con bypass de caché HTTP ('no-store') y fallback a caché offline.
 * - Activos compilados con hash (/assets/*): Cache-First con recarga de red.
 * - Purga de versiones obsoletas al activar y atención a mensajes SKIP_WAITING y PURGE_ALL_CACHES.
 */

const SW_VERSION = '1.9.3';
const STATIC_CACHE = `roma-static-${SW_VERSION}`;
const RUNTIME_CACHE = `roma-runtime-${SW_VERSION}`;

const STATIC_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_SHELL_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (
            (key.startsWith('roma-') || key.startsWith('partes-trabajo-')) &&
            key !== STATIC_CACHE &&
            key !== RUNTIME_CACHE
          ) {
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
  if (event.data && event.data.type === 'CLAIM_CLIENTS') {
    self.clients.claim();
  }
  if (event.data && event.data.type === 'PURGE_ALL_CACHES') {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('roma-') || k.startsWith('partes-trabajo-'))
            .map((k) => caches.delete(k))
        )
      )
    );
  }
  if (event.data && event.data.type === 'CLEAR_SENSITIVE_CACHE') {
    event.waitUntil(caches.delete(RUNTIME_CACHE));
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Prohibido cachear llamadas a API, Auth, Storage, funciones o métodos distintos de GET
  // y tampoco version.json
  if (
    request.method !== 'GET' ||
    url.pathname.includes('/rest/v1/') ||
    url.pathname.includes('/auth/v1/') ||
    url.pathname.includes('/storage/v1/') ||
    url.pathname.includes('/functions/v1/') ||
    url.pathname.includes('/.netlify/functions/') ||
    url.pathname.endsWith('/version.json') ||
    url.pathname === '/version.json' ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // Navegación HTML: Network-first con fallback a index.html en caché
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put('/index.html', clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Activos compilados con hash de Vite (/assets/): Cache-first con actualización en red
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Resto de recursos propios (iconos, fuentes, manifiesto): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);
      return cachedResponse || fetchPromise;
    })
  );
});
