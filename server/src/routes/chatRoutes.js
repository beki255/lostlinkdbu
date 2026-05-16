const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/:chatId', chatController.getMessages);
router.post('/:chatId', chatController.sendMessage);
router.patch('/:chatId/read', chatController.markAsRead);

module.exports = router;
