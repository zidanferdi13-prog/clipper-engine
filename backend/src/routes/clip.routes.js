const express = require('express');
const router = express.Router();
const clipController = require('../controllers/clip.controller');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

// NOTE: specific routes must come before param routes (:id catches everything)
router.get('/by-job/:jobId', clipController.getClipsByJobId);
router.get('/:id', clipController.getClipById);
router.delete('/:id', clipController.deleteClip);

module.exports = router;
