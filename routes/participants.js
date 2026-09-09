const express = require('express');
const router = express.Router();
const { requireAuth } = require('../config/authMiddleware');
const participantController = require('../controllers/participantController');

router.get('/', requireAuth, participantController.list);
router.post('/', requireAuth, participantController.create);
router.put('/:id', requireAuth, participantController.update);
router.delete('/:id', requireAuth, participantController.remove);

module.exports = router;
