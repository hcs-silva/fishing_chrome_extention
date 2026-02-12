const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for authentication routes (login, register)
 * More strict to prevent brute force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    erro: 'Muitas tentativas. Por favor, tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for general API routes
 * Less strict for normal operations
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    erro: 'Muitas requisições. Por favor, tente novamente mais tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for subscription/payment routes
 * Moderate limit to prevent abuse while allowing legitimate use
 */
const subscriptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: {
    erro: 'Muitas tentativas. Por favor, tente novamente em alguns minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  apiLimiter,
  subscriptionLimiter
};
