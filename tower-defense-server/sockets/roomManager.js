const { logEvent } = require('../services/auditTrail');

function initializeRoomManager(io, redisClient) {
    async function generateRoomCode() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    async function createRoom(socket) {
        // Obtener información del cliente
        const clientIP = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
        const userId = socket.handshake.auth.userId || socket.id;

        // Generar código único
        let roomCode;
        let exists = false;
        let attempts = 0;

        try {
            do {
                attempts++;
                roomCode = await generateRoomCode();
                console.log(`Generando código de sala [intento ${attempts}]: ${roomCode}`);

                // Verificar si existe en Redis
                exists = await redisClient.exists(`room:${roomCode}`);

                if (attempts > 10) {
                    throw new Error('No se pudo generar un código único después de 10 intentos');
                }
            } while (exists);

            // Crear la sala en Redis
            await redisClient.hSet(`room:${roomCode}`, 'status', 'waiting');
            await redisClient.hSet(`room:${roomCode}`, 'players', JSON.stringify([{ id: socket.id, ready: true }]));

            // Registrar creación de sala en audit trail
            logEvent({
                userId,
                ip: clientIP,
                operation: 'room:create_internal',
                details: {
                    roomCode,
                    socketId: socket.id,
                    attempts,
                    timestamp: new Date().toISOString()
                }
            });

            // Unir el socket a la sala (a nivel de Socket.io)
            socket.join(roomCode);

            console.log(`Sala ${roomCode} creada por ${socket.id}`);
            return roomCode;
        } catch (error) {
            // Registrar error en audit trail
            logEvent({
                userId,
                ip: clientIP,
                operation: 'room:create_internal',
                status: 'error',
                details: {
                    socketId: socket.id,
                    attempts,
                    error: error.message,
                    timestamp: new Date().toISOString()
                }
            });

            throw error; // Re-lanzar el error para manejo externo
        }
    }

    async function roomExists(roomCode) {
        // Registrar verificación de existencia de sala (opcional, puede generar muchos registros)
        /*
        logEvent({
            userId: 'system',
            ip: '127.0.0.1',
            operation: 'room:check_exists',
            details: {
                roomCode,
                timestamp: new Date().toISOString()
            }
        });
        */

        return await redisClient.exists(`room:${roomCode}`);
    }

    async function getPlayersInRoom(roomCode) {
        const playersStr = await redisClient.hGet(`room:${roomCode}`, 'players');
        return playersStr ? JSON.parse(playersStr) : [];
    }

    async function joinRoom(socket, roomCode) {
        // Obtener información del cliente
        const clientIP = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
        const userId = socket.handshake.auth.userId || socket.id;

        try {
            // Verificar que la sala existe
            const exists = await roomExists(roomCode);
            if (!exists) {
                throw new Error('La sala no existe');
            }

            // Obtener jugadores actuales
            const players = await getPlayersInRoom(roomCode);

            // Verificar capacidad
            if (players.length >= 2) {
                throw new Error('La sala está llena');
            }

            // Añadir nuevo jugador
            players.push({ id: socket.id, ready: true });

            // Marcar todos como listos
            players.forEach(player => {
                player.ready = true;
            });

            // Guardar en Redis
            await redisClient.hSet(`room:${roomCode}`, 'players', JSON.stringify(players));

            // Registrar unión a sala en audit trail
            logEvent({
                userId,
                ip: clientIP,
                operation: 'room:join_internal',
                details: {
                    roomCode,
                    socketId: socket.id,
                    playerCount: players.length,
                    timestamp: new Date().toISOString()
                }
            });

            // Unir socket a la sala
            socket.join(roomCode);

            console.log(`Jugador ${socket.id} unido a sala ${roomCode}`);
            return { roomCode, players };
        } catch (error) {
            // Registrar error en audit trail
            logEvent({
                userId,
                ip: clientIP,
                operation: 'room:join_internal',
                status: 'error',
                details: {
                    roomCode,
                    socketId: socket.id,
                    error: error.message,
                    timestamp: new Date().toISOString()
                }
            });

            throw error; // Re-lanzar el error para manejo externo
        }
    }

    async function leaveRoom(socket, roomCode) {
        if (!roomCode) return false;

        // Obtener información del cliente
        const clientIP = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
        const userId = socket.handshake.auth.userId || socket.id;

        try {
            // Verificar que la sala existe
            const exists = await roomExists(roomCode);
            if (!exists) return false;

            // Obtener jugadores actuales
            let players = await getPlayersInRoom(roomCode);

            // Encontrar y eliminar el jugador
            const playerIndex = players.findIndex(p => p.id === socket.id);
            if (playerIndex !== -1) {
                players.splice(playerIndex, 1);

                // Si no quedan jugadores, eliminar la sala
                if (players.length === 0) {
                    await redisClient.del(`room:${roomCode}`);
                    await redisClient.del(`game:${roomCode}`); // Eliminar también estado del juego

                    // Registrar eliminación de sala en audit trail
                    logEvent({
                        userId,
                        ip: clientIP,
                        operation: 'room:delete_internal',
                        details: {
                            roomCode,
                            socketId: socket.id,
                            reason: 'no_players_left',
                            timestamp: new Date().toISOString()
                        }
                    });

                    console.log(`Sala ${roomCode} eliminada (sin jugadores)`);
                    return true; // Sala eliminada
                } else {
                    // Actualizar jugadores en Redis
                    await redisClient.hSet(`room:${roomCode}`, 'players', JSON.stringify(players));
                }
            }

            // Registrar salida de sala en audit trail
            logEvent({
                userId,
                ip: clientIP,
                operation: 'room:leave_internal',
                details: {
                    roomCode,
                    socketId: socket.id,
                    remainingPlayers: players.length,
                    timestamp: new Date().toISOString()
                }
            });

            // Desconectar socket de la sala
            socket.leave(roomCode);

            return false; // Sala no eliminada
        } catch (error) {
            // Registrar error en audit trail
            logEvent({
                userId,
                ip: clientIP,
                operation: 'room:leave_internal',
                status: 'error',
                details: {
                    roomCode,
                    socketId: socket.id,
                    error: error.message,
                    timestamp: new Date().toISOString()
                }
            });

            console.error(`Error al abandonar sala ${roomCode}:`, error);
            return false;
        }
    }

    async function updateRoomStatus(roomCode, status) {
        try {
            await redisClient.hSet(`room:${roomCode}`, 'status', status);

            // Registrar cambio de estado de sala en audit trail
            logEvent({
                userId: 'system',
                ip: '127.0.0.1',
                operation: 'room:status_update',
                details: {
                    roomCode,
                    newStatus: status,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            // Registrar error en audit trail
            logEvent({
                userId: 'system',
                ip: '127.0.0.1',
                operation: 'room:status_update',
                status: 'error',
                details: {
                    roomCode,
                    newStatus: status,
                    error: error.message,
                    timestamp: new Date().toISOString()
                }
            });

            console.error(`Error al actualizar estado de sala ${roomCode}:`, error);
            throw error;
        }
    }

    async function saveGameState(roomCode, gameState) {
        try {
            await redisClient.set(`game:${roomCode}`, JSON.stringify(gameState));

            // Registrar guardado de estado del juego en audit trail (opcional, puede generar muchos registros)
            /*
            logEvent({
                userId: 'system',
                ip: '127.0.0.1',
                operation: 'game:state_save',
                details: {
                    roomCode,
                    // No incluir todo el estado del juego para evitar registros enormes
                    stateSnapshot: {
                        monedas: gameState.monedas,
                        oleadaActual: gameState.oleadaActual,
                        enemigosRestantes: gameState.enemigosRestantes,
                        enemigosCount: gameState.enemigos?.length || 0,
                        torresCount: gameState.torres?.length || 0
                    },
                    timestamp: new Date().toISOString()
                }
            });
            */
        } catch (error) {
            // Registrar error en audit trail
            logEvent({
                userId: 'system',
                ip: '127.0.0.1',
                operation: 'game:state_save',
                status: 'error',
                details: {
                    roomCode,
                    error: error.message,
                    timestamp: new Date().toISOString()
                }
            });

            console.error(`Error al guardar estado del juego en sala ${roomCode}:`, error);
            throw error;
        }
    }

    async function getGameState(roomCode) {
        try {
            const state = await redisClient.get(`game:${roomCode}`);
            return state ? JSON.parse(state) : null;
        } catch (error) {
            // Registrar error en audit trail
            logEvent({
                userId: 'system',
                ip: '127.0.0.1',
                operation: 'game:state_get',
                status: 'error',
                details: {
                    roomCode,
                    error: error.message,
                    timestamp: new Date().toISOString()
                }
            });

            console.error(`Error al obtener estado del juego en sala ${roomCode}:`, error);
            return null;
        }
    }

    return {
        createRoom,
        joinRoom,
        leaveRoom,
        roomExists,
        getPlayersInRoom,
        updateRoomStatus,
        saveGameState,
        getGameState
    };
}

module.exports = {
    initializeRoomManager
};