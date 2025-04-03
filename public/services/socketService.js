import { io } from 'socket.io-client';

// Conectar al servidor de WebSockets - volver a localhost
const socket = io('http://localhost:4000', {
    withCredentials: true,
    transports: ['websocket', 'polling']
});

// Eventos de conexión y diagnóstico
socket.on('connect', () => {
    console.log('Conectado al servidor con ID:', socket.id);
});

socket.on('disconnect', () => {
    console.log('Desconectado del servidor');
});

socket.on('connect_error', (error) => {
    console.error('Error de conexión:', error.message);
});

// === FUNCIONES PARA SALAS ===
export function createRoom() {
    return new Promise((resolve) => {
        socket.emit('createRoom');
        socket.once('roomCreated', (data) => {
            resolve(data);
        });
    });
}

export function joinRoom(roomCode) {
    return new Promise((resolve, reject) => {
        socket.emit('joinRoom', { roomCode });

        // Manejar error (sala no existe o está llena)
        socket.once('joinError', (error) => {
            reject(error);
        });

        // Manejar unión exitosa
        socket.once('playerJoined', (data) => {
            resolve(data);
        });
    });
}

export function startGame(roomCode) {
    socket.emit('startGame', { roomCode });
}

// Nueva función para abandonar una sala
export function leaveRoom(roomCode) {
    socket.emit('leaveRoom', { roomCode });
}

export function onPlayerJoined(callback) {
    // Eliminar listener previo para evitar duplicados
    socket.off('playerJoined');
    socket.on('playerJoined', callback);
}

export function onGameStarted(callback) {
    // Eliminar listener previo para evitar duplicados
    socket.off('gameStarted');
    socket.on('gameStarted', callback);
}

export function onPlayerLeft(callback) {
    // Eliminar listener previo para evitar duplicados
    socket.off('playerLeft');
    socket.on('playerLeft', callback);
}

// === FUNCIONES PARA EL JUEGO ===
export function colocarTorre(x, y, tipo) {
    socket.emit('colocar-torre', { x, y, tipo });
}

export function onTorreColocada(callback) {
    socket.off('torre-colocada'); // Evitar duplicados
    socket.on('torre-colocada', callback);
}

export function onTorresActualizadas(callback) {
    socket.off('torres-actualizadas'); // Evitar duplicados
    socket.on('torres-actualizadas', callback);
}

export function dispararProyectil(x, y, targetId) {
    socket.emit('disparar-proyectil', { x, y, targetId });
}

export function onProyectilDisparado(callback) {
    socket.off('proyectil-disparado'); // Evitar duplicados
    socket.on('proyectil-disparado', callback);
}

export function onNuevoEnemigo(callback) {
    socket.off('nuevo-enemigo'); // Evitar duplicados
    socket.on('nuevo-enemigo', callback);
}

export function onEnemigoEliminado(callback) {
    socket.off('enemigo-eliminado'); // Evitar duplicados
    socket.on('enemigo-eliminado', callback);
}

export function onNuevaOleada(callback) {
    socket.off('nueva-oleada'); // Evitar duplicados
    socket.on('nueva-oleada', callback);
}

export function onOleadaCompletada(callback) {
    socket.off('oleada-completada'); // Evitar duplicados
    socket.on('oleada-completada', callback);
}

export function onEnemigosRestantes(callback) {
    socket.off('enemigos-restantes'); // Evitar duplicados
    socket.on('enemigos-restantes', callback);
}

export function onTemporizadorOleada(callback) {
    socket.off('temporizador-oleada'); // Evitar duplicados
    socket.on('temporizador-oleada', callback);
}

// Nuevo evento para sincronizar posiciones de enemigos
export function onEnemyPositionUpdated(callback) {
    socket.off('update-enemy-position'); // Evitar duplicados
    socket.on('update-enemy-position', callback);
}

// Nuevo evento para cuando un enemigo llega a la base
export function onEnemyReachedBase(callback) {
    socket.off('enemigo-reached-base'); // Evitar duplicados
    socket.on('enemigo-reached-base', callback);
}

// Función para gastar monedas
export function gastarMonedas(cantidad) {
    socket.emit('gastar-monedas', cantidad);
}

// Función para agregar monedas
export function agregarMonedas(cantidad) {
    socket.emit('agregar-monedas', cantidad);
}

export function onActualizarMonedas(callback) {
    socket.off('actualizar-monedas'); // Evitar duplicados
    socket.on('actualizar-monedas', callback);
}