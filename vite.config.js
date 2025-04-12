import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: path.resolve(__dirname, 'public'), // Ajusta según la ubicación de tus archivos frontend (ej: 'src', 'public', etc.)
    build: {
        outDir: path.resolve(__dirname, 'dist'), // La carpeta 'dist' se creará en la raíz del proyecto
        emptyOutDir: true, // Limpia la carpeta 'dist' antes de cada build
    },
    server: {
        host: '0.0.0.0', // Permite acceder desde cualquier IP (útil en EC2)
        port: 5173,      // Puerto para desarrollo (asegúrate de abrirlo en el grupo de seguridad de AWS)
    },
});