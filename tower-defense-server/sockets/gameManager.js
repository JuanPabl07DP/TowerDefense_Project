function initializeGameManager(io, roomManager, redisClient) {
    // Configuración de oleadas (compartida por todas las salas)
    const oleadasConfig = [
        { cantidad: 10, delay: 2000, espera: 10000 },
        { cantidad: 15, delay: 2000, espera: 12000 },
        { cantidad: 20, delay: 2000, espera: 15000 },
        { cantidad: 25, delay: 2000, espera: 10000 },
        { cantidad: 30, delay: 1500, espera: 8000 },
        { cantidad: 7, delay: 1500, espera: 10000 }
    ];

    // Registrar las oleadas en Redis para que estén disponibles en todos los servidores
    async function initializeRedisGameData() {
        try {
            // Guardar la configuración de oleadas en Redis
            await redisClient.set('game:oleadas_config', JSON.stringify(oleadasConfig));
            console.log('Configuración de oleadas guardada en Redis');

            // También podríamos guardar otras configuraciones globales aquí
        } catch (error) {
            console.error('Error al inicializar datos de juego en Redis:', error);
        }
    }

    // Inicializar datos en Redis
    initializeRedisGameData();

    // Seguimiento de intervalos activos por sala
    const activeIntervals = new Map();

    /**
     * Inicializa el estado del juego para una nueva sala
     * @returns {Object} Estado inicial del juego
     */
    function initializeGameState() {
        return {
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
        };
    }

    /**
     * Genera el camino que seguirán los enemigos
     * @returns {Array} Array de puntos {x,y} que forman el camino
     */
    function generatePath() {
        const tileSize = 60;
        const pathCoords = [
            { row: 0, col: 12 }, { row: 2, col: 12 },
            { row: 2, col: 10 }, { row: 4, col: 8 },
            { row: 8, col: 8 }, { row: 8, col: 16 },
            { row: 11, col: 16 }, { row: 11, col: 20 },
            { row: 13, col: 23 }, { row: 15, col: 23 }
        ];

        return pathCoords.map(point => ({
            x: point.col * tileSize + (tileSize / 2),
            y: point.row * tileSize + (tileSize / 2)
        }));
    }

    /**
     * Inicia una nueva oleada de enemigos
     * @param {string} roomCode - Código de la sala
     * @param {number} oleadaIndex - Índice de la oleada (0-based)
     * @returns {Promise<void>}
     */
    async function iniciarOleada(roomCode, oleadaIndex) {
        try {
            // Verificar que la sala existe
            const roomExists = await roomManager.roomExists(roomCode);
            if (!roomExists) {
                console.error(`No se puede iniciar oleada: la sala ${roomCode} no existe`);
                return;
            }

            // Verificar límite de oleadas
            if (oleadaIndex >= oleadasConfig.length) {
                console.log(`Oleada ${oleadaIndex} fuera de rango, no se inicia`);
                return;
            }

            // Obtener configuración de la oleada
            const config = oleadasConfig[oleadaIndex];

            // Obtener estado actual del juego
            let gameState = await roomManager.getGameState(roomCode);
            if (!gameState) {
                console.error(`No se encontró estado de juego para sala ${roomCode}`);
                return;
            }

            // Actualizar estado del juego para la nueva oleada
            gameState.oleadaActual = oleadaIndex + 1;
            gameState.enemigosRestantes = config.cantidad;
            gameState.enOleada = true;

            // Reiniciar contadores para la nueva oleada
            gameState.enemyCounters = {
                basic: 0,
                fast: 0,
                strong: 0,
                total: 0
            };

            // Guardar estado actualizado
            await roomManager.saveGameState(roomCode, gameState);

            // Notificar a los clientes
            io.to(roomCode).emit('nueva-oleada', gameState.oleadaActual);
            io.to(roomCode).emit('enemigos-restantes', gameState.enemigosRestantes);

            console.log(`Iniciando oleada ${gameState.oleadaActual} en sala ${roomCode}`);

            // Limpiar intervalos anteriores si existen
            if (activeIntervals.has(`enemies:${roomCode}`)) {
                clearInterval(activeIntervals.get(`enemies:${roomCode}`));
            }

            // Crear intervalo para generar enemigos
            const intervaloEnemigos = setInterval(async () => {
                try {
                    // Recargar estado actual para cada enemigo
                    gameState = await roomManager.getGameState(roomCode);
                    if (!gameState) {
                        clearInterval(intervaloEnemigos);
                        return;
                    }

                    // Si quedan enemigos por generar
                    if (gameState.enemigosRestantes > 0) {
                        // Crear nuevo enemigo
                        const nuevoEnemigo = await crearNuevoEnemigo(gameState.oleadaActual, roomCode);
                        if (!nuevoEnemigo) {
                            console.error('Error al crear enemigo');
                            return;
                        }

                        // Añadir enemigo al estado
                        if (!gameState.enemigos) gameState.enemigos = [];
                        gameState.enemigos.push(nuevoEnemigo);
                        gameState.enemigosRestantes--;

                        // Guardar estado actualizado
                        await roomManager.saveGameState(roomCode, gameState);

                        // Notificar a los clientes
                        io.to(roomCode).emit('nuevo-enemigo', nuevoEnemigo);
                        io.to(roomCode).emit('enemigos-restantes', gameState.enemigosRestantes);
                    } else {
                        // Fin de la generación de enemigos
                        clearInterval(intervaloEnemigos);
                        activeIntervals.delete(`enemies:${roomCode}`);

                        // Actualizar estado
                        gameState.enOleada = false;
                        await roomManager.saveGameState(roomCode, gameState);

                        // Iniciar temporizador para la siguiente oleada
                        iniciarTemporizadorSiguienteOleada(roomCode, oleadaIndex, config.espera);
                    }
                } catch (error) {
                    console.error(`Error en intervalo de enemigos para sala ${roomCode}:`, error);
                    clearInterval(intervaloEnemigos);
                    activeIntervals.delete(`enemies:${roomCode}`);
                }
            }, config.delay);

            // Guardar referencia al intervalo
            activeIntervals.set(`enemies:${roomCode}`, intervaloEnemigos);

        } catch (error) {
            console.error(`Error al iniciar oleada ${oleadaIndex} en sala ${roomCode}:`, error);
        }
    }

    /**
     * Crea un nuevo enemigo según la distribución de la oleada actual
     * @param {number} oleadaActual - Número de oleada actual (1-based)
     * @param {string} roomCode - Código de la sala
     * @returns {Promise<Object>} Nuevo enemigo creado
     */
    async function crearNuevoEnemigo(oleadaActual, roomCode) {
        try {
            // Por defecto, tipo básico
            let enemyType = 'basic';

            // Obtener estado actual
            const gameState = await roomManager.getGameState(roomCode);
            if (!gameState) return null;

            // Obtener la configuración de la oleada actual
            const oleadaIndex = oleadaActual - 1;

            // Caso especial para la oleada 6 (todos strong)
            if (oleadaActual === 6) {
                enemyType = 'strong';
            }
            // Para las oleadas 1-5, usar distribución específica
            else {
                // Inicializar contadores si no existen
                if (!gameState.enemyCounters) {
                    gameState.enemyCounters = {
                        basic: 0,
                        fast: 0,
                        strong: 0,
                        total: 0
                    };
                }

                const counters = gameState.enemyCounters;

                // Definir la distribución para cada oleada
                const distribucion = {
                    1: { basic: 6, fast: 4, strong: 0 },    // 10 enemigos
                    2: { basic: 7, fast: 5, strong: 3 },    // 15 enemigos
                    3: { basic: 8, fast: 8, strong: 4 },    // 20 enemigos
                    4: { basic: 10, fast: 10, strong: 5 },  // 25 enemigos
                    5: { basic: 10, fast: 15, strong: 5 }   // 30 enemigos
                    // Oleada 6 no necesita distribución (todos strong)
                };

                // Obtener la distribución para esta oleada
                const dist = distribucion[oleadaActual];

                // Crear array con tipos disponibles
                const availableTypes = [];

                if (counters.basic < dist.basic) {
                    availableTypes.push('basic');
                }

                if (counters.fast < dist.fast) {
                    availableTypes.push('fast');
                }

                if (counters.strong < dist.strong) {
                    availableTypes.push('strong');
                }

                // Seleccionar un tipo aleatorio de los disponibles
                if (availableTypes.length > 0) {
                    const randomIndex = Math.floor(Math.random() * availableTypes.length);
                    enemyType = availableTypes[randomIndex];
                }

                // Incrementar contadores
                counters[enemyType]++;
                counters.total++;

                // Reiniciar contadores al final de la oleada
                if (counters.total >= oleadasConfig[oleadaIndex].cantidad) {
                    gameState.enemyCounters = {
                        basic: 0,
                        fast: 0,
                        strong: 0,
                        total: 0
                    };
                }

                // Actualizar contadores en el estado
                await roomManager.saveGameState(roomCode, gameState);
            }

            // Crear y devolver el nuevo enemigo
            return {
                id: Date.now() + Math.floor(Math.random() * 1000),
                type: enemyType,
                oleada: oleadaActual,
                path: generatePath(),
                currentPoint: 0,
                x: generatePath()[0].x,
                y: generatePath()[0].y
            };
        } catch (error) {
            console.error(`Error al crear enemigo en sala ${roomCode}:`, error);
            return null;
        }
    }

    /**
     * Inicia el temporizador para la siguiente oleada
     * @param {string} roomCode - Código de la sala
     * @param {number} oleadaIndex - Índice de la oleada actual (0-based)
     * @param {number} espera - Tiempo de espera en milisegundos
     * @returns {Promise<void>}
     */
    async function iniciarTemporizadorSiguienteOleada(roomCode, oleadaIndex, espera) {
        try {
            // Verificar que la sala existe
            const roomExists = await roomManager.roomExists(roomCode);
            if (!roomExists) return;

            // Limpiar intervalo anterior si existe
            if (activeIntervals.has(`timer:${roomCode}`)) {
                clearInterval(activeIntervals.get(`timer:${roomCode}`));
            }

            let segundosRestantes = espera / 1000;
            io.to(roomCode).emit('temporizador-oleada', segundosRestantes);

            const intervalo = setInterval(async () => {
                try {
                    // Verificar que la sala sigue existiendo
                    const stillExists = await roomManager.roomExists(roomCode);
                    if (!stillExists) {
                        clearInterval(intervalo);
                        activeIntervals.delete(`timer:${roomCode}`);
                        return;
                    }

                    segundosRestantes--;
                    io.to(roomCode).emit('temporizador-oleada', segundosRestantes);

                    if (segundosRestantes <= 0) {
                        clearInterval(intervalo);
                        activeIntervals.delete(`timer:${roomCode}`);

                        // Iniciar siguiente oleada
                        await iniciarOleada(roomCode, oleadaIndex + 1);
                    }
                } catch (error) {
                    console.error(`Error en temporizador para sala ${roomCode}:`, error);
                    clearInterval(intervalo);
                    activeIntervals.delete(`timer:${roomCode}`);
                }
            }, 1000);

            // Guardar referencia al intervalo
            activeIntervals.set(`timer:${roomCode}`, intervalo);

        } catch (error) {
            console.error(`Error al iniciar temporizador para sala ${roomCode}:`, error);
        }
    }

    /**
     * Actualiza la posición de todos los enemigos en todas las salas
     * @returns {Promise<void>}
     */
    async function updateEnemyPositions() {
        try {
            // Obtener todas las claves de salas en Redis
            const roomKeys = await redisClient.keys('room:*');

            // Filtrar solo los IDs de sala (sin prefijos)
            const roomCodes = roomKeys
                .filter(key => !key.includes(':'))
                .map(key => key.replace('room:', ''));

            // Para cada sala
            for (const roomCode of roomCodes) {
                try {
                    // Obtener estado de la sala
                    const roomStatus = await redisClient.hGet(`room:${roomCode}`, 'status');
                    if (roomStatus !== 'playing') continue;

                    // Obtener estado del juego
                    const gameState = await roomManager.getGameState(roomCode);
                    if (!gameState || !gameState.enemigos || gameState.enemigos.length === 0) continue;

                    // Actualizar cada enemigo
                    const enemigosActualizados = [];
                    const enemigosEliminados = [];

                    for (const enemigo of gameState.enemigos) {
                        // Si el enemigo ha llegado a la base o ya no existe
                        if (!enemigo || !enemigo.path || enemigo.currentPoint >= enemigo.path.length) {
                            enemigosEliminados.push(enemigo.id);
                            continue;
                        }

                        // Actualizar posición
                        const enemigoActualizado = actualizarPosicionEnemigo(enemigo, roomCode);

                        // Si llegó a la base
                        if (enemigoActualizado.reachedBase) {
                            enemigosEliminados.push(enemigo.id);

                            // Enviar evento de enemigo llegado a la base
                            io.to(roomCode).emit('enemigo-reached-base', {
                                enemyId: enemigo.id,
                                damage: enemigoActualizado.damage
                            });
                        } else {
                            // Guardar enemigo actualizado
                            enemigosActualizados.push(enemigoActualizado.enemigo);

                            // Enviar actualización de posición
                            io.to(roomCode).emit('update-enemy-position', {
                                id: enemigo.id,
                                x: enemigoActualizado.enemigo.x,
                                y: enemigoActualizado.enemigo.y,
                                currentPoint: enemigoActualizado.enemigo.currentPoint
                            });
                        }
                    }

                    // Actualizar lista de enemigos
                    gameState.enemigos = enemigosActualizados;

                    // Guardar estado actualizado
                    await roomManager.saveGameState(roomCode, gameState);

                } catch (error) {
                    console.error(`Error actualizando enemigos en sala ${roomCode}:`, error);
                }
            }
        } catch (error) {
            console.error('Error al actualizar posiciones de enemigos:', error);
        }
    }

    /**
     * Actualiza la posición de un enemigo
     * @param {Object} enemigo - Enemigo a actualizar
     * @param {string} roomCode - Código de la sala
     * @returns {Object} Enemigo actualizado y si llegó a la base
     */
    function actualizarPosicionEnemigo(enemigo, roomCode) {
        // Si el enemigo ha llegado al final del camino
        if (enemigo.currentPoint >= enemigo.path.length - 1) {
            // Determinar el daño según el tipo de enemigo
            let damage = 10; // Default
            if (enemigo.type === 'strong') damage = 20;
            if (enemigo.type === 'fast') damage = 5;

            // Enemigo llegó a la base
            return {
                enemigo,
                reachedBase: true,
                damage
            };
        }

        // Si el enemigo sigue en el camino
        const nextPoint = enemigo.path[enemigo.currentPoint + 1];
        let speed = 1;

        // Ajustar velocidad según tipo
        if (enemigo.type === 'strong') speed *= 0.5;
        if (enemigo.type === 'fast') speed *= 2.5;

        // Calcular dirección
        const dx = nextPoint.x - enemigo.x;
        const dy = nextPoint.y - enemigo.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Mover enemigo
        if (distance > speed) {
            enemigo.x += (dx / distance) * speed;
            enemigo.y += (dy / distance) * speed;
        } else {
            // Llegó al siguiente punto
            enemigo.x = nextPoint.x;
            enemigo.y = nextPoint.y;
            enemigo.currentPoint++;
        }

        return {
            enemigo,
            reachedBase: false
        };
    }

    // Limpiar intervalos al reiniciar servidor
    function cleanupIntervals() {
        for (const interval of activeIntervals.values()) {
            clearInterval(interval);
        }
        activeIntervals.clear();
    }

    // Registrar event listener para limpieza al cerrar
    process.on('SIGTERM', cleanupIntervals);
    process.on('SIGINT', cleanupIntervals);

    // Iniciar el bucle de actualización (30 fps)
    const updateInterval = setInterval(updateEnemyPositions, 1000 / 30);
    activeIntervals.set('global:updateEnemyPositions', updateInterval);

    return {
        initializeGameState,
        iniciarOleada,
        updateEnemyPositions,
        cleanupIntervals
    };
}

module.exports = {
    initializeGameManager
};