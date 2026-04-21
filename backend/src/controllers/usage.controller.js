const UsageLog = require('../models/UsageLog');
const User = require('../models/User');
const logger = require('../config/logger');

// Get My Usage
exports.getMyUsage = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get total credits used
    const totalCreditsUsed = await UsageLog.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: null, total: { $sum: '$creditsUsed' } } }
    ]);

    // Get total minutes processed
    const totalMinutesProcessed = await UsageLog.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: null, total: { $sum: '$minutesProcessed' } } }
    ]);

    res.json({
      success: true,
      data: {
        user: {
          plan: user.plan,
          creditsRemaining: user.credits
        },
        usage: {
          creditsUsed: totalCreditsUsed[0]?.total || 0,
          minutesProcessed: totalMinutesProcessed[0]?.total || 0
        }
      }
    });

  } catch (error) {
    logger.error('Get usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage',
      error: error.message
    });
  }
};

// Get Usage Stats
exports.getUsageStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await UsageLog.aggregate([
      {
        $match: {
          userId: require('mongoose').Types.ObjectId(userId),
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          creditsUsed: { $sum: '$creditsUsed' },
          minutesProcessed: { $sum: '$minutesProcessed' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        stats,
        period: `${days} days`
      }
    });

  } catch (error) {
    logger.error('Get usage stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch usage stats',
      error: error.message
    });
  }
};
