const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));

router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.get('/users-lost-found', adminController.getLostFoundUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id', adminController.updateUser);
router.patch('/users/:id/role', adminController.updateUserRole);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.get('/users/:id/items', adminController.getUserItems);
router.get('/received-items', adminController.getReceivedItems);
router.delete('/users/:id', adminController.deleteUser);
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/reports', adminController.getReportsSummary);
router.get('/audit-logs', adminController.getAuditLogs);
router.get('/cms', adminController.getCmsPages);
router.post('/cms', adminController.createCmsPage);
router.patch('/cms/:id', adminController.updateCmsPage);
router.delete('/cms/:id', adminController.deleteCmsPage);

module.exports = router;
