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
        // Generar código único
        let roomCode;
        let exists = false;
        let attempts = 0;

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

        // Unir el socket a la sala (a nivel de Socket.io)
        socket.join(roomCode);

        console.log(`Sala ${roomCode} creada por ${socket.id}`);
        return roomCode;
    }

    async function roomExists(roomCode) {
        return await redisClient.exists(`room:${roomCode}`);
    }

    async function getPlayersInRoom(roomCode) {
        const playersStr = await redisClient.hGet(`room:${roomCode}`, 'players');
        return playersStr ? JSON.parse(playersStr) : [];
    }

    async function joinRoom(socket, roomCode) {
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

        // Unir socket a la sala
        socket.join(roomCode);

        console.log(`Jugador ${socket.id} unido a sala ${roomCode}`);
        return { roomCode, players };
    }

    async function leaveRoom(socket, roomCode) {
        if (!roomCode) return false;

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
                console.log(`Sala ${roomCode} eliminada (sin jugadores)`);
                return true; // Sala eliminada
            } else {
                // Actualizar jugadores en Redis
                await redisClient.hSet(`room:${roomCode}`, 'players', JSON.stringify(players));
            }
        }

        // Desconectar socket de la sala
        socket.leave(roomCode);

        return false; // Sala no eliminada
    }

    async function updateRoomStatus(roomCode, status) {
        await redisClient.hSet(`room:${roomCode}`, 'status', status);
    }

    async function saveGameState(roomCode, gameState) {
        await redisClient.set(`game:${roomCode}`, JSON.stringify(gameState));
    }

    async function getGameState(roomCode) {
        const state = await redisClient.get(`game:${roomCode}`);
        return state ? JSON.parse(state) : null;
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