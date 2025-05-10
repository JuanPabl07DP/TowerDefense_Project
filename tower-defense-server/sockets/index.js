const socketIO = require('socket.io');
const { handleSocketEvents } = require('./events');
const { initializeRoomManager } = require('./roomManager');
const { initializeGameManager } = require('./gameManager');

let io;

function setupSocket(server) {
    io = socketIO(server, {
        cors: {
            origin: process.env.NODE_ENV === 'production' ? '*' : 'http://localhost:5173',
            methods: ["GET", "POST"]
        }
    });

    // Inicializar managers
    const roomManager = initializeRoomManager(io);
    const gameManager = initializeGameManager(io, roomManager);

    // Configurar eventos
    handleSocketEvents(io, roomManager, gameManager);

    return io;
}

module.exports = {
    setupSocket,
    getIO: () => io
};