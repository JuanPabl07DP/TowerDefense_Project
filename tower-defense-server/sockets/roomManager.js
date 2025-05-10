function initializeRoomManager(io) {
    const rooms = {};

    function generateRoomCode() {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    function createRoom(socket) {
        let roomCode;
        do {
            roomCode = generateRoomCode();
        } while (rooms[roomCode]);

        rooms[roomCode] = {
            id: roomCode,
            players: [{ id: socket.id, ready: true }],
            status: 'waiting'
        };

        return roomCode;
    }

    function joinRoom(socket, roomCode) {
        if (!rooms[roomCode]) {
            throw new Error('La sala no existe');
        }

        if (rooms[roomCode].players.length >= 2) {
            throw new Error('La sala está llena');
        }

        rooms[roomCode].players.push({ id: socket.id, ready: true });
        rooms[roomCode].players.forEach(player => {
            player.ready = true;
        });

        return roomCode;
    }

    function leaveRoom(socket, roomCode) {
        if (!roomCode || !rooms[roomCode]) return;

        const playerIndex = rooms[roomCode].players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
            rooms[roomCode].players.splice(playerIndex, 1);

            if (rooms[roomCode].players.length === 0) {
                delete rooms[roomCode];
                return true; // Sala eliminada
            }
        }
        return false; // Sala no eliminada
    }

    return {
        rooms,
        createRoom,
        joinRoom,
        leaveRoom,
        generateRoomCode
    };
}

module.exports = {
    initializeRoomManager
};