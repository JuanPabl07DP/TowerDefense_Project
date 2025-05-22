const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/authRoutes');
const authService = require('../authService');
const { logEvent } = require('../services/auditTrail');

// Mockear authService y auditTrail
jest.mock('../authService');
jest.mock('../services/auditTrail');

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /auth/register', () => {
        it('debería registrar un usuario y devolver 201', async () => {
            authService.registerUser.mockResolvedValue({ success: true, userSub: '123' });

            const response = await request(app)
                .post('/auth/register')
                .send({ email: 'test@example.com', password: 'password', username: 'testuser' });

            expect(response.statusCode).toBe(201);
            expect(response.body).toEqual({ message: 'User registered. Please check your email for confirmation code.' });
            expect(logEvent).toHaveBeenCalledTimes(2); // Intento y éxito
        });

        it('debería manejar errores de registro', async () => {
            authService.registerUser.mockResolvedValue({ success: false, error: 'Email already exists' });

            const response = await request(app)
                .post('/auth/register')
                .send({ email: 'test@example.com', password: 'password', username: 'testuser' });

            expect(response.statusCode).toBe(400);
            expect(response.body).toEqual({ error: 'Email already exists' });
            expect(logEvent).toHaveBeenCalledTimes(2); // Intento y error
        });
    });

    describe('POST /auth/confirm', () => {
        it('debería confirmar un usuario y devolver 200', async () => {
            authService.confirmUser.mockResolvedValue({ success: true });

            const response = await request(app)
                .post('/auth/confirm')
                .send({ email: 'test@example.com', code: '123456' });

            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual({ message: 'User confirmed successfully' });
            expect(logEvent).toHaveBeenCalledTimes(2); // Intento y éxito
        });

        it('debería manejar errores de confirmación', async () => {
            authService.confirmUser.mockResolvedValue({ success: false, error: 'Invalid code' });

            const response = await request(app)
                .post('/auth/confirm')
                .send({ email: 'test@example.com', code: '123456' });

            expect(response.statusCode).toBe(400);
            expect(response.body).toEqual({ error: 'Invalid code' });
            expect(logEvent).toHaveBeenCalledTimes(2); // Intento y error
        });
    });

    describe('POST /auth/login', () => {
        it('debería iniciar sesión exitosamente', async () => {
            authService.loginUser.mockResolvedValue({
                success: true,
                accessToken: 'token123',
                refreshToken: 'refresh123',
                idToken: 'id123',
                expiresIn: 3600
            });

            const response = await request(app)
                .post('/auth/login')
                .send({ email: 'test@example.com', password: 'password' });

            expect(response.statusCode).toBe(200);
            expect(response.body).toEqual({
                accessToken: 'token123',
                refreshToken: 'refresh123',
                idToken: 'id123',
                expiresIn: 3600
            });
            expect(logEvent).toHaveBeenCalledTimes(2); // Intento y éxito
        });

        it('debería manejar errores de autenticación', async () => {
            authService.loginUser.mockResolvedValue({ success: false, error: 'Invalid credentials' });

            const response = await request(app)
                .post('/auth/login')
                .send({ email: 'test@example.com', password: 'password' });

            expect(response.statusCode).toBe(401);
            expect(response.body).toEqual({ error: 'Invalid credentials' });
            expect(logEvent).toHaveBeenCalledTimes(2); // Intento y error
        });
    });
});