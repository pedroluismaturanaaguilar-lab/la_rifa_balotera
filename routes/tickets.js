const express = require('express');
const router = express.Router();
const { requireAuth } = require('../config/authMiddleware');
const ticketController = require('../controllers/ticketController');

router.get('/', requireAuth, ticketController.list);
router.post('/', requireAuth, ticketController.addCodes);
router.delete('/:id', requireAuth, ticketController.remove);

module.exports = router;
