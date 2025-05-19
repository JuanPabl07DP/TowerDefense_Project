import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: path.resolve(__dirname, 'public'), // Ajusta según la ubicación de tus archivos frontend

    // Combinamos todas las configuraciones de build en una sola
    build: {
        outDir: path.resolve(__dirname, 'dist'), // La carpeta 'dist' se creará en la raíz del proyecto
        emptyOutDir: true, // Limpia la carpeta 'dist' antes de cada build
        minify: 'terser',    // Usar Terser para minificación
        sourcemap: false,    // Desactivar sourcemaps en producción
        chunkSizeWarningLimit: 1000, // Aumentar límite de advertencia por tamaño de chunk
        rollupOptions: {
            output: {
                manualChunks: {
                    // Separa las dependencias en chunks para mejor caching
                    vendor: ['phaser', 'socket.io-client'],
                    // Chunk para escenas del juego
                    scenes: [
                        './public/scenes/GameScene.js',
                        './public/scenes/MenuScene.js',
                        './public/scenes/LobbyScene.js'
                    ]
                }
            }
        }
    },

    server: {
        host: '0.0.0.0', // Permite acceder desde cualquier IP (útil en EC2)
        port: 5173,      // Puerto para desarrollo
        proxy: {
            // Proxy para WebSockets (Socket.io)
            '/socket.io': {
                target: 'http://localhost:8080', // Dirección del balanceador Nginx
                ws: true,                        // Habilitar soporte WebSockets
                changeOrigin: true,              // Cambiar el encabezado Origin
                secure: false                    // No validar certificados SSL
            },
            // Proxy para rutas de autenticación
            '/auth': {
                target: 'http://localhost:8080', // Dirección del balanceador Nginx
                changeOrigin: true,              // Cambiar el encabezado Origin
                secure: false                    // No validar certificados SSL
            }
        }
    },

    // Opciones para mejorar la experiencia de desarrollo
    optimizeDeps: {
        include: ['phaser', 'socket.io-client'] // Pre-empaquetado de dependencias comunes
    }
});