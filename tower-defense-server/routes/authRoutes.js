const express = require('express');
const router = express.Router();
const authService = require('../authService');

router.post('/register', async (req, res) => {
    const { email, password, username } = req.body;
    const result = await authService.registerUser(email, password, username);

    if (result.success) {
        res.status(201).json({ message: 'User registered. Please check your email for confirmation code.' });
    } else {
        res.status(400).json({ error: result.error });
    }
});

router.post('/confirm', async (req, res) => {
    const { email, code } = req.body;
    const result = await authService.confirmUser(email, code);

    if (result.success) {
        res.status(200).json({ message: 'User confirmed successfully' });
    } else {
        res.status(400).json({ error: result.error });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.loginUser(email, password);

    if (result.success) {
        res.status(200).json({
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            idToken: result.idToken,
            expiresIn: result.expiresIn
        });
    } else {
        res.status(401).json({ error: result.error });
    }
});

module.exports = router;