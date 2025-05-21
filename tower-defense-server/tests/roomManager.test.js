const { initializeRoomManager } = require('../sockets/roomManager');
const { createClient } = require('redis');

// Mockear Redis
jest.mock('redis', () => {
    const mockRedis = {
        exists: jest.fn(),
        hSet: jest.fn(),
        hGet: jest.fn(),
        del: jest.fn(),
        set: jest.fn(),
        get: jest.fn(),
        connect: jest.fn(),
        keys: jest.fn()
    };
    return {
        createClient: jest.fn(() => mockRedis)
    };
});

describe('RoomManager', () => {
    let roomManager;
    let mockRedis;
    let mockIo;

    beforeEach(() => {
        jest.clearAllMocks();
        mockIo = {
            to: jest.fn(() => ({ emit: jest.fn() }))
        };
        mockRedis = createClient();
        roomManager = initializeRoomManager(mockIo, mockRedis);
    });

    describe('createRoom', () => {

        it('debería fallar después de 10 intentos', async () => {
            const mockSocket = {
                id: 'socket123',
                handshake: {
                    auth: { userId: 'user123' },
                    address: '127.0.0.1',
                    headers: {}
                }
            };

            // Mockear que siempre existe
            mockRedis.exists.mockResolvedValue(1);

            await expect(roomManager.createRoom(mockSocket)).rejects.toThrow(
                'No se pudo generar un código único después de 10 intentos'
            );
        });
    });

    describe('joinRoom', () => {
        it('debería unir un jugador a una sala existente', async () => {
            const mockSocket = {
                id: 'socket456',
                join: jest.fn(),
                handshake: {
                    auth: { userId: 'user456' },
                    address: '127.0.0.1',
                    headers: {}
                }
            };

            // Mockear que la sala existe
            mockRedis.exists.mockResolvedValue(1);
            // Mockear los jugadores actuales
            mockRedis.hGet.mockResolvedValue(JSON.stringify([{ id: 'socket123', ready: true }]));

            const result = await roomManager.joinRoom(mockSocket, 'ABCDEF');

            expect(result.roomCode).toBe('ABCDEF');
            expect(result.players).toHaveLength(2);
            expect(mockSocket.join).toHaveBeenCalledWith('ABCDEF');
        });

        it('debería fallar si la sala no existe', async () => {
            const mockSocket = {
                id: 'socket456',
                handshake: {
                    auth: { userId: 'user456' },
                    address: '127.0.0.1',
                    headers: {}
                }
            };

            // Mockear que la sala no existe
            mockRedis.exists.mockResolvedValue(0);

            await expect(roomManager.joinRoom(mockSocket, 'ABCDEF')).rejects.toThrow(
                'La sala no existe'
            );
        });
    });
});