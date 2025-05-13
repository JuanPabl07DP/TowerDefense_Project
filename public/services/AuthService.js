import { io } from 'socket.io-client';

class AuthService {
    constructor() {
        this.baseUrl = process.env.NODE_ENV === 'production'
            ? '/auth'
            : 'http://localhost:4000/auth';
    }

    async register(email, password, username) {
        try {
            const response = await fetch(`${this.baseUrl}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.toLowerCase(), // Asegurar minúsculas
                    password,
                    username
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Manejar errores específicos de Cognito
                if (data.error.includes('Username cannot be of email format')) {
                    return {
                        success: false,
                        error: 'Por favor usa solo el email como nombre de usuario'
                    };
                }
                return { success: false, error: data.error || 'Error en el registro' };
            }

            return { success: true, data };
        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: 'Error de conexión. Intenta nuevamente.'
            };
        }
    }

    async confirm(email, code) {
        try {
            const response = await fetch(`${this.baseUrl}/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.toLowerCase(),
                    code
                }),
            });

            const data = await response.json();
            return response.ok
                ? { success: true, data }
                : { success: false, error: data.error };
        } catch (error) {
            console.error('Confirmation error:', error);
            return { success: false, error: 'Error de conexión' };
        }
    }

    async login(email, password) {
        try {
            const response = await fetch(`${this.baseUrl}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.toLowerCase(),
                    password
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Manejar errores específicos
                if (data.error.includes('User is not confirmed')) {
                    return {
                        success: false,
                        error: 'Usuario no confirmado. Verifica tu email.',
                        needsConfirmation: true,
                        email: email.toLowerCase()
                    };
                }
                return {
                    success: false,
                    error: data.error || 'Credenciales inválidas'
                };
            }

            this.storeTokens(
                data.accessToken,
                data.refreshToken,
                data.idToken
            );
            return { success: true, data };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Error de conexión' };
        }
    }

    storeTokens(accessToken, refreshToken, idToken) {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('idToken', idToken);
    }

    clearTokens() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('idToken');
    }

    isAuthenticated() {
        return !!localStorage.getItem('accessToken');
    }

    async resendConfirmationCode(email) {
        try {
            const response = await fetch(`${this.baseUrl}/resend-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email.toLowerCase() }),
            });
            return await response.json();
        } catch (error) {
            console.error('Resend code error:', error);
            return { success: false, error: 'Error al reenviar el código' };
        }
    }
}

export const authService = new AuthService();