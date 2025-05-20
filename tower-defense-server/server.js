require('dotenv').config(); // Cargar variables de entorno
const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
// Importar el módulo de Audit Trail
const { initializeAuditTrail, scheduleMigration } = require('./services/auditTrail');

// Crear servidor HTTP
const server = http.createServer(app);

// Variable global para el cliente Redis (para compartirlo con el Audit Trail)
let globalRedisClient;

// Configuración de Redis y Socket.io
async function initSocketIO() {
    try {
        // Configuración de Redis
        const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

        // Crear clientes Redis para publicación/suscripción
        const pubClient = createClient({ url: REDIS_URL });
        const subClient = pubClient.duplicate();

        // Manejar errores de conexión Redis
        pubClient.on('error', (err) => {
            console.error('Redis Client Error (pub):', err);
        });

        subClient.on('error', (err) => {
            console.error('Redis Client Error (sub):', err);
        });

        // Conectar a Redis
        await pubClient.connect();
        await subClient.connect();

        console.log('Conectado a Redis correctamente');

        // Crear cliente Redis para almacenamiento de datos
        const redisClient = createClient({ url: REDIS_URL });
        await redisClient.connect();

        // Guardar referencia global al cliente Redis
        globalRedisClient = redisClient;

        // Inicializar Socket.io con adaptador Redis
        const io = new Server(server, {
            cors: {
                origin: process.env.NODE_ENV === 'production' ? '*' : 'http://localhost:5173',
                methods: ["GET", "POST"],
                credentials: true
            }
        });

        // Configurar el adaptador de Redis
        io.adapter(createAdapter(pubClient, subClient));

        // Inicializar los managers
        const { initializeRoomManager } = require('./sockets/roomManager');
        const { initializeGameManager } = require('./sockets/gameManager');
        const { handleSocketEvents } = require('./sockets/events');

        // Pasar el cliente Redis a los managers
        const roomManager = initializeRoomManager(io, redisClient);
        const gameManager = initializeGameManager(io, roomManager, redisClient);

        // Configurar los eventos de Socket.io
        handleSocketEvents(io, roomManager, gameManager);

        console.log('Socket.io configurado con adaptador Redis');

        return io;
    } catch (error) {
        console.error('Error al inicializar Socket.io con Redis:', error);
        throw error;
    }
}

// Iniciar servidor
async function startServer() {
    try {
        // Inicializar Socket.io con Redis
        await initSocketIO();

        // Inicializar el Audit Trail con el cliente Redis existente
        initializeAuditTrail(globalRedisClient);

        // Programar migración a PostgreSQL cada 5 minutos
        scheduleMigration(1);

        // Registrar inicio del servidor en el audit trail
        const { logEvent } = require('./services/auditTrail');
        logEvent({
            userId: 'system',
            ip: '127.0.0.1',
            operation: 'server:start',
            details: {
                version: process.env.npm_package_version || '1.0.0',
                nodeEnv: process.env.NODE_ENV || 'development',
                port: process.env.PORT || 4000
            }
        });

        // Obtener puerto de variables de entorno o argumento de línea de comandos
        const PORT = process.argv[2] || process.env.PORT || 4000;

        // Iniciar servidor HTTP
        server.listen(PORT, () => {
            console.log(`
======================================================
Servidor Tower Defense ejecutándose
URL: http://localhost:${PORT}
Modo: ${process.env.NODE_ENV || 'development'}
Audit Trail: Activado (migración cada 5 minutos)
======================================================
           `);
        });

        // Manejar señales de cierre
        process.on('SIGTERM', gracefulShutdown);
        process.on('SIGINT', gracefulShutdown);

        // Función para cierre controlado
        async function gracefulShutdown() {
            console.log('Cerrando servidor...');

            // Registrar apagado del servidor
            try {
                await logEvent({
                    userId: 'system',
                    ip: '127.0.0.1',
                    operation: 'server:shutdown',
                    details: {
                        reason: 'graceful_shutdown',
                        uptime: process.uptime()
                    }
                });

                // Migrar eventos pendientes antes de cerrar
                const { migrateEventsToPostgres } = require('./services/auditTrail');
                await migrateEventsToPostgres();

                console.log('Servidor cerrado correctamente');
            } catch (error) {
                console.error('Error durante el cierre del servidor:', error);
            } finally {
                // Cerrar servidor y proceso
                server.close(() => {
                    process.exit(0);
                });
            }
        }
    } catch (error) {
        console.error('Error fatal al iniciar servidor:', error);
        process.exit(1);
    }
}

// Iniciar todo
startServer();