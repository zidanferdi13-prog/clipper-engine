const express = require('express');
const router = express.Router();
const clipController = require('../controllers/clip.controller');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/:id', clipController.getClipById);
router.get('/by-job/:jobId', clipController.getClipsByJobId);
router.delete('/:id', clipController.deleteClip);

module.exports = router;
