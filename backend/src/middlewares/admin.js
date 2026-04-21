const logger = require('../config/logger');

const adminMiddleware = async (req, res, next) => {
  try {
    // Check if user has admin role
    const User = require('../models/User');
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.role !== 'admin') {
      logger.warn(`Unauthorized admin access attempt by user ${user.email}`);
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // Add user to request
    req.adminUser = user;
    next();

  } catch (error) {
    logger.error('Admin middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization failed'
    });
  }
};

module.exports = adminMiddleware;
