const User = require('../models/User');
const UsageLog = require('../models/UsageLog');
const logger = require('../config/logger');

// Create Checkout (Placeholder for payment gateway integration)
exports.createCheckout = async (req, res) => {
  try {
    const { plan, credits } = req.body;
    const userId = req.user.userId;

    // Validation
    if (!plan && !credits) {
      return res.status(400).json({
        success: false,
        message: 'Please specify plan or credits'
      });
    }

    // Pricing logic
    const pricing = {
      plans: {
        pro: { price: 29, credits: 100 },
        enterprise: { price: 99, credits: 500 }
      },
      credits: {
        10: 5,
        50: 20,
        100: 35
      }
    };

    let checkoutData = {};

    if (plan) {
      if (!pricing.plans[plan]) {
        return res.status(400).json({
          success: false,
          message: 'Invalid plan'
        });
      }
      
      checkoutData = {
        type: 'plan',
        plan,
        price: pricing.plans[plan].price,
        credits: pricing.plans[plan].credits
      };
    } else {
      if (!pricing.credits[credits]) {
        return res.status(400).json({
          success: false,
          message: 'Invalid credits amount'
        });
      }

      checkoutData = {
        type: 'credits',
        credits,
        price: pricing.credits[credits]
      };
    }

    // TODO: Integrate with payment gateway (Stripe, Midtrans, etc.)
    // For now, return checkout URL placeholder

    logger.info(`Checkout created for user ${userId}: ${JSON.stringify(checkoutData)}`);

    res.json({
      success: true,
      message: 'Checkout session created',
      data: {
        checkoutUrl: 'https://payment-gateway.com/checkout/placeholder',
        ...checkoutData
      }
    });

  } catch (error) {
    logger.error('Create checkout error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout',
      error: error.message
    });
  }
};

// Get Billing History
exports.getBillingHistory = async (req, res) => {
  try {
    const userId = req.user.userId;

    const history = await UsageLog.find({
      userId,
      action: 'credit_purchased'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        history
      }
    });

  } catch (error) {
    logger.error('Get billing history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch billing history',
      error: error.message
    });
  }
};
