const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.post('/', feedbackController.submitFeedback);
router.get('/', authorize('admin'), feedbackController.getAllFeedback);

module.exports = router;
