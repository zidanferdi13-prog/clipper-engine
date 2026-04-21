const express = require('express');
const router = express.Router();
const usageController = require('../controllers/usage.controller');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/me', usageController.getMyUsage);
router.get('/stats', usageController.getUsageStats);

module.exports = router;
