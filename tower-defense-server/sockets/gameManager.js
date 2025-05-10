function initializeGameManager(io, roomManager) {
    // Configuración de oleadas (compartida por todas las salas)
    const oleadasConfig = [
        { cantidad: 6, delay: 1500, espera: 10000 },
        { cantidad: 13, delay: 1500, espera: 12000 },
        { cantidad: 18, delay: 1500, espera: 15000 },
        { cantidad: 25, delay: 1500, espera: 10000 }
    ];

    function initializeGameState() {
        return {
            torres: [],
            enemigos: [],
            monedas: 100,
            oleadaActual: 1,
            enemigosRestantes: 0,
            enOleada: false,
            primeraConexion: true
        };
    }

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

    function iniciarOleada(roomCode, oleadaIndex) {
        if (oleadaIndex >= oleadasConfig.length) return;

        const config = oleadasConfig[oleadaIndex];
        const gameState = roomManager.rooms[roomCode].gameState;

        gameState.oleadaActual = oleadaIndex + 1;
        gameState.enemigosRestantes = config.cantidad;
        gameState.enOleada = true;

        io.to(roomCode).emit('nueva-oleada', gameState.oleadaActual);
        io.to(roomCode).emit('enemigos-restantes', gameState.enemigosRestantes);

        const intervaloEnemigos = setInterval(() => {
            if (gameState.enemigosRestantes > 0) {
                const nuevoEnemigo = crearNuevoEnemigo(gameState.oleadaActual, roomCode);
                gameState.enemigos.push(nuevoEnemigo);
                io.to(roomCode).emit('nuevo-enemigo', nuevoEnemigo);
                gameState.enemigosRestantes--;
                io.to(roomCode).emit('enemigos-restantes', gameState.enemigosRestantes);
            } else {
                clearInterval(intervaloEnemigos);
                gameState.enOleada = false;
                iniciarTemporizadorSiguienteOleada(roomCode, oleadaIndex, config.espera);
            }
        }, config.delay);
    }

    function crearNuevoEnemigo(oleadaActual, roomCode) {
        let enemyType = 'basic';
        if (oleadaActual >= 3) {
            const rand = Math.random();
            if (rand < 0.3) enemyType = 'strong';
            else if (rand < 0.6) enemyType = 'fast';
        }

        return {
            id: Date.now() + Math.floor(Math.random() * 1000),
            type: enemyType,
            oleada: oleadaActual,
            path: generatePath(),
            currentPoint: 0,
            x: generatePath()[0].x,
            y: generatePath()[0].y
        };
    }

    function iniciarTemporizadorSiguienteOleada(roomCode, oleadaIndex, espera) {
        let segundosRestantes = espera / 1000;
        io.to(roomCode).emit('temporizador-oleada', segundosRestantes);

        const intervalo = setInterval(() => {
            segundosRestantes--;
            io.to(roomCode).emit('temporizador-oleada', segundosRestantes);

            if (segundosRestantes <= 0) {
                clearInterval(intervalo);
                iniciarOleada(roomCode, oleadaIndex + 1);
            }
        }, 1000);
    }

    function updateEnemyPositions() {
        for (const roomCode in roomManager.rooms) {
            const room = roomManager.rooms[roomCode];
            if (room.status !== 'playing') continue;

            room.gameState.enemigos.forEach(enemigo => {
                actualizarPosicionEnemigo(enemigo, roomCode);
            });
        }
    }

    function actualizarPosicionEnemigo(enemigo, roomCode) {
        if (enemigo.currentPoint < enemigo.path.length - 1) {
            const nextPoint = enemigo.path[enemigo.currentPoint + 1];
            let speed = 1;
            if (enemigo.type === 'strong') speed *= 0.5;
            if (enemigo.type === 'fast') speed *= 1.5;

            const dx = nextPoint.x - enemigo.x;
            const dy = nextPoint.y - enemigo.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > speed) {
                enemigo.x += (dx / distance) * speed;
                enemigo.y += (dy / distance) * speed;
            } else {
                enemigo.x = nextPoint.x;
                enemigo.y = nextPoint.y;
                enemigo.currentPoint++;
            }

            io.to(roomCode).emit('update-enemy-position', {
                id: enemigo.id,
                x: enemigo.x,
                y: enemigo.y,
                currentPoint: enemigo.currentPoint
            });
        } else if (enemigo.currentPoint === enemigo.path.length - 1) {
            // Enemigo llegó a la base
            roomManager.rooms[roomCode].gameState.enemigos =
                roomManager.rooms[roomCode].gameState.enemigos.filter(e => e.id !== enemigo.id);
            io.to(roomCode).emit('enemigo-reached-base', enemigo.id);
        }
    }

    // Iniciar el bucle de actualización (30 fps)
    setInterval(updateEnemyPositions, 1000 / 30);

    return {
        initializeGameState,
        iniciarOleada,
        updateEnemyPositions
    };
}

module.exports = {
    initializeGameManager
};