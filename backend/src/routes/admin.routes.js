const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middlewares/auth');
const adminMiddleware = require('../middlewares/admin');

// All admin routes require auth + admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// Users management
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.patch('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Jobs management
router.get('/jobs', adminController.getAllJobs);
router.get('/jobs/:id', adminController.getJobById);
router.post('/jobs/:id/retry', adminController.retryJob);
router.delete('/jobs/:id', adminController.deleteJob);

// System stats
router.get('/stats', adminController.getSystemStats);
router.get('/stats/usage', adminController.getUsageStats);

// Failed jobs
router.get('/failed-jobs', adminController.getFailedJobs);

module.exports = router;
