const crypto = require('crypto');

function generateRandomString(length, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    // Crear un array de bytes aleatorios criptográficamente seguros
    const randomBytes = crypto.randomBytes(length);
    let result = '';

    // Convertir bytes a caracteres del conjunto especificado
    for (let i = 0; i < length; i++) {
        // Usar módulo para mapear el byte a un índice dentro del rango de caracteres
        const randomIndex = randomBytes[i] % chars.length;
        result += chars.charAt(randomIndex);
    }

    return result;
}

function generateRoomCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return generateRandomString(6, characters);
}

module.exports = {
    generateRandomString,
    generateRoomCode
};