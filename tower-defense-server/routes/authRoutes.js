const express = require('express');
const router = express.Router();
const authService = require('../authService');
const { logEvent } = require('../services/auditTrail');

router.post('/register', async (req, res) => {
    const { email, password, username } = req.body;

    // Obtener la dirección IP del cliente
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Registrar intento de registro en audit trail
    logEvent({
        userId: email,
        ip: clientIP,
        operation: 'auth:register',
        details: {
            username,
            email,
            userAgent: req.headers['user-agent']
        }
    });

    const result = await authService.registerUser(email, password, username);

    if (result.success) {
        // Registrar registro exitoso
        logEvent({
            userId: email,
            ip: clientIP,
            operation: 'auth:register',
            status: 'success',
            details: {
                username,
                userSub: result.userSub || 'unknown',
                timestamp: new Date().toISOString()
            }
        });

        res.status(201).json({ message: 'User registered. Please check your email for confirmation code.' });
    } else {
        // Registrar fallo de registro
        logEvent({
            userId: email,
            ip: clientIP,
            operation: 'auth:register',
            status: 'error',
            details: {
                error: result.error,
                username
            }
        });

        res.status(400).json({ error: result.error });
    }
});

router.post('/confirm', async (req, res) => {
    const { email, code } = req.body;

    // Obtener la dirección IP del cliente
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Registrar intento de confirmación en audit trail
    logEvent({
        userId: email,
        ip: clientIP,
        operation: 'auth:confirm',
        details: {
            email,
            codeProvided: !!code // Solo registramos si se proporcionó un código, no el código en sí
        }
    });

    const result = await authService.confirmUser(email, code);

    if (result.success) {
        // Registrar confirmación exitosa
        logEvent({
            userId: email,
            ip: clientIP,
            operation: 'auth:confirm',
            status: 'success',
            details: {
                timestamp: new Date().toISOString()
            }
        });

        res.status(200).json({ message: 'User confirmed successfully' });
    } else {
        // Registrar fallo de confirmación
        logEvent({
            userId: email,
            ip: clientIP,
            operation: 'auth:confirm',
            status: 'error',
            details: {
                error: result.error
            }
        });

        res.status(400).json({ error: result.error });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Obtener la dirección IP del cliente
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Registrar intento de inicio de sesión en audit trail
    logEvent({
        userId: email,
        ip: clientIP,
        operation: 'auth:login',
        details: {
            email,
            userAgent: req.headers['user-agent']
        }
    });

    const result = await authService.loginUser(email, password);

    if (result.success) {
        // Registrar inicio de sesión exitoso
        logEvent({
            userId: email,
            ip: clientIP,
            operation: 'auth:login',
            status: 'success',
            details: {
                timestamp: new Date().toISOString(),
                expiresIn: result.expiresIn
            }
        });

        res.status(200).json({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            idToken: result.idToken,
            expiresIn: result.expiresIn
        });
    } else {
        // Registrar fallo de inicio de sesión
        logEvent({
            userId: email,
            ip: clientIP,
            operation: 'auth:login',
            status: 'error',
            details: {
                error: result.error,
                needsConfirmation: result.needsConfirmation || false
            }
        });

        res.status(401).json({ error: result.error });
    }
});

// Ruta opcional para cerrar sesión
router.post('/logout', async (req, res) => {
    // Extraer el token de autorización
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Formato esperado: "Bearer TOKEN"

    // Obtener la dirección IP del cliente
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Intentar obtener el email del usuario del token decodificado o del cuerpo
    let userId = 'unknown';

    try {
        // Intentar extraer el email del token (esto es un ejemplo y depende de cómo estén estructurados tus tokens)
        // Si tienes un método para decodificar tokens JWT, podrías usarlo aquí
        if (req.body.email) {
            userId = req.body.email;
        }
    } catch (error) {
        console.error('Error decodificando token:', error);
    }

    // Registrar cierre de sesión en audit trail
    logEvent({
        userId,
        ip: clientIP,
        operation: 'auth:logout',
        details: {
            timestamp: new Date().toISOString(),
            userAgent: req.headers['user-agent']
        }
    });

    // Responder al cliente
    res.status(200).json({ message: 'Logged out successfully' });
});

// Ruta para resend confirmation code
router.post('/resend-code', async (req, res) => {
    const { email } = req.body;

    // Obtener la dirección IP del cliente
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Registrar solicitud de reenvío de código
    logEvent({
        userId: email,
        ip: clientIP,
        operation: 'auth:resend-code',
        details: {
            email,
            timestamp: new Date().toISOString()
        }
    });

    try {
        const result = await authService.resendConfirmationCode(email);

        if (result.success) {
            // Registrar reenvío exitoso
            logEvent({
                userId: email,
                ip: clientIP,
                operation: 'auth:resend-code',
                status: 'success',
                details: {
                    timestamp: new Date().toISOString()
                }
            });

            res.status(200).json({ message: 'Confirmation code resent successfully' });
        } else {
            // Registrar fallo de reenvío
            logEvent({
                userId: email,
                ip: clientIP,
                operation: 'auth:resend-code',
                status: 'error',
                details: {
                    error: result.error
                }
            });

            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        // Registrar error de reenvío
        logEvent({
            userId: email,
            ip: clientIP,
            operation: 'auth:resend-code',
            status: 'error',
            details: {
                error: error.message
            }
        });

        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;