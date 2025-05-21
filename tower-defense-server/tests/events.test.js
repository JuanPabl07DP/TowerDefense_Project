const { handleSocketEvents } = require('../sockets/events');
const { logEvent } = require('../services/auditTrail');

// Mocks
jest.mock('../services/auditTrail');

describe('Socket Events', () => {
    let io;
    let socket;
    let roomManager;
    let gameManager;

    beforeEach(() => {
        // Restablecer todos los mocks
        jest.clearAllMocks();

        // Crear mock para io
        io = {
            on: jest.fn(),
            to: jest.fn().mockReturnThis(),
            emit: jest.fn()
        };

        // Crear mock para socket
        socket = {
            id: 'socket-123',
            roomCode: null,
            handshake: {
                headers: {
                    'x-forwarded-for': '192.168.1.1',
                    'user-agent': 'Jest Test'
                },
                auth: {
                    userId: 'user-123'
                },
                address: '127.0.0.1'
            },
            emit: jest.fn(),
            on: jest.fn(),
            join: jest.fn(),
            leave: jest.fn(),
            conn: {
                transport: {
                    name: 'websocket'
                }
            }
        };

        // Simular io.on('connection', callback) para ejecutar el callback con el socket mock
        io.on.mockImplementation((event, callback) => {
            if (event === 'connection') {
                callback(socket);
            }
        });

        // Crear mock para roomManager
        roomManager = {
            createRoom: jest.fn().mockResolvedValue('room123'),
            roomExists: jest.fn().mockResolvedValue(true),
            joinRoom: jest.fn().mockResolvedValue({
                players: [{ id: 'socket-123', username: 'Player1' }]
            }),
            leaveRoom: jest.fn().mockResolvedValue(false),
            updateRoomStatus: jest.fn().mockResolvedValue(true),
            getPlayersInRoom: jest.fn().mockResolvedValue([]),
            getGameState: jest.fn().mockResolvedValue({
                torres: [],
                enemigos: [],
                monedas: 100,
                oleadaActual: 1,
                enemigosRestantes: 0,
                enOleada: false,
                primeraConexion: true
            }),
            saveGameState: jest.fn().mockResolvedValue(true)
        };

        // Crear mock para gameManager
        gameManager = {
            initializeGameState: jest.fn().mockReturnValue({
                torres: [],
                enemigos: [],
                monedas: 100,
                oleadaActual: 1,
                enemigosRestantes: 0,
                enOleada: false,
                primeraConexion: true
            }),
            iniciarOleada: jest.fn().mockResolvedValue(true)
        };

        // Ejecutar función que se está probando
        handleSocketEvents(io, roomManager, gameManager);
    });

    describe('connection', () => {
        it('debería registrar una nueva conexión y enviar info del servidor', () => {
            // Verificar que se emitió el evento de info del servidor
            expect(socket.emit).toHaveBeenCalledWith('server-info', expect.objectContaining({
                serverId: expect.any(String)
            }));

            // Verificar que se registró en audit trail
            expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user-123',
                ip: '192.168.1.1',
                operation: 'socket:connect'
            }));
        });
    });
});