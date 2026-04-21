const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');
const authMiddleware = require('../middlewares/auth');
const { jobLimiter } = require('../middlewares/rateLimiter');

router.use(authMiddleware); // All job routes require authentication

router.post('/create', jobLimiter, jobController.createJob);
router.get('/my-jobs', jobController.getMyJobs);
router.get('/:id', jobController.getJobById);
router.delete('/:id', jobController.deleteJob);

module.exports = router;
