const CACHE_NAME = 'challenge-avril-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json'
];

// Installation du service worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache ouvert');
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

// Activation du service worker
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Interception des requêtes fetch
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Retourne la ressource en cache si elle existe
                if (response) {
                    return response;
                }
                
                // Sinon, fait une requête réseau
                return fetch(event.request)
                    .then(response => {
                        // Ne pas mettre en cache si la requête a échoué
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone la réponse
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(() => {
                        // Si la requête est pour une page, retournez la page hors ligne
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});

// Synchronisation en arrière-plan (pour les mises à jour futures)
self.addEventListener('sync', event => {
    if (event.tag === 'sync-data') {
        // Ici, vous pourriez synchroniser les données avec un serveur
        console.log('Synchronisation des données...');
    }
}); 