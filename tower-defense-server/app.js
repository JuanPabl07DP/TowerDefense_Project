require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');

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

// Nuevas rutas de autenticación
app.use('/auth', authRoutes);

// Servir archivos estáticos en producción
if (isProduction) {
    app.use(express.static(path.join(__dirname, '../dist')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist', 'index.html'));
    });
}

module.exports = app;