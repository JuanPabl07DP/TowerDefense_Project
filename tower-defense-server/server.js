const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Almacenamiento de salas activas y estado del juego por sala
const rooms = {};

// Configuración de oleadas (compartida por todas las salas)
const oleadasConfig = [
    { cantidad: 5, delay: 2000, espera: 10000 },
    { cantidad: 8, delay: 2000, espera: 12000 },
    { cantidad: 12, delay: 2000, espera: 15000 },
    { cantidad: 15, delay: 2000, espera: 0 }
];

// Función para inicializar el estado del juego para una sala
function initializeGameState() {
    return {
        torres: [],
        enemigos: [],
        monedas: 100,
        oleadaActual: 1,
        enemigosRestantes: 0,
        enOleada: false,
        primeraConexion: true
    };
}

// Función para generar la ruta de un enemigo
function generatePath(roomCode) {
    // Definir el camino basado en tus casillas de tipo 0 (camino)
    const pathCoords = [
        { row: 0, col: 12 },   // Punto de entrada
        { row: 2, col: 12 },
        { row: 2, col: 10 },
        { row: 4, col: 8 },
        { row: 8, col: 8 },
        { row: 8, col: 16 },
        { row: 11, col: 16 },
        { row: 11, col: 20 },
        { row: 13, col: 23 },
        { row: 15, col: 23 }   // Base
    ];

    const tileSize = 60; // Tamaño base de casillas

    // Convertir a coordenadas en píxeles, centradas en la casilla
    return pathCoords.map(point => ({
        x: point.col * tileSize + (tileSize / 2),
        y: point.row * tileSize + (tileSize / 2)
    }));
}

// Función para iniciar oleada en una sala específica
function iniciarOleada(io, roomCode, oleadaIndex) {
    if (oleadaIndex >= oleadasConfig.length) return;

    const config = oleadasConfig[oleadaIndex];
    const gameState = rooms[roomCode].gameState;

    // Asignar oleadaActual como oleadaIndex + 1 para que comience en 1
    gameState.oleadaActual = oleadaIndex + 1;
    gameState.enemigosRestantes = config.cantidad;
    gameState.enOleada = true;

    // Notificar nueva oleada solo a la sala
    io.to(roomCode).emit('nueva-oleada', gameState.oleadaActual);
    io.to(roomCode).emit('enemigos-restantes', gameState.enemigosRestantes);

    // Generar enemigos
    const intervaloEnemigos = setInterval(() => {
        if (gameState.enemigosRestantes > 0) {
            const nuevoEnemigo = {
                id: Date.now() + Math.floor(Math.random() * 1000), // ID único
                oleada: gameState.oleadaActual,
                path: generatePath(roomCode),
                currentPoint: 0,
                x: generatePath(roomCode)[0].x,
                y: generatePath(roomCode)[0].y
            };

            gameState.enemigos.push(nuevoEnemigo);
            io.to(roomCode).emit('nuevo-enemigo', nuevoEnemigo);
            gameState.enemigosRestantes--;

            io.to(roomCode).emit('enemigos-restantes', gameState.enemigosRestantes);
        } else {
            clearInterval(intervaloEnemigos);
            gameState.enOleada = false;

            // Iniciar temporizador para siguiente oleada
            let segundosRestantes = config.espera / 1000;
            io.to(roomCode).emit('temporizador-oleada', segundosRestantes);

            const intervalo = setInterval(() => {
                segundosRestantes--;
                io.to(roomCode).emit('temporizador-oleada', segundosRestantes);

                if (segundosRestantes <= 0) {
                    clearInterval(intervalo);
                    iniciarOleada(io, roomCode, oleadaIndex + 1);
                }
            }, 1000);
        }
    }, config.delay);
}

// Función para actualizar y sincronizar las posiciones de los enemigos
function updateEnemyPositions() {
    for (const roomCode in rooms) {
        const room = rooms[roomCode];
        if (room.status !== 'playing') continue;

        // Para cada enemigo en la sala, actualiza su posición
        room.gameState.enemigos.forEach(enemigo => {
            // Sólo si hay puntos restantes en la ruta
            if (enemigo.currentPoint < enemigo.path.length - 1) {
                const nextPoint = enemigo.path[enemigo.currentPoint + 1];
                const speed = 2; // Velocidad fija en el servidor

                // Calcula nueva posición
                const dx = nextPoint.x - enemigo.x;
                const dy = nextPoint.y - enemigo.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > speed) {
                    enemigo.x += (dx / distance) * speed;
                    enemigo.y += (dy / distance) * speed;
                } else {
                    enemigo.x = nextPoint.x;
                    enemigo.y = nextPoint.y;
                    enemigo.currentPoint++;
                }

                // Enviar la posición actualizada a todos los clientes
                io.to(roomCode).emit('update-enemy-position', {
                    id: enemigo.id,
                    x: enemigo.x,
                    y: enemigo.y,
                    currentPoint: enemigo.currentPoint
                });
            } else if (enemigo.currentPoint === enemigo.path.length - 1) {
                // El enemigo ha llegado al final del camino (base)
                room.gameState.enemigos = room.gameState.enemigos.filter(e => e.id !== enemigo.id);
                io.to(roomCode).emit('enemigo-reached-base', enemigo.id);
            }
        });
    }
}

// Iniciar el bucle de actualización (30 fps)
setInterval(updateEnemyPositions, 1000 / 30);

io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado:', socket.id);

    // Crear una sala
    socket.on('createRoom', () => {
        let roomCode;
        do {
            roomCode = generateRoomCode();
        } while (rooms[roomCode]);

        // Crear la sala con estado del juego inicializado
        rooms[roomCode] = {
            id: roomCode,
            players: [{ id: socket.id, ready: true }],
            status: 'waiting',
            gameState: initializeGameState()
        };

        socket.roomCode = roomCode;
        socket.join(roomCode);

        // Enviar confirmación al creador con el estado inicial
        socket.emit('roomCreated', {
            roomCode,
            playerId: socket.id,
            gameState: rooms[roomCode].gameState
        });

        console.log(`Sala creada: ${roomCode}`);
    });

    // Unirse a una sala
    socket.on('joinRoom', ({ roomCode }) => {
        if (!rooms[roomCode]) {
            socket.emit('joinError', { message: 'La sala no existe' });
            return;
        }

        if (rooms[roomCode].players.length >= 2) {
            socket.emit('joinError', { message: 'La sala está llena' });
            return;
        }

        // Añadir jugador a la sala
        rooms[roomCode].players.push({ id: socket.id, ready: true });
        socket.roomCode = roomCode;
        socket.join(roomCode);

        // Asegurar que ambos jugadores están marcados como listos
        rooms[roomCode].players.forEach(player => {
            player.ready = true;
        });

        // Notificar a todos en la sala con los datos actualizados
        io.to(roomCode).emit('playerJoined', {
            roomCode,
            players: rooms[roomCode].players,
            gameState: rooms[roomCode].gameState
        });

        console.log(`Jugador unido a sala: ${roomCode}`);

        // Si ahora hay 2 jugadores, iniciar el juego automáticamente
        if (rooms[roomCode].players.length === 2) {
            setTimeout(() => {
                rooms[roomCode].status = 'playing';
                io.to(roomCode).emit('gameStarted', { roomCode });

                // Iniciar la primera oleada si es la primera conexión
                if (rooms[roomCode].gameState.primeraConexion && !rooms[roomCode].gameState.enOleada) {
                    rooms[roomCode].gameState.primeraConexion = false;
                    iniciarOleada(io, roomCode, 0);
                }

                console.log(`Juego iniciado automáticamente en sala: ${roomCode}`);
            }, 3000);
        }
    });

    // Nuevo evento para abandonar sala explícitamente
    socket.on('leaveRoom', ({ roomCode }) => {
        if (roomCode && rooms[roomCode]) {
            const playerIndex = rooms[roomCode].players.findIndex(p => p.id === socket.id);

            if (playerIndex !== -1) {
                // Eliminar al jugador de la sala
                rooms[roomCode].players.splice(playerIndex, 1);

                // Notificar a todos en la sala que el jugador se fue
                io.to(roomCode).emit('playerLeft', {
                    playerId: socket.id,
                    playerIndex: playerIndex
                });

                // Hacer que el socket abandone la sala
                socket.leave(roomCode);

                // Eliminar la referencia de la sala en el socket
                socket.roomCode = null;

                console.log(`Jugador ${socket.id} abandonó voluntariamente la sala ${roomCode}`);

                // Si la sala está vacía, eliminarla
                if (rooms[roomCode].players.length === 0) {
                    delete rooms[roomCode];
                    console.log(`Sala eliminada: ${roomCode}`);
                }
            }
        }
    });

    // Eventos del juego (solo procesar si están en una sala)
    socket.on('colocar-torre', (data) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !rooms[roomCode]) return;

        const { x, y, tipo } = data;
        rooms[roomCode].gameState.torres.push({ x, y, tipo });
        io.to(roomCode).emit('torre-colocada', { x, y, tipo });
    });

    socket.on('disparar-proyectil', (data) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !rooms[roomCode]) return;

        const { x, y, targetId } = data;
        io.to(roomCode).emit('proyectil-disparado', { x, y, targetId });
    });

    socket.on('eliminar-enemigo', (enemigoId) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !rooms[roomCode]) return;

        rooms[roomCode].gameState.enemigos = rooms[roomCode].gameState.enemigos.filter(e => e.id !== enemigoId);
        io.to(roomCode).emit('enemigo-eliminado', enemigoId);
    });

    socket.on('gastar-monedas', (cantidad) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !rooms[roomCode]) return;

        if (rooms[roomCode].gameState.monedas >= cantidad) {
            rooms[roomCode].gameState.monedas -= cantidad;
            io.to(roomCode).emit('actualizar-monedas', rooms[roomCode].gameState.monedas);
        }
    });

    socket.on('agregar-monedas', (cantidad) => {
        const roomCode = socket.roomCode;
        if (!roomCode || !rooms[roomCode]) return;

        rooms[roomCode].gameState.monedas += cantidad;
        io.to(roomCode).emit('actualizar-monedas', rooms[roomCode].gameState.monedas);
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
        const roomCode = socket.roomCode;
        console.log(`Cliente desconectado: ${socket.id}, sala: ${roomCode}`);

        if (roomCode && rooms[roomCode]) {
            const playerIndex = rooms[roomCode].players.findIndex(p => p.id === socket.id);

            if (playerIndex !== -1) {
                rooms[roomCode].players.splice(playerIndex, 1);
                io.to(roomCode).emit('playerLeft', {
                    playerId: socket.id,
                    playerIndex: playerIndex
                });

                console.log(`Jugador ${socket.id} eliminado de sala ${roomCode}`);

                if (rooms[roomCode].players.length === 0) {
                    delete rooms[roomCode];
                    console.log(`Sala eliminada: ${roomCode}`);
                }
            }
        }
    });
});

// Función para generar código de sala
function generateRoomCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});