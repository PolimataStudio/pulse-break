// PULSE BREAK - Service Worker (v5)
const CACHE_VERSION = 'v5';
const CACHE_NAME = `pulsebreak-${CACHE_VERSION}`;
const OFFLINE_URL = './offline.html';

// Apenas recursos que com certeza existem
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './config.json',
  './manifest.json',
  './offline.html',
  './assets/icons/icon.svg'
];

// Instalação
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache aberto v5');
        // Adiciona os assets principais, ignorando falhas individuais
        return Promise.allSettled(
          ASSETS.map(url => cache.add(url).catch(err => {
            console.warn('[SW] Falha ao cachear:', url, err);
          }))
        );
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

// Interceptação
self.addEventListener('fetch', event => {
  // Ignorar analytics e outras requisições externas indesejadas
  if (event.request.url.includes('google-analytics') || 
      event.request.url.includes('doubleclick')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Atualiza em background (stale-while-revalidate)
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
