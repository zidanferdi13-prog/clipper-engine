const rateLimit = require('express-rate-limit');

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

// Auth endpoints rate limit (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  }
});

// Job creation rate limit
const jobLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 job creations per hour
  message: {
    success: false,
    message: 'Job creation limit reached, please try again later.'
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  jobLimiter
};
