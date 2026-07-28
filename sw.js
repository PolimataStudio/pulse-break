// PULSE BREAK - Service Worker (v3)
const CACHE_VERSION = 'v3';
const CACHE_NAME = `pulsebreak-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Lista de assets para cache (caminhos relativos ao SW)
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './config.json',
  './manifest.json',
  './offline.html',
  './assets/icons/icon.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-256.png',
  '/assets/icons/icon-384.png',
  '/assets/icons/icon-512.png'
];

// Instalação
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache aberto v3');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
    .then(() => {
      console.log('[SW] Ativado e controlando clientes.');
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
  // Ignorar requisições para analytics
  if (event.request.url.includes('google-analytics')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Retorna do cache e atualiza em background
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME)
                  .then(cache => cache.put(event.request, clone));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        // Se não estiver em cache, busca da rede
        return fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => cache.put(event.request, clone));
            }
            return networkResponse;
          })
          .catch(() => {
            // Fallback offline para navegação
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            return new Response('Recurso indisponível offline', { status: 503 });
          });
      })
  );
});

// Mensagem para forçar atualização
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
