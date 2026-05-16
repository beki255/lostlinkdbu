const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', matchController.getMyMatches);
router.get('/:id', matchController.getMatch);
router.patch('/:id/status', matchController.updateMatchStatus);
router.get('/:id/chat', matchController.getMatchChat);
router.post('/:id/ask-ai', matchController.askAI);

module.exports = router;
