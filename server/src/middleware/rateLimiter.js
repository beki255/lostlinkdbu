const rateLimit = require('express-rate-limit');
const config = require('../config');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || `Too many requests. Please try again later.`,
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const globalLimiter = createRateLimiter(
  config.rateLimit.windowMs,
  config.rateLimit.max,
  'Too many requests. Please try again later.'
);

const authLimiter = createRateLimiter(
  1500 * 60 * 1000,
  5,
  'Too many authentication attempts. Please try again after 15 minutes.'
);

const otpLimiter = createRateLimiter(
  5 * 60 * 1000,
  3,
  'Too many OTP attempts. Please try again after 5 minutes.'
);

module.exports = { globalLimiter, authLimiter, otpLimiter };
