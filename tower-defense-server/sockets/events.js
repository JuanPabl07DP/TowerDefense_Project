function handleSocketEvents(io, roomManager, gameManager) {
    io.on('connection', (socket) => {
        console.log('Nuevo cliente conectado:', socket.id);

        // Eventos de sala
        socket.on('createRoom', () => {
            const roomCode = roomManager.createRoom(socket);
            socket.roomCode = roomCode;
            socket.join(roomCode);

            // Inicializar estado del juego
            roomManager.rooms[roomCode].gameState = gameManager.initializeGameState();

            socket.emit('roomCreated', {
                roomCode,
                playerId: socket.id,
                gameState: roomManager.rooms[roomCode].gameState
            });
        });

        socket.on('joinRoom', ({ roomCode }) => {
            try {
                roomManager.joinRoom(socket, roomCode);
                socket.roomCode = roomCode;
                socket.join(roomCode);

                io.to(roomCode).emit('playerJoined', {
                    roomCode,
                    players: roomManager.rooms[roomCode].players,
                    gameState: roomManager.rooms[roomCode].gameState
                });

                if (roomManager.rooms[roomCode].players.length === 2) {
                    setTimeout(() => {
                        roomManager.rooms[roomCode].status = 'playing';
                        io.to(roomCode).emit('gameStarted', { roomCode });

                        if (roomManager.rooms[roomCode].gameState.primeraConexion &&
                            !roomManager.rooms[roomCode].gameState.enOleada) {
                            roomManager.rooms[roomCode].gameState.primeraConexion = false;
                            gameManager.iniciarOleada(roomCode, 0);
                        }
                    }, 3000);
                }
            } catch (error) {
                socket.emit('joinError', { message: error.message });
            }
        });

        socket.on('leaveRoom', ({ roomCode }) => {
            const roomDeleted = roomManager.leaveRoom(socket, roomCode);
            if (roomDeleted) {
                console.log(`Sala eliminada: ${roomCode}`);
            } else {
                io.to(roomCode).emit('playerLeft', {
                    playerId: socket.id,
                    players: roomManager.rooms[roomCode]?.players || []
                });
            }
            socket.leave(roomCode);
            socket.roomCode = null;
        });

        // Eventos del juego
        socket.on('colocar-torre', (data) => {
            const roomCode = socket.roomCode;
            if (!roomCode || !roomManager.rooms[roomCode]) return;

            const { x, y, tipo } = data;
            const validTypes = ['basic', 'sniper', 'rapid'];
            const towerType = validTypes.includes(tipo) ? tipo : 'basic';
            roomManager.rooms[roomCode].gameState.torres.push({ x, y, tipo: towerType });
            io.to(roomCode).emit('torre-colocada', { x, y, tipo: towerType });
        });

        socket.on('disparar-proyectil', (data) => {
            const roomCode = socket.roomCode;
            if (!roomCode || !roomManager.rooms[roomCode]) return;
            io.to(roomCode).emit('proyectil-disparado', data);
        });

        socket.on('eliminar-enemigo', (enemigoId) => {
            const roomCode = socket.roomCode;
            if (!roomCode || !roomManager.rooms[roomCode]) return;

            roomManager.rooms[roomCode].gameState.enemigos =
                roomManager.rooms[roomCode].gameState.enemigos.filter(e => e.id !== enemigoId);
            io.to(roomCode).emit('enemigo-eliminado', enemigoId);
        });

        socket.on('gastar-monedas', (cantidad) => {
            const roomCode = socket.roomCode;
            if (!roomCode || !roomManager.rooms[roomCode]) return;

            if (roomManager.rooms[roomCode].gameState.monedas >= cantidad) {
                roomManager.rooms[roomCode].gameState.monedas -= cantidad;
                io.to(roomCode).emit('actualizar-monedas', roomManager.rooms[roomCode].gameState.monedas);
            }
        });

        socket.on('agregar-monedas', (cantidad) => {
            const roomCode = socket.roomCode;
            if (!roomCode || !roomManager.rooms[roomCode]) return;

            roomManager.rooms[roomCode].gameState.monedas += cantidad;
            io.to(roomCode).emit('actualizar-monedas', roomManager.rooms[roomCode].gameState.monedas);
        });

        socket.on('disconnect', () => {
            const roomCode = socket.roomCode;
            if (roomCode && roomManager.rooms[roomCode]) {
                const roomDeleted = roomManager.leaveRoom(socket, roomCode);
                if (!roomDeleted) {
                    io.to(roomCode).emit('playerLeft', {
                        playerId: socket.id,
                        players: roomManager.rooms[roomCode].players
                    });
                }
            }
        });
    });
}

module.exports = {
    handleSocketEvents
};