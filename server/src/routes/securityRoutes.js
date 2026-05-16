const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin', 'security'));

router.get('/devices', securityController.listDevices);
router.post('/devices', securityController.registerDevice);
router.get('/devices/:id', securityController.getDevice);
router.delete('/devices/:id', securityController.deleteDevice);

module.exports = router;
