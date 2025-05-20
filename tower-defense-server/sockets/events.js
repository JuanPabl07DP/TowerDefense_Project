const { logEvent } = require('../services/auditTrail');

function handleSocketEvents(io, roomManager, gameManager) {
    io.on('connection', (socket) => {
        console.log('Nuevo cliente conectado:', socket.id);

        // Obtener puerto o dirección para identificar el servidor
        const SERVER_PORT = process.argv[2] || process.env.PORT || 4000;
        const SERVER_ID = `Server-${SERVER_PORT}`;

        // Obtener información del cliente
        const clientIP = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
        const userId = socket.handshake.auth.userId || socket.id;

        // Registrar conexión en el audit trail
        logEvent({
            userId,
            ip: clientIP,
            operation: 'socket:connect',
            details: {
                socketId: socket.id,
                userAgent: socket.handshake.headers['user-agent'],
                transport: socket.conn.transport?.name || 'unknown'
            }
        });

        // Enviar información del servidor al cliente
        socket.emit('server-info', {
            serverId: SERVER_ID,
            port: SERVER_PORT,
            timestamp: new Date().toISOString()
        });

        // Eventos de sala
        socket.on('createRoom', async () => {
            console.log('[DEBUG] Procesando createRoom desde cliente:', socket.id);
            try {
                // Crear sala en Redis
                console.log('[DEBUG] Llamando a roomManager.createRoom');
                const roomCode = await roomManager.createRoom(socket);
                console.log('[DEBUG] Sala creada con código:', roomCode);

                socket.roomCode = roomCode;

                // Inicializar estado del juego
                const gameState = gameManager.initializeGameState();

                // Si usas Redis, también guarda el estado del juego
                if (roomManager.saveGameState) {
                    await roomManager.saveGameState(roomCode, gameState);
                }

                // Registrar creación de sala en audit trail
                logEvent({
                    userId,
                    ip: clientIP,
                    operation: 'room:create',
                    details: {
                        roomCode,
                        socketId: socket.id,
                        timestamp: new Date().toISOString()
                    }
                });

                socket.emit('roomCreated', {
                    roomCode,
                    playerId: socket.id,
                    serverId: SERVER_ID,
                    gameState
                });

                console.log(`Evento roomCreated emitido para sala ${roomCode}`);
            } catch (error) {
                console.error('[ERROR] Error detallado al crear sala:', error);
                // Analizar el error más profundamente
                console.error('[ERROR] Stack:', error.stack);

                // Registrar error en audit trail
                logEvent({
                    userId,
                    ip: clientIP,
                    operation: 'room:create',
                    status: 'error',
                    details: {
                        error: error.message,
                        stack: error.stack
                    }
                });

                socket.emit('error', { message: 'Error al crear sala: ' + error.message });
            }
        });

        socket.on('joinRoom', async ({ roomCode }) => {
            try {
                // Verificar que la sala existe
                const exists = await roomManager.roomExists(roomCode);
                if (!exists) {
                    throw new Error('La sala no existe');
                }

                // Unir al jugador a la sala
                const roomData = await roomManager.joinRoom(socket, roomCode);
                socket.roomCode = roomCode;

                // Obtener estado del juego
                const gameState = await roomManager.getGameState(roomCode);

                // Registrar unión a sala en audit trail
                logEvent({
                    userId,
                    ip: clientIP,
                    operation: 'room:join',
                    details: {
                        roomCode,
                        socketId: socket.id,
                        playerCount: roomData.players.length
                    }
                });

                // Notificar a todos en la sala
                io.to(roomCode).emit('playerJoined', {
                    roomCode,
                    serverId: SERVER_ID,
                    players: roomData.players,
                    gameState
                });

                console.log(`Jugador ${socket.id} unido a sala ${roomCode}`);

                // Si hay 2 jugadores, empezar la partida
                if (roomData.players.length === 2) {
                    // Actualizar estado de la sala
                    await roomManager.updateRoomStatus(roomCode, 'playing');

                    // Registrar sala lista para jugar
                    logEvent({
                        userId,
                        ip: clientIP,
                        operation: 'room:ready',
                        details: {
                            roomCode,
                            players: roomData.players.length
                        }
                    });

                    setTimeout(async () => {
                        // Notificar inicio de juego
                        io.to(roomCode).emit('gameStarted', {
                            roomCode,
                            serverId: SERVER_ID
                        });

                        // Registrar inicio de juego
                        logEvent({
                            userId: 'system',
                            ip: '127.0.0.1',
                            operation: 'game:start',
                            details: {
                                roomCode,
                                players: roomData.players.length
                            }
                        });

                        // Obtener estado actualizado
                        const currentGameState = await roomManager.getGameState(roomCode);

                        // Iniciar primera oleada si es necesario
                        if (currentGameState.primeraConexion && !currentGameState.enOleada) {
                            currentGameState.primeraConexion = false;
                            await roomManager.saveGameState(roomCode, currentGameState);
                            await gameManager.iniciarOleada(roomCode, 0);
                        }
                    }, 3000);
                }
            } catch (error) {
                console.error('Error al unirse a sala:', error);

                // Registrar error en audit trail
                logEvent({
                    userId,
                    ip: clientIP,
                    operation: 'room:join',
                    status: 'error',
                    details: {
                        roomCode,
                        error: error.message
                    }
                });

                socket.emit('joinError', {
                    message: error.message,
                    serverId: SERVER_ID
                });
            }
        });

        socket.on('leaveRoom', async ({ roomCode }) => {
            try {
                if (!roomCode) return;

                // Registrar salida de sala en audit trail
                logEvent({
                    userId,
                    ip: clientIP,
                    operation: 'room:leave',
                    details: {
                        roomCode,
                        socketId: socket.id
                    }
                });

                // Eliminar jugador de la sala
                const roomDeleted = await roomManager.leaveRoom(socket, roomCode);

                if (roomDeleted) {
                    console.log(`Sala eliminada: ${roomCode}`);

                    // Registrar eliminación de sala
                    logEvent({
                        userId: 'system',
                        ip: '127.0.0.1',
                        operation: 'room:delete',
                        details: {
                            roomCode,
                            reason: 'all_players_left'
                        }
                    });
                } else {
                    // Obtener jugadores actualizados
                    const players = await roomManager.getPlayersInRoom(roomCode);

                    // Notificar a los demás jugadores
                    io.to(roomCode).emit('playerLeft', {
                        playerId: socket.id,
                        serverId: SERVER_ID,
                        players
                    });
                }

                // Salir de la sala a nivel de Socket.io
                socket.leave(roomCode);
                socket.roomCode = null;
            } catch (error) {
                console.error('Error al abandonar sala:', error);

                // Registrar error en audit trail
                logEvent({
                    userId,
                    ip: clientIP,
                    operation: 'room:leave',
                    status: 'error',
                    details: {
                        roomCode,
                        error: error.message
                    }
                });
            }
        });

        // Eventos del juego
        socket.on('colocar-torre', async (data) => {
            try {
                const roomCode = socket.roomCode;
                if (!roomCode) return;

                // Verificar que la sala existe
                const exists = await roomManager.roomExists(roomCode);
                if (!exists) return;

                // Extraer información de la torre
                const { x, y, tipo } = data;
                const validTypes = ['basic', 'sniper', 'rapid'];
                const towerType = validTypes.includes(tipo) ? tipo : 'basic';

                // Registrar colocación de torre en audit trail
                logEvent({
                    userId,
                    ip: clientIP,
                    operation: 'game:place-tower',
                    details: {
                        roomCode,
                        towerType,
                        position: { x, y }
                    }
                });

                // Obtener estado del juego
                const gameState = await roomManager.getGameState(roomCode);
                if (!gameState) return;

                // Añadir torre al estado
                if (!gameState.torres) gameState.torres = [];
                gameState.torres.push({ x, y, tipo: towerType });

                // Guardar estado actualizado
                await roomManager.saveGameState(roomCode, gameState);

                // Notificar a todos los jugadores
                io.to(roomCode).emit('torre-colocada', {
                    x, y,
                    tipo: towerType,
                    serverId: SERVER_ID
                });

                console.log(`Torre ${towerType} colocada en (${x},${y}) - Sala ${roomCode}`);
            } catch (error) {
                console.error('Error al colocar torre:', error);

                // Registrar error en audit trail
                logEvent({
                    userId,
                    ip: clientIP,
                    operation: 'game:place-tower',
                    status: 'error',
                    details: {
                        roomCode: socket.roomCode,
                        error: error.message,
                        towerData: data
                    }
                });
            }
        });

        socket.on('disparar-proyectil', async (data) => {
            try {
                const roomCode = socket.roomCode;
                if (!roomCode) return;

                const exists = await roomManager.roomExists(roomCode);
                if (!exists) return;

                // Registrar disparo de proyectil en audit trail (opcional, genera muchos eventos)
                /*
                logEvent({
                    userId,
                    ip: clientIP,
                    operation: 'game:fire-projectile',
                    details: {
                        roomCode,
                        targetId: data.targetId,
                        position: { x: data.x, y: data.y }
                    }
                });
                */

                // Añadir información del servidor al evento
                data.serverId = SERVER_ID;

                // Transmitir a todos los jugadores en la sala
                io.to(roomCode).emit('proyectil-disparado', data);
            } catch (error) {
                console.error('Error al disparar proyectil:', error);

                // Registrar error en audit trail
                logEvent({
                    userId,
                    ip: clientIP,
                    operation: 'game:fire-projectile',
                    status: 'error',
                    details: {
                        roomCode: socket.roomCode,
                        error: error.message
                    }
                });
            }
        });

        socket.on('eliminar-enemigo', async (enemigoId) => {
            try {
                const roomCode = socket.roomCode;
                if (!roomCode) return;

                const exists = await roomManager.roomExists(roomCode);
                if (!exists) return;

                // Registrar eliminación de enemigo en audit trail
                logEvent({
                    userId,
                    ip: clientIP,
                    operation: 'game:kill-enemy',
                    details: {
                        roomCode,
                        enemyId: enemigoId
                    }
                });

                // Obtener estado del juego
                const gameState = await roomManager.getGameState(roomCode);
                if (!gameState || !gameState.enemigos) return;

                // Filtrar enemigo eliminado
                gameState.enemigos = gameState.enemigos.filter(e => e.id !== enemigoId);

                // Guardar estado actualizado
                await roomManager.saveGameState(roomCode, gameState);

                // Notificar a todos los jugadores
                io.to(roomCode).emit('enemigo-eliminado', enemigoId);

                console.log(`Enemigo ${enemigoId} eliminado en sala ${roomCode}`);
            } catch (error) {
                console.error('Error al eliminar enemigo:', error);

                // Registrar error en audit trail
                logEvent({
                    userId,
                    ip: clientIP,
                    operation: 'game:kill-enemy',
                    status: 'error',
                    details: {
                        roomCode: socket.roomCode,
                        enemyId: enemigoId,
                        error: error.message
                    }
                });
            }
        });

        socket.on('gastar-monedas', async (cantidad) => {
            try {
                const roomCode = socket.roomCode;
                if (!roomCode) return;

                const exists = await roomManager.roomExists(roomCode);
                if (!exists) return;

                // Registrar gasto de monedas en audit trail
                logEvent({
                    userId,
                    ip: clientIP,
                    operation: 'game:spend-currency',
                    details: {
                        roomCode,
                        amount: cantidad
                    }
                });

                // Obtener estado del juego
                const gameState = await roomManager.getGameState(roomCode);
                if (!gameState) return;

                // Verificar si hay suficientes monedas
                if (gameState.monedas >= cantidad) {
                    // Actualizar monedas
                    gameState.monedas -= cantidad;

                    // Guardar estado actualizado
                    await roomManager.saveGameState(roomCode, gameState);

                    // Notificar a todos los jugadores
                    io.to(roomCode).emit('actualizar-monedas', gameState.monedas);

                    console.log(`Monedas gastadas: ${cantidad} - Sala ${roomCode}`);
                } else {
                    // Registrar intento fallido
                    logEvent({
                        userId,
                        ip: clientIP,
                        operation: 'game:spend-currency',
                        status: 'error',
                        details: {
                            roomCode,
                            amount: cantidad,
                            available: gameState.monedas,
                            reason: 'insufficient_funds'
                        }
                    });
                }
            } catch (error) {
                console.error('Error al gastar monedas:', error);

                // Registrar error en audit trail
                logEvent({
                    userId,
                    ip: clientIP,
                    operation: 'game:spend-currency',
                    status: 'error',
                    details: {
                        roomCode: socket.roomCode,
                        amount: cantidad,
                        error: error.message
                    }
                });
            }
        });

        socket.on('agregar-monedas', async (cantidad) => {
            try {
                const roomCode = socket.roomCode;
                if (!roomCode) return;

                const exists = await roomManager.roomExists(roomCode);
                if (!exists) return;

                // Registrar adición de monedas en audit trail
                logEvent({
                    userId,
                    ip: clientIP,
                    operation: 'game:add-currency',
                    details: {
                        roomCode,
                        amount: cantidad
                    }
                });

                // Obtener estado del juego
                const gameState = await roomManager.getGameState(roomCode);
                if (!gameState) return;

                // Actualizar monedas
                gameState.monedas += cantidad;

                // Guardar estado actualizado
                await roomManager.saveGameState(roomCode, gameState);

                // Notificar a todos los jugadores
                io.to(roomCode).emit('actualizar-monedas', gameState.monedas);

                console.log(`Monedas añadidas: ${cantidad} - Sala ${roomCode}`);
            } catch (error) {
                console.error('Error al agregar monedas:', error);

                // Registrar error en audit trail
                logEvent({
                    userId,
                    ip: clientIP,
                    operation: 'game:add-currency',
                    status: 'error',
                    details: {
                        roomCode: socket.roomCode,
                        amount: cantidad,
                        error: error.message
                    }
                });
            }
        });

        // Nuevo evento para pruebas de balanceo
        socket.on('ping-server', () => {
            // Registrar ping en audit trail
            logEvent({
                userId,
                ip: clientIP,
                operation: 'server:ping',
                details: {
                    socketId: socket.id,
                    serverId: SERVER_ID
                }
            });

            socket.emit('pong-server', {
                serverId: SERVER_ID,
                port: SERVER_PORT,
                timestamp: new Date().toISOString()
            });
        });

        socket.on('disconnect', async () => {
            try {
                console.log(`Cliente desconectado: ${socket.id}`);

                // Registrar desconexión en audit trail
                logEvent({
                    userId,
                    ip: clientIP,
                    operation: 'socket:disconnect',
                    details: {
                        socketId: socket.id,
                        roomCode: socket.roomCode,
                        reason: socket.disconnectReason || 'unknown'
                    }
                });

                const roomCode = socket.roomCode;
                if (!roomCode) return;

                // Verificar si la sala existe
                const exists = await roomManager.roomExists(roomCode);
                if (!exists) return;

                // Eliminar jugador de la sala
                const roomDeleted = await roomManager.leaveRoom(socket, roomCode);

                if (!roomDeleted) {
                    // Obtener jugadores actualizados
                    const players = await roomManager.getPlayersInRoom(roomCode);

                    // Notificar a los demás jugadores
                    io.to(roomCode).emit('playerLeft', {
                        playerId: socket.id,
                        serverId: SERVER_ID,
                        players
                    });
                } else {
                    // Registrar eliminación de sala tras desconexión
                    logEvent({
                        userId: 'system',
                        ip: '127.0.0.1',
                        operation: 'room:delete',
                        details: {
                            roomCode,
                            reason: 'disconnect_last_player'
                        }
                    });
                }
            } catch (error) {
                console.error('Error al manejar desconexión:', error);

                // Registrar error en audit trail
                logEvent({
                    userId,
                    ip: clientIP,
                    operation: 'socket:disconnect',
                    status: 'error',
                    details: {
                        socketId: socket.id,
                        roomCode: socket.roomCode,
                        error: error.message
                    }
                });
            }
        });
    });
}

module.exports = {
    handleSocketEvents
};