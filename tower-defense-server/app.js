const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Configuración para producción/desarrollo
const isProduction = process.env.NODE_ENV === 'production';
const frontendOrigin = isProduction ? '*' : 'http://localhost:5173';

// Middleware
app.use(cors({
    origin: frontendOrigin,
    methods: ['GET', 'POST'],
    credentials: true
}));
app.use(express.json());

// Servir archivos estáticos en producción
if (isProduction) {
    app.use(express.static(path.join(__dirname, '../dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist', 'index.html'));
    });
}

module.exports = app;