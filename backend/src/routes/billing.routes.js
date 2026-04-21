const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.post('/checkout', billingController.createCheckout);
router.get('/history', billingController.getBillingHistory);

module.exports = router;
