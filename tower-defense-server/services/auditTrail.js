const { createClient } = require('redis');
const { Pool } = require('pg');
require('dotenv').config();
const fs = require('fs');

// Configuración de Redis
let redisClient;

// Configuración de PostgreSQL
const pgPool = new Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.POSTGRES_PORT,
    ssl: {
        rejectUnauthorized: true, // Obligatorio para RDS
        ca: fs.readFileSync('rds-ca-2019-root.pem').toString(), // Certificado AWS
    },
});

// Inicializar el cliente Redis para audit trail
function initializeAuditTrail(existingRedisClient) {
    if (existingRedisClient) {
        redisClient = existingRedisClient;
        console.log('Audit Trail: Usando cliente Redis existente');
        return;
    }

    redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.connect().catch(err => console.error('Error conectando a Redis para audit trail:', err));
    console.log('Audit Trail: Nuevo cliente Redis inicializado');

    // Verificar la conexión a PostgreSQL
    pgPool.query('SELECT NOW()', (err, res) => {
        if (err) {
            console.error('Error al conectar con PostgreSQL para audit trail:', err);
        } else {
            console.log('PostgreSQL conectado correctamente para audit trail');
        }
    });
}

// Registrar un evento en el audit trail
async function logEvent(data) {
    if (!redisClient || !redisClient.isOpen) {
        console.error('Audit trail no inicializado o Redis no conectado');
        return;
    }

    try {
        const eventData = {
            timestamp: new Date().toISOString(),
            userId: data.userId || 'anonymous',
            ip: data.ip || 'unknown',
            operation: data.operation,
            details: JSON.stringify(data.details || {}),
            serverId: process.env.SERVER_ID || `server-${process.env.PORT}`,
            status: data.status || 'success'
        };

        // Añadir a Redis Stream
        await redisClient.xAdd(
            'audit:events',
            '*',  // Redis asigna ID automáticamente
            eventData
        );

        // Log a consola en desarrollo
        if (process.env.NODE_ENV !== 'production') {
            console.log('[AUDIT]', JSON.stringify(eventData, null, 2));
        }

        // Mantener el stream a un tamaño manejable - CORREGIDO
        try {
            await redisClient.xTrim('audit:events', 'MAXLEN', 10000);
        } catch (trimError) {
            console.error('Error al recortar stream de audit:', trimError);
        }

        return true;
    } catch (error) {
        console.error('Error al guardar evento de auditoría en Redis:', error);
        return false;
    }
}

// Migrar eventos de Redis a PostgreSQL
async function migrateEventsToPostgres() {
    if (!redisClient || !redisClient.isOpen) {
        console.error('Audit trail no inicializado o Redis no conectado');
        return { success: false, error: 'Redis no conectado' };
    }

    try {
        // Verificar si hay eventos en el stream
        const streamInfo = await redisClient.xInfoStream('audit:events').catch(() => null);

        if (!streamInfo || streamInfo.length === 0) {
            console.log('No hay eventos para migrar a PostgreSQL');
            return { success: true, migrated: 0 };
        }

        // Obtener eventos desde Redis - CORREGIDO
        const streams = await redisClient.xRead([
            { key: 'audit:events', id: '0-0' }
        ], { COUNT: 100 });

        if (!streams || streams.length === 0 || !streams[0].messages || streams[0].messages.length === 0) {
            console.log('No se encontraron eventos para migrar a PostgreSQL');
            return { success: true, migrated: 0 };
        }

        const client = await pgPool.connect();
        try {
            // Iniciar una transacción
            await client.query('BEGIN');

            const messages = streams[0].messages;
            const ids = [];

            for (const msg of messages) {
                const event = msg.message;
                ids.push(msg.id);

                // Insertar en PostgreSQL
                await client.query(
                    `INSERT INTO audit_trail 
           (timestamp, user_id, ip_address, operation, details, server_id, status) 
           VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)`,
                    [
                        new Date(event.timestamp),
                        event.userId,
                        event.ip,
                        event.operation,
                        event.details, // PostgreSQL manejará la conversión de string a JSONB
                        event.serverId,
                        event.status
                    ]
                );
            }

            // Eliminar los eventos ya procesados de Redis
            if (ids.length > 0) {
                await redisClient.xDel('audit:events', ids);
            }

            // Confirmar la transacción
            await client.query('COMMIT');

            console.log(`${messages.length} eventos migrados a PostgreSQL`);
            return { success: true, migrated: messages.length };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error al migrar eventos a PostgreSQL:', error);
        return { success: false, error: error.message };
    }
}

// Configurar migración periódica
function scheduleMigration(intervalMinutes = 5) {
    // Convertir minutos a milisegundos
    const interval = intervalMinutes * 60 * 1000;

    // Programar migración periódica
    const timer = setInterval(async () => {
        try {
            const result = await migrateEventsToPostgres();
            if (result.success) {
                console.log(`Migración programada completada: ${result.migrated} eventos procesados`);
            }
        } catch (error) {
            console.error('Error en la migración programada:', error);
        }
    }, interval);

    // Asegurar que el timer no impida que Node.js termine
    timer.unref();

    console.log(`Migración a PostgreSQL programada cada ${intervalMinutes} minutos`);
    return timer;
}

// Purgar datos antiguos
async function purgeOldAuditData(olderThanDays = 180) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const result = await pgPool.query(
            'DELETE FROM audit_trail WHERE timestamp < $1',
            [cutoffDate]
        );

        console.log(`Eliminados ${result.rowCount} registros de audit_trail anteriores a ${cutoffDate.toISOString()}`);
        return { success: true, deleted: result.rowCount };
    } catch (error) {
        console.error('Error al purgar datos antiguos de auditoría:', error);
        return { success: false, error: error.message };
    }
}

// Exportar todas las funciones
module.exports = {
    initializeAuditTrail,
    logEvent,
    migrateEventsToPostgres,
    scheduleMigration,
    purgeOldAuditData
};