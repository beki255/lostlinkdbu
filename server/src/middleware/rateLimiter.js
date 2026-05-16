const rateLimit = require('express-rate-limit');

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

// OTP rate limiter - allows 3 attempts per 5 minutes
const otpLimiter = createRateLimiter(
  5 * 60 * 1000,
  3,
  'Too many OTP attempts. Please try again after 5 minutes.'
);

module.exports = { otpLimiter };
