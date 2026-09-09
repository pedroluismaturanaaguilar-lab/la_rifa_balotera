const express = require('express');
const router = express.Router();
const { requireAuth } = require('../config/authMiddleware');
const drawController = require('../controllers/drawController');

router.get('/status', requireAuth, drawController.status);
router.post('/prepare', requireAuth, drawController.prepare);
router.post('/start', requireAuth, drawController.start);
router.post('/finish', requireAuth, drawController.finish);
router.post('/reset', requireAuth, drawController.reset);

module.exports = router;
