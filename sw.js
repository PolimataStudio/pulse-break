// PULSE BREAK - Service Worker (v2)
const CACHE_VERSION = 'v2';
const CACHE_NAME = `pulsebreak-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/config.json',
  '/manifest.json',
  '/offline.html',
  '/assets/icons/icon.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-256.png',
  '/assets/icons/icon-384.png',
  '/assets/icons/icon-512.png'
];

// Fontes do Google (para cache offline)
const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;600;700&display=swap',
  'https://fonts.gstatic.com/s/bebasneue/v14/JTUSjIg69CK48gW7PXoo9Wlhyw.woff2',
  'https://fonts.gstatic.com/s/orbitron/v31/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1nyGy6BoWgz.woff2',
  'https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2'
];

// Instalação: cache dos assets principais e fontes
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache aberto v2');
        return cache.addAll([...ASSETS, ...FONT_URLS]);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação: limpeza de caches antigos e claim
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
    .then(() => self.clients.claim())
  );
});

// Interceptação de requisições: estratégia "stale-while-revalidate" com fallback offline
self.addEventListener('fetch', event => {
  // Ignorar requisições para analytics ou outros externos que não queremos cache
  if (event.request.url.includes('google-analytics') || event.request.url.includes('doubleclick')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Se encontrou no cache, retorna e atualiza em background
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Atualiza o cache com a resposta da rede (se for bem-sucedida)
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseClone);
                });
            }
            return networkResponse;
          })
          .catch(() => {
            // Se falhar e for uma requisição de navegação, retorna offline.html
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            // Para outros recursos, pode retornar um placeholder ou undefined
            return new Response('Recurso indisponível offline', { status: 503 });
          });

        // Retorna do cache ou da rede (se cache não tiver)
        return cachedResponse || fetchPromise;
      })
  );
});

// Sincronização em segundo plano (opcional)
self.addEventListener('sync', event => {
  if (event.tag === 'pulse-break-sync') {
    event.waitUntil(Promise.resolve());
  }
});

// Push notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'PULSE BREAK';
  const options = {
    body: data.body || 'Hora de levantar!',
    icon: 'assets/icons/icon-192.png',
    badge: 'assets/icons/icon-192.png',
    vibrate: [200, 100, 200],
    data: data.url || '/'
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Clique na notificação
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data || '/')
  );
});

// Mensagem do cliente para forçar atualização
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});