const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

// Mock de todos los módulos externos
jest.mock('http');
jest.mock('socket.io');
jest.mock('@socket.io/redis-adapter');
jest.mock('redis');
jest.mock('../app');
jest.mock('../services/auditTrail');
jest.mock('../sockets/roomManager');
jest.mock('../sockets/gameManager');
jest.mock('../sockets/events');

describe('Server Configuration', () => {
    let mockApp;
    let mockServer;
    let mockIO;
    let mockRedisClient;
    let mockPubClient;
    let mockSubClient;
    let mockRoomManager;
    let mockGameManager;
    let mockAuditTrail;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock de la aplicación Express
        mockApp = {
            use: jest.fn(),
            get: jest.fn(),
            post: jest.fn()
        };

        // Mock del servidor HTTP
        mockServer = {
            listen: jest.fn((port, callback) => {
                if (callback) callback();
            }),
            close: jest.fn((callback) => {
                if (callback) callback();
            })
        };

        // Mock de Socket.io
        mockIO = {
            adapter: jest.fn(),
            on: jest.fn(),
            emit: jest.fn(),
            to: jest.fn().mockReturnThis()
        };

        // Mock de clientes Redis
        mockRedisClient = {
            connect: jest.fn().mockResolvedValue(),
            disconnect: jest.fn().mockResolvedValue(),
            on: jest.fn(),
            duplicate: jest.fn()
        };

        mockPubClient = {
            connect: jest.fn().mockResolvedValue(),
            on: jest.fn(),
            duplicate: jest.fn().mockReturnValue(mockRedisClient)
        };

        mockSubClient = {
            connect: jest.fn().mockResolvedValue(),
            on: jest.fn()
        };

        // Mock de managers
        mockRoomManager = {
            createRoom: jest.fn(),
            joinRoom: jest.fn()
        };

        mockGameManager = {
            startGame: jest.fn(),
            endGame: jest.fn()
        };

        // Mock de Audit Trail
        mockAuditTrail = {
            initializeAuditTrail: jest.fn(),
            scheduleMigration: jest.fn(),
            logEvent: jest.fn().mockResolvedValue(),
            migrateEventsToPostgres: jest.fn().mockResolvedValue()
        };

        // Configurar todos los mocks
        require('../app').mockReturnValue(mockApp);
        http.createServer.mockReturnValue(mockServer);
        Server.mockReturnValue(mockIO);
        createClient.mockReturnValue(mockPubClient);
        mockPubClient.duplicate.mockReturnValue(mockSubClient);
        createAdapter.mockReturnValue(jest.fn());

        require('../services/auditTrail').initializeAuditTrail = mockAuditTrail.initializeAuditTrail;
        require('../services/auditTrail').scheduleMigration = mockAuditTrail.scheduleMigration;
        require('../services/auditTrail').logEvent = mockAuditTrail.logEvent;
        require('../services/auditTrail').migrateEventsToPostgres = mockAuditTrail.migrateEventsToPostgres;

        require('../sockets/roomManager').initializeRoomManager = jest.fn().mockReturnValue(mockRoomManager);
        require('../sockets/gameManager').initializeGameManager = jest.fn().mockReturnValue(mockGameManager);
        require('../sockets/events').handleSocketEvents = jest.fn();
    });

    describe('Redis Configuration', () => {

        it('debería usar URL de Redis personalizada si está configurada', async () => {
            process.env.REDIS_URL = 'redis://custom-redis:6379';

            // Simular la creación de clientes Redis
            createClient.mockReturnValueOnce(mockPubClient);
            createClient.mockReturnValueOnce(mockRedisClient);

            require('../server');

            expect(createClient).toHaveBeenCalledWith({ url: 'redis://custom-redis:6379' });
        });
    });
});