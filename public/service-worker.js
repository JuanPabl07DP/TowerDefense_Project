const CACHE_NAME = 'tower-defense-cache-v1';

// Lista de assets para pre-cachear
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/main.js',
    '/styles.css',

    // Assets del juego
    '/assets/grass.jpg',
    '/assets/path.png',
    '/assets/camino.png',
    '/assets/puerta.jpeg',
    '/assets/tower.png',
    '/assets/tower_sniper.png',
    '/assets/tower_rapid.png',
    '/assets/projectile.png',
    '/assets/projectile_sniper.gif',
    '/assets/enemy.gif',
    '/assets/miniogro.gif',
    '/assets/GIF.gif',
    '/assets/mountro.gif',
    '/assets/enemy_strong.gif',
    '/assets/enemy_fast.gif',
    '/assets/water.jpg',
    '/assets/arbol.png',
    '/assets/tree.png',
    '/assets/roca.png',
    '/assets/rock.png',
    '/assets/casa.png',
    '/assets/bush.png',
    '/assets/coin.png',
    '/assets/guardia.png',
    '/assets/guardia2.png',
    '/assets/fondoguerra.jpg',
    '/assets/fin.jpeg',
    '/assets/login.jpeg',
    '/assets/inicio2.jpeg',
    '/assets/salas.jpeg',
    '/assets/sala.jpeg',
    '/assets/ajustes.jpeg',
    '/assets/pinky_cerebro.jpeg',
    '/assets/jugador1.jpeg',
    '/assets/jugador2.jpeg',
    '/assets/logo.jpeg',
    '/assets/musicaDeFondo.m4a',

    // Incluir las escenas y clases principales
    '/scenes/GameScene.js',
    '/scenes/MenuScene.js',
    '/scenes/LoginScene.js',
    '/scenes/CreditsScene.js',
    '/scenes/MusicScene.js',
    '/scenes/SettingsScene.js',
    '/scenes/LobbyScene.js',
    '/scenes/RoomCreationScene.js',
    '/scenes/JoinRoomScene.js',
    '/scenes/ConfirmationScene.js',
    '/scenes/RegisterScene.js',

    // Clases del juego
    '/classes/Enemy.js',
    '/classes/Map.js',
    '/classes/Tower.js',
    '/classes/Projectile.js',
    '/classes/CurrencyManager.js',
    '/classes/Decorations.js',
    '/classes/EnemyManager.js',

    // Servicios
    '/services/socketService.js',
    '/services/authService.js'
];

// Instalar el Service Worker y cachear assets principales
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Instalando...');

    // Esperar hasta que la caché esté lista
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Precacheando archivos');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                // Forzar al Service Worker a activarse inmediatamente
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[Service Worker] Error de precaché:', error);
            })
    );
});

// Activar el Service Worker y limpiar cachés antiguas
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activando...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                // Eliminar cachés antiguas
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[Service Worker] Eliminando caché antigua:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                // Tomar control inmediatamente de todas las pestañas abiertas
                return self.clients.claim();
            })
    );
});

// Estrategia de caché: Network-first para API/Socket.io, Cache-first para assets
self.addEventListener('fetch', (event) => {
    // No interceptar peticiones a la API o Socket.io
    if (event.request.url.includes('/socket.io/') ||
        event.request.url.includes('/auth/') ||
        event.request.url.includes('/api/')) {
        return;
    }

    // Estrategia para assets estáticos
    if (event.request.url.match(/\.(png|jpg|jpeg|gif|svg|css|js|woff|woff2|ico|mp3|wav|m4a)$/) ||
        event.request.mode === 'navigate') {

        event.respondWith(
            // Primero intentar desde la caché
            caches.match(event.request)
                .then((cachedResponse) => {
                    // Si está en caché, devolverlo directamente
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    // Si no está en caché, obtener de la red
                    return fetch(event.request)
                        .then((networkResponse) => {
                            // Verificar que la respuesta sea válida
                            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                                return networkResponse;
                            }

                            // Clonar la respuesta para poder almacenarla en caché
                            const responseToCache = networkResponse.clone();

                            // Almacenar en caché para futuras visitas
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseToCache);
                                })
                                .catch(error => {
                                    console.error('[Service Worker] Error al cachear:', error);
                                });

                            return networkResponse;
                        })
                        .catch((error) => {
                            console.error('[Service Worker] Error de fetch:', error);

                            // Si la petición es a un documento HTML (navegación), intentar mostrar offline.html
                            if (event.request.mode === 'navigate') {
                                return caches.match('/');
                            }

                            return new Response('No disponible sin conexión', {
                                status: 503,
                                statusText: 'Servicio no disponible'
                            });
                        });
                })
        );
    }
});

// Evento para mensajes del cliente
self.addEventListener('message', (event) => {
    // Verificar que el mensaje proviene de un origen confiable
    const trustedOrigins = [
        location.origin,
        'https://tudominio.com'     // Reemplaza con tu dominio en producción
    ];

    // Comprobar si el origen del mensaje está en la lista de orígenes confiables
    if (!trustedOrigins.includes(event.origin)) {
        console.warn('[Service Worker] Mensaje recibido de origen no confiable:', event.origin);
        return; // Ignorar mensajes de orígenes no confiables
    }

    // Procesar mensajes verificados
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }

    // Implementar actualización de caché si se recibe el mensaje adecuado
    if (event.data && event.data.type === 'CACHE_ASSETS') {
        const assets = event.data.assets || [];

        if (assets.length > 0) {
            caches.open(CACHE_NAME)
                .then((cache) => {
                    console.log('[Service Worker] Cacheando assets adicionales:', assets);
                    return cache.addAll(assets);
                })
                .catch(error => {
                    console.error('[Service Worker] Error al cachear assets adicionales:', error);
                });
        }
    }
});