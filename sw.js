// PULSE BREAK - Service Worker (v6 - com notificações avançadas)
const CACHE_VERSION = 'v6';
const CACHE_NAME = `pulsebreak-${CACHE_VERSION}`;
const OFFLINE_URL = './offline.html';

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
        console.log('[SW] Cache aberto v6');
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
  if (event.request.url.includes('google-analytics') || 
      event.request.url.includes('doubleclick')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
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

// --- Notificações ---
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};

  if (action === 'snooze') {
    // Adiar 5 minutos: enviar mensagem para o cliente
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          if (clientList.length > 0) {
            clientList[0].postMessage({
              type: 'SNOOZE',
              duration: 300 // 5 minutos em segundos
            });
          } else {
            // Abrir o app se não houver janela
            return clients.openWindow('/');
          }
        })
    );
    return;
  }

  if (action === 'dismiss') {
    // Ignorar: apenas fechar a notificação
    return;
  }

  // Clique normal: foca ou abre o app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.includes('/index.html') && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Fechamento de notificação (opcional)
self.addEventListener('notificationclose', event => {
  console.log('[SW] Notificação fechada:', event.notification.tag);
});

// Mensagem do cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
