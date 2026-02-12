// Configuration constants
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY;
const STRIPE_PRICE_YEARLY = process.env.STRIPE_PRICE_YEARLY;
const FRONTEND_URL = process.env.FRONTEND_URL;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Validate required configuration
function validateConfig() {
  const errors = [];

  if (!JWT_SECRET) {
    errors.push('JWT_SECRET is required');
  }

  // In production, require Stripe and frontend configuration
  if (NODE_ENV === 'production') {
    if (!STRIPE_SECRET_KEY) {
      errors.push('STRIPE_SECRET_KEY is required in production');
    }
    if (!STRIPE_PRICE_MONTHLY) {
      errors.push('STRIPE_PRICE_MONTHLY is required in production');
    }
    if (!STRIPE_PRICE_YEARLY) {
      errors.push('STRIPE_PRICE_YEARLY is required in production');
    }
    if (!FRONTEND_URL) {
      errors.push('FRONTEND_URL is required in production');
    }
  }

  if (errors.length > 0) {
    console.error('❌ Configuration errors:');
    errors.forEach(err => console.error(`   - ${err}`));
    if (NODE_ENV === 'production') {
      console.error('❌ Application cannot start due to missing configuration');
      process.exit(1);
    } else {
      console.warn('⚠️  Warning: Some configuration is missing. Some features may not work.');
    }
  }
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_MONTHLY,
  STRIPE_PRICE_YEARLY,
  FRONTEND_URL,
  NODE_ENV,
  validateConfig
};
