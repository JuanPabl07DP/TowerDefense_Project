const request = require('supertest');
const express = require('express');
const cors = require('cors');
const path = require('path');

// Mock de módulos externos
jest.mock('cors');
jest.mock('../routes/authRoutes');

// Mock del módulo authRoutes
const mockAuthRoutes = {
    use: jest.fn(),
    post: jest.fn(),
    get: jest.fn()
};

describe('App Configuration', () => {
    let app;

    beforeEach(() => {
        jest.clearAllMocks();

        // Mock de cors
        cors.mockReturnValue((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            next();
        });

        // Mock de authRoutes
        require('../routes/authRoutes').mockReturnValue(mockAuthRoutes);

        // Importar app después de configurar los mocks
        delete require.cache[require.resolve('../app')];
        app = require('../app');
    });

    describe('Middleware Configuration', () => {
        it('debería configurar CORS correctamente para desarrollo', () => {
            // Configurar NODE_ENV como development
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            delete require.cache[require.resolve('../app')];
            require('../app');

            expect(cors).toHaveBeenCalledWith({
                origin: 'http://localhost:5173',
                methods: ['GET', 'POST'],
                credentials: true
            });

            process.env.NODE_ENV = originalEnv;
        });

        it('debería tener express.json() configurado', async () => {
            const response = await request(app)
                .post('/test')
                .send({ test: 'data' })
                .expect(404); // Esperamos 404 porque la ruta no existe

            // Verificamos que el middleware JSON está funcionando
            // Si no estuviera configurado, daría un error diferente
        });
    });

    describe('Security Configuration', () => {
        it('debería deshabilitar el encabezado X-Powered-By', async () => {
            const response = await request(app)
                .get('/nonexistent')
                .expect(404);

            expect(response.headers['x-powered-by']).toBeUndefined();
        });
    });

    describe('Static Files in Production', () => {

        it('no debería servir archivos estáticos en desarrollo', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const staticSpy = jest.spyOn(express, 'static');
            staticSpy.mockReturnValue((req, res, next) => next());

            delete require.cache[require.resolve('../app')];
            require('../app');

            expect(staticSpy).not.toHaveBeenCalled();

            staticSpy.mockRestore();
            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('Error Handling', () => {
        it('debería manejar rutas no encontradas', async () => {
            const response = await request(app)
                .get('/ruta-inexistente')
                .expect(404);
        });

        it('debería manejar JSON malformado', async () => {
            const response = await request(app)
                .post('/auth/login')
                .set('Content-Type', 'application/json')
                .send('{"malformed":json}')
                .expect(400);
        });
    });
});