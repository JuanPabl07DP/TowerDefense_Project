const socketIO = require('socket.io');
const { setupSocket, getIO } = require('../sockets/index');

// Mock de módulos
jest.mock('socket.io');
jest.mock('../sockets/events');
jest.mock('../sockets/roomManager');
jest.mock('../sockets/gameManager');

describe('Socket Configuration', () => {
    let mockServer;
    let mockIO;
    let mockRoomManager;
    let mockGameManager;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock del servidor HTTP
        mockServer = {
            listen: jest.fn(),
            close: jest.fn()
        };

        // Mock de Socket.io
        mockIO = {
            on: jest.fn(),
            emit: jest.fn(),
            to: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            use: jest.fn()
        };

        // Mock de managers
        mockRoomManager = {
            createRoom: jest.fn(),
            joinRoom: jest.fn(),
            leaveRoom: jest.fn(),
            getRoomInfo: jest.fn()
        };

        mockGameManager = {
            startGame: jest.fn(),
            endGame: jest.fn(),
            updateGameState: jest.fn()
        };

        // Configurar mocks
        socketIO.mockReturnValue(mockIO);

        require('../sockets/roomManager').initializeRoomManager = jest.fn().mockReturnValue(mockRoomManager);
        require('../sockets/gameManager').initializeGameManager = jest.fn().mockReturnValue(mockGameManager);
        require('../sockets/events').handleSocketEvents = jest.fn();
    });

    describe('setupSocket', () => {
        it('debería configurar Socket.io correctamente', () => {
            const io = setupSocket(mockServer);

            expect(socketIO).toHaveBeenCalledWith(mockServer, {
                cors: {
                    origin: expect.any(String),
                    methods: ["GET", "POST"]
                }
            });
            expect(io).toBe(mockIO);
        });

        it('debería configurar CORS para desarrollo', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            setupSocket(mockServer);

            expect(socketIO).toHaveBeenCalledWith(mockServer, {
                cors: {
                    origin: 'http://localhost:5173',
                    methods: ["GET", "POST"]
                }
            });

            process.env.NODE_ENV = originalEnv;
        });

        it('debería configurar CORS para producción', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            setupSocket(mockServer);

            expect(socketIO).toHaveBeenCalledWith(mockServer, {
                cors: {
                    origin: '*',
                    methods: ["GET", "POST"]
                }
            });

            process.env.NODE_ENV = originalEnv;
        });

        it('debería retornar la instancia de Socket.io', () => {
            const result = setupSocket(mockServer);

            expect(result).toBe(mockIO);
        });
    });

    describe('getIO', () => {
        it('debería retornar la instancia de Socket.io después de setupSocket', () => {
            setupSocket(mockServer);
            const io = getIO();

            expect(io).toBe(mockIO);
        });

        it('debería retornar undefined si no se ha llamado setupSocket', () => {
            // Resetear el módulo para simular estado inicial
            jest.resetModules();
            const { getIO: freshGetIO } = require('../sockets/index');

            const io = freshGetIO();

            expect(io).toBeUndefined();
        });
    });

    describe('Error Handling', () => {
        it('debería manejar errores durante la configuración de Socket.io', () => {
            const error = new Error('Socket.io configuration failed');
            socketIO.mockImplementation(() => {
                throw error;
            });

            expect(() => setupSocket(mockServer)).toThrow('Socket.io configuration failed');
        });
    });
});