const { initializeGameManager } = require('../sockets/gameManager');
const { logEvent } = require('../services/auditTrail');

// Mocks
jest.mock('../services/auditTrail');
jest.mock('socket.io');
jest.mock('redis');

describe('Game Manager', () => {
    let io;
    let roomManager;
    let redisClient;
    let gameManager;

    beforeEach(() => {
        // Restablecer todos los mocks
        jest.clearAllMocks();

        // Crear mocks para io, roomManager y redisClient
        io = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn()
        };

        roomManager = {
            roomExists: jest.fn().mockResolvedValue(true),
            getGameState: jest.fn(),
            saveGameState: jest.fn().mockResolvedValue(true),
            getPlayersInRoom: jest.fn().mockResolvedValue([])
        };

        redisClient = {
            set: jest.fn().mockResolvedValue('OK'),
            get: jest.fn(),
            keys: jest.fn().mockResolvedValue(['room:room123']),
            hGet: jest.fn().mockResolvedValue('playing')
        };

        // Inicializar gameManager con mocks
        gameManager = initializeGameManager(io, roomManager, redisClient);
    });

    describe('initializeGameState', () => {
        it('debería devolver un estado de juego inicial válido', () => {
            const gameState = gameManager.initializeGameState();

            expect(gameState).toEqual({
                torres: [],
                enemigos: [],
                monedas: 100,
                oleadaActual: 1,
                enemigosRestantes: 0,
                enOleada: false,
                primeraConexion: true,
                enemyCounters: {
                    basic: 0,
                    fast: 0,
                    strong: 0,
                    total: 0
                }
            });

            expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({
                operation: 'game:state_initialize'
            }));
        });
    });

    describe('iniciarOleada', () => {
        it('debería iniciar una oleada correctamente', async () => {
            // Configurar el estado del juego mock
            const mockGameState = {
                torres: [],
                enemigos: [],
                monedas: 100,
                oleadaActual: 0,
                enemigosRestantes: 0,
                enOleada: false,
                primeraConexion: true,
                enemyCounters: {
                    basic: 0,
                    fast: 0,
                    strong: 0,
                    total: 0
                }
            };

            roomManager.getGameState.mockResolvedValue(mockGameState);

            // Ejecutar la función
            await gameManager.iniciarOleada('room123', 0);

            // Verificar que el estado del juego se actualizó correctamente
            expect(roomManager.saveGameState).toHaveBeenCalledWith('room123', expect.objectContaining({
                oleadaActual: 1,
                enemigosRestantes: 10, // La primera oleada tiene 10 enemigos
                enOleada: true
            }));

            // Verificar emisión de eventos a los clientes
            expect(io.to).toHaveBeenCalledWith('room123');
            expect(io.emit).toHaveBeenCalledWith('nueva-oleada', 1);
            expect(io.emit).toHaveBeenCalledWith('enemigos-restantes', 10);

            // Verificar registro en audit trail
            expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({
                operation: 'game:wave_start'
            }));
        });

        it('debería manejar errores cuando la sala no existe', async () => {
            // Configurar el mock para que la sala no exista
            roomManager.roomExists.mockResolvedValue(false);

            // Ejecutar la función
            await gameManager.iniciarOleada('room999', 0);

            // Verificar que no se emitieron eventos
            expect(io.to).not.toHaveBeenCalled();
            expect(io.emit).not.toHaveBeenCalled();

            // Verificar que se registró el error
            expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({
                operation: 'game:wave_start',
                status: 'error',
                details: expect.objectContaining({
                    reason: 'room_not_exists'
                })
            }));
        });

        it('debería manejar errores si el índice de oleada está fuera de rango', async () => {
            // Ejecutar la función con un índice fuera de rango
            await gameManager.iniciarOleada('room123', 100);

            // Verificar que se registró el error
            expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({
                operation: 'game:wave_start',
                status: 'error',
                details: expect.objectContaining({
                    reason: 'wave_out_of_range'
                })
            }));
        });

        it('debería manejar errores si no hay estado de juego', async () => {
            // Configurar el mock para que no haya estado de juego
            roomManager.getGameState.mockResolvedValue(null);

            // Ejecutar la función
            await gameManager.iniciarOleada('room123', 0);

            // Verificar que se registró el error
            expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({
                operation: 'game:wave_start',
                status: 'error',
                details: expect.objectContaining({
                    reason: 'game_state_not_found'
                })
            }));
        });
    });

    describe('cleanupIntervals', () => {
        it('debería limpiar todos los intervalos al detener', () => {
            // Mockear clearInterval
            global.clearInterval = jest.fn();

            // Ejecutar la función
            gameManager.cleanupIntervals();

            // Verificar que se llamó a clearInterval y se registró en audit trail
            expect(clearInterval).toHaveBeenCalled();
            expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({
                operation: 'game:cleanup_intervals'
            }));
        });
    });
});