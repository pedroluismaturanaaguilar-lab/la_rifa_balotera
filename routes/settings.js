const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { requireAuth } = require('../config/authMiddleware');

// Publica: usada por la pantalla de bienvenida y la pantalla publica
router.get('/public', settingsController.getPublicSettings);

// Protegidas: solo el administrador
router.get('/', requireAuth, settingsController.getAllSettingsHandler);
router.put('/', requireAuth, settingsController.updateSettingsHandler);

module.exports = router;
