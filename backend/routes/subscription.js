const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const { subscriptionLimiter } = require('../middleware/rateLimiter');
const { 
  STRIPE_SECRET_KEY, 
  STRIPE_WEBHOOK_SECRET, 
  STRIPE_PRICE_MONTHLY,
  STRIPE_PRICE_YEARLY,
  FRONTEND_URL 
} = require('../config/config');

// Initialize Stripe only if configured
let stripe;
if (STRIPE_SECRET_KEY) {
  stripe = require('stripe')(STRIPE_SECRET_KEY);
}

/**
 * GET /api/subscription/status
 * Get current subscription status
 */
router.get('/status', subscriptionLimiter, auth, async (req, res) => {
  try {
    const user = req.user;
    
    let subscriptionInfo = {
      plano: user.plano,
      planoStatus: user.planoStatus,
      planoExpiraEm: user.planoExpiraEm,
      stripeCustomerId: user.stripeCustomerId,
      isPremium: user.plano === 'premium' && 
                 (user.planoStatus === 'active' || user.planoStatus === 'trialing')
    };

    // If user has a Stripe subscription, fetch latest info
    if (user.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        subscriptionInfo.stripeSubscription = {
          id: subscription.id,
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000),
          cancel_at_period_end: subscription.cancel_at_period_end
        };
      } catch (error) {
        console.error('Error fetching Stripe subscription:', error);
      }
    }

    res.json(subscriptionInfo);
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({ erro: 'Erro ao obter status da assinatura' });
  }
});

/**
 * POST /api/subscription/create-checkout
 * Create Stripe checkout session for premium subscription
 */
router.post('/create-checkout', subscriptionLimiter, auth, async (req, res) => {
  try {
    const { priceId, planType = 'monthly' } = req.body;
    const user = req.user;

    // Check if Stripe is configured
    if (!stripe || !STRIPE_SECRET_KEY) {
      return res.status(500).json({ 
        erro: 'Stripe não está configurado. Contacte o suporte.' 
      });
    }

    // Validate required configuration
    if (!FRONTEND_URL) {
      return res.status(500).json({ 
        erro: 'Sistema não configurado corretamente. Contacte o suporte.' 
      });
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user._id.toString()
        }
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Determine price ID to use
    let finalPriceId = priceId;
    
    if (!finalPriceId) {
      // Use environment variable based on plan type
      if (planType === 'yearly' && STRIPE_PRICE_YEARLY) {
        finalPriceId = STRIPE_PRICE_YEARLY;
      } else if (planType === 'monthly' && STRIPE_PRICE_MONTHLY) {
        finalPriceId = STRIPE_PRICE_MONTHLY;
      } else {
        return res.status(500).json({ 
          erro: 'Plano não configurado. Contacte o suporte.',
          detalhes: `Plano ${planType} não disponível`
        });
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/cancel`,
      metadata: {
        userId: user._id.toString()
      }
    });

    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ 
      erro: 'Erro ao criar sessão de checkout',
      detalhes: error.message 
    });
  }
});

/**
 * POST /api/subscription/cancel
 * Cancel subscription
 */
router.post('/cancel', subscriptionLimiter, auth, async (req, res) => {
  try {
    const user = req.user;

    if (!user.stripeSubscriptionId) {
      return res.status(400).json({ erro: 'Nenhuma assinatura ativa encontrada' });
    }

    // Cancel subscription at period end
    const subscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    res.json({
      mensagem: 'Assinatura cancelada com sucesso',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancel_at: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null,
        current_period_end: new Date(subscription.current_period_end * 1000)
      }
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ erro: 'Erro ao cancelar assinatura' });
  }
});

/**
 * POST /api/subscription/webhook
 * Handle Stripe webhooks
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;

  try {
    // Verify webhook signature if secret is configured
    if (STRIPE_WEBHOOK_SECRET) {
      const signature = req.headers['stripe-signature'];
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } else {
      event = req.body;
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        const user = await User.findById(userId);
        if (user) {
          user.stripeCustomerId = customerId;
          user.stripeSubscriptionId = subscriptionId;
          user.plano = 'premium';
          user.planoStatus = 'active';
          await user.save();
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const user = await User.findOne({ stripeSubscriptionId: subscription.id });
        
        if (user) {
          user.planoStatus = subscription.status;
          user.planoExpiraEm = new Date(subscription.current_period_end * 1000);
          
          // If subscription is canceled or expired, downgrade to free
          if (['canceled', 'unpaid', 'past_due'].includes(subscription.status)) {
            user.plano = 'free';
          }
          
          await user.save();
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const user = await User.findOne({ stripeSubscriptionId: subscription.id });
        
        if (user) {
          user.plano = 'free';
          user.planoStatus = 'canceled';
          user.stripeSubscriptionId = null;
          await user.save();
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        if (subscriptionId) {
          const user = await User.findOne({ stripeSubscriptionId: subscriptionId });
          if (user) {
            user.planoStatus = 'active';
            user.planoExpiraEm = new Date(invoice.lines.data[0].period.end * 1000);
            await user.save();
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        
        if (subscriptionId) {
          const user = await User.findOne({ stripeSubscriptionId: subscriptionId });
          if (user) {
            user.planoStatus = 'past_due';
            await user.save();
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ erro: 'Webhook error', detalhes: error.message });
  }
});

module.exports = router;
