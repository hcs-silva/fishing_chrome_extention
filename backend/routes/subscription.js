const express = require("express");
const router = express.Router();
const User = require("../models/User");
const auth = require("../middleware/auth");
const { subscriptionLimiter } = require("../middleware/rateLimiter");
const {
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PRICE_MONTHLY,
  STRIPE_PRICE_YEARLY,
  FRONTEND_URL,
} = require("../config/config");
const { buildStripeReturnUrls } = require("../utils/returnUrl");

// Initialize Stripe only if configured
let stripe;
if (STRIPE_SECRET_KEY) {
  stripe = require("stripe")(STRIPE_SECRET_KEY);
}

const getRequestBaseUrl = (req) => {
  const forwardedProto = req.get("x-forwarded-proto");
  const protocol = forwardedProto
    ? forwardedProto.split(",")[0].trim()
    : req.protocol;
  return `${protocol}://${req.get("host")}`;
};

const buildHostedReturnUrls = (req) => {
  const extensionReturnUrls = buildStripeReturnUrls({
    originHeader: req.get("origin"),
    frontendUrl: FRONTEND_URL,
  });

  if (!extensionReturnUrls) {
    return null;
  }

  const hostedReturnBase = `${getRequestBaseUrl(req)}/api/subscription/return`;
  const encodedRedirect = encodeURIComponent(extensionReturnUrls.returnUrl);

  return {
    successUrl: `${hostedReturnBase}?billingStatus=success&redirect=${encodedRedirect}&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${hostedReturnBase}?billingStatus=cancel&redirect=${encodedRedirect}`,
    portalReturnUrl: `${hostedReturnBase}?billingStatus=portal&redirect=${encodedRedirect}`,
  };
};

const buildExtensionRedirectUrl = ({ redirect, billingStatus, sessionId }) => {
  if (
    typeof redirect !== "string" ||
    !redirect.startsWith("chrome-extension://")
  ) {
    return null;
  }

  const params = [];
  if (billingStatus) {
    params.push(`billingStatus=${encodeURIComponent(billingStatus)}`);
  }
  if (sessionId) {
    params.push(`session_id=${encodeURIComponent(sessionId)}`);
  }

  if (params.length === 0) {
    return redirect;
  }

  const separator = redirect.includes("?") ? "&" : "?";
  return `${redirect}${separator}${params.join("&")}`;
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const ensureStripeConfigured = (res) => {
  if (!stripe || !STRIPE_SECRET_KEY) {
    res.status(500).json({
      erro: "Stripe não está configurado. Contacte o suporte.",
    });
    return false;
  }
  return true;
};

const mapStripeStatusToPlanStatus = (stripeStatus) => {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return "canceled";
    default:
      return "active";
  }
};

const applySubscriptionStateToUser = async ({
  user,
  customerId,
  subscriptionId,
  stripeSubscription,
  checkoutPaymentStatus,
}) => {
  if (customerId) {
    user.stripeCustomerId = customerId;
  }

  if (subscriptionId) {
    user.stripeSubscriptionId = subscriptionId;
  }

  let subscription = stripeSubscription || null;
  if (!subscription && subscriptionId) {
    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      console.error("Error retrieving subscription details:", error);
    }
  }

  const mappedStatus = mapStripeStatusToPlanStatus(subscription?.status);
  user.planoStatus = mappedStatus;

  if (subscription?.current_period_end) {
    user.planoExpiraEm = new Date(subscription.current_period_end * 1000);
  }

  const premiumActive =
    mappedStatus === "active" || mappedStatus === "trialing";

  const paidCheckout =
    checkoutPaymentStatus === "paid" ||
    checkoutPaymentStatus === "no_payment_required";

  if (premiumActive || paidCheckout) {
    user.plano = "premium";
    if (!premiumActive) {
      user.planoStatus = "active";
    }
  } else {
    user.plano = "free";
  }
};

/**
 * GET /api/subscription/status
 * Get current subscription status
 */
router.get("/status", subscriptionLimiter, auth, async (req, res) => {
  try {
    const user = req.user;

    let subscriptionInfo = {
      plano: user.plano,
      planoStatus: user.planoStatus,
      planoExpiraEm: user.planoExpiraEm,
      stripeCustomerId: user.stripeCustomerId,
      isPremium:
        user.plano === "premium" &&
        (user.planoStatus === "active" || user.planoStatus === "trialing"),
    };

    // If user has a Stripe subscription, fetch latest info
    if (user.stripeSubscriptionId && stripe) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId,
        );
        subscriptionInfo.stripeSubscription = {
          id: subscription.id,
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000),
          cancel_at_period_end: subscription.cancel_at_period_end,
        };
      } catch (error) {
        console.error("Error fetching Stripe subscription:", error);
      }
    }

    res.json(subscriptionInfo);
  } catch (error) {
    console.error("Error getting subscription status:", error);
    res.status(500).json({ erro: "Erro ao obter status da assinatura" });
  }
});

/**
 * GET /api/subscription/plans
 * Get available subscription plans with pricing information
 */
router.get("/plans", subscriptionLimiter, async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) {
      return;
    }

    const plans = [];

    // Fetch monthly plan details
    if (STRIPE_PRICE_MONTHLY) {
      try {
        const monthlyPrice = await stripe.prices.retrieve(STRIPE_PRICE_MONTHLY);
        if (!monthlyPrice.recurring) {
          console.error(
            "Monthly price is not a recurring subscription:",
            STRIPE_PRICE_MONTHLY,
          );
        } else {
          plans.push({
            type: "monthly",
            priceId: STRIPE_PRICE_MONTHLY,
            amount: monthlyPrice.unit_amount / 100, // Convert from cents
            currency: monthlyPrice.currency.toUpperCase(),
            interval: monthlyPrice.recurring.interval,
          });
        }
      } catch (error) {
        console.error("Error fetching monthly price:", error);
      }
    }

    // Fetch yearly plan details
    if (STRIPE_PRICE_YEARLY) {
      try {
        const yearlyPrice = await stripe.prices.retrieve(STRIPE_PRICE_YEARLY);
        if (!yearlyPrice.recurring) {
          console.error(
            "Yearly price is not a recurring subscription:",
            STRIPE_PRICE_YEARLY,
          );
        } else {
          plans.push({
            type: "yearly",
            priceId: STRIPE_PRICE_YEARLY,
            amount: yearlyPrice.unit_amount / 100, // Convert from cents
            currency: yearlyPrice.currency.toUpperCase(),
            interval: yearlyPrice.recurring.interval,
          });
        }
      } catch (error) {
        console.error("Error fetching yearly price:", error);
      }
    }

    if (plans.length === 0) {
      return res.status(500).json({
        erro: "Nenhum plano configurado. Contacte o suporte.",
      });
    }

    res.json({ plans });
  } catch (error) {
    console.error("Error getting subscription plans:", error);
    res.status(500).json({ erro: "Erro ao obter planos de subscrição" });
  }
});

/**
 * POST /api/subscription/create-checkout
 * Create Stripe checkout session for premium subscription
 */
router.post("/create-checkout", subscriptionLimiter, auth, async (req, res) => {
  try {
    const { priceId, planType = "monthly" } = req.body;
    const user = req.user;

    if (!ensureStripeConfigured(res)) {
      return;
    }

    const returnUrls = buildHostedReturnUrls(req);
    if (!returnUrls) {
      return res.status(500).json({
        erro: "Sistema não configurado corretamente. Contacte o suporte.",
      });
    }

    const premiumActive =
      user.plano === "premium" &&
      (user.planoStatus === "active" || user.planoStatus === "trialing") &&
      (!user.planoExpiraEm || new Date() <= user.planoExpiraEm);

    if (premiumActive) {
      return res.status(400).json({
        erro: "Plano Premium já está ativo",
      });
    }

    // Create or retrieve Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user._id.toString(),
        },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Determine price ID to use
    let finalPriceId = priceId;

    if (!finalPriceId) {
      // Use environment variable based on plan type
      if (planType === "yearly" && STRIPE_PRICE_YEARLY) {
        finalPriceId = STRIPE_PRICE_YEARLY;
      } else if (planType === "monthly" && STRIPE_PRICE_MONTHLY) {
        finalPriceId = STRIPE_PRICE_MONTHLY;
      } else {
        return res.status(500).json({
          erro: "Plano não configurado. Contacte o suporte.",
          detalhes: `Plano ${planType} não disponível`,
        });
      }
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: finalPriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: returnUrls.successUrl,
      cancel_url: returnUrls.cancelUrl,
      metadata: {
        userId: user._id.toString(),
      },
    });

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({
      erro: "Erro ao criar sessão de checkout",
      detalhes: error.message,
    });
  }
});

/**
 * GET /api/subscription/checkout-session/:sessionId
 * Retrieve Stripe checkout session details
 */
router.get(
  "/checkout-session/:sessionId",
  subscriptionLimiter,
  auth,
  async (req, res) => {
    try {
      if (!ensureStripeConfigured(res)) {
        return;
      }

      const { sessionId } = req.params;
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      // Ensure session belongs to current user
      if (session?.metadata?.userId !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ erro: "Sessão de checkout não autorizada" });
      }

      res.json({
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        customer: session.customer,
        subscription: session.subscription,
      });
    } catch (error) {
      console.error("Error retrieving checkout session:", error);
      res.status(500).json({ erro: "Erro ao obter sessão de checkout" });
    }
  },
);

/**
 * POST /api/subscription/finalize-checkout
 * Confirm checkout completion and sync user plan without waiting for webhook.
 */
router.post(
  "/finalize-checkout",
  subscriptionLimiter,
  auth,
  async (req, res) => {
    try {
      if (!ensureStripeConfigured(res)) {
        return;
      }

      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ erro: "sessionId é obrigatório" });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });

      if (session?.metadata?.userId !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ erro: "Sessão de checkout não autorizada" });
      }

      if (session.status !== "complete") {
        return res.status(400).json({
          erro: "Checkout ainda não concluído",
          status: session.status,
          payment_status: session.payment_status,
        });
      }

      await applySubscriptionStateToUser({
        user: req.user,
        customerId: session.customer,
        subscriptionId:
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id,
        stripeSubscription:
          typeof session.subscription === "object"
            ? session.subscription
            : null,
        checkoutPaymentStatus: session.payment_status,
      });

      await req.user.save();

      res.json({
        mensagem: "Plano sincronizado com sucesso",
        plano: req.user.plano,
        planoStatus: req.user.planoStatus,
        planoExpiraEm: req.user.planoExpiraEm,
      });
    } catch (error) {
      console.error("Error finalizing checkout session:", error);
      res.status(500).json({
        erro: "Erro ao finalizar checkout",
        detalhes: error.message,
      });
    }
  },
);

/**
 * POST /api/subscription/create-portal
 * Create Stripe billing portal session
 */
router.post("/create-portal", subscriptionLimiter, auth, async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) {
      return;
    }

    const user = req.user;
    if (!user.stripeCustomerId) {
      return res.status(400).json({ erro: "Cliente Stripe não encontrado" });
    }

    const returnUrls = buildHostedReturnUrls(req);
    if (!returnUrls) {
      return res.status(500).json({
        erro: "Sistema não configurado corretamente. Contacte o suporte.",
      });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrls.portalReturnUrl,
    });

    res.json({ url: portalSession.url });
  } catch (error) {
    console.error("Error creating billing portal session:", error);
    res
      .status(500)
      .json({ erro: "Erro ao criar sessão do portal de faturação" });
  }
});

/**
 * GET /api/subscription/return
 * Hosted return page that relays back to extension popup URL.
 */
router.get("/return", async (req, res) => {
  const { billingStatus, session_id: sessionId, redirect } = req.query;

  if (billingStatus === "success" && sessionId && stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription"],
      });

      const userId = session?.metadata?.userId;
      if (userId) {
        const user = await User.findById(userId);
        if (user) {
          await applySubscriptionStateToUser({
            user,
            customerId: session.customer,
            subscriptionId:
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription?.id,
            stripeSubscription:
              typeof session.subscription === "object"
                ? session.subscription
                : null,
            checkoutPaymentStatus: session.payment_status,
          });

          await user.save();
        }
      }
    } catch (error) {
      console.error("Error syncing user from hosted return route:", error);
    }
  }

  const extensionRedirectUrl = buildExtensionRedirectUrl({
    redirect,
    billingStatus,
    sessionId,
  });

  const statusMessage =
    billingStatus === "success"
      ? "Pagamento concluído com sucesso. A abrir a extensão..."
      : billingStatus === "cancel"
        ? "Pagamento cancelado. A abrir a extensão..."
        : "A regressar à extensão...";

  const safeStatusMessage = escapeHtml(statusMessage);
  const safeRedirectUrl = extensionRedirectUrl
    ? escapeHtml(extensionRedirectUrl)
    : "";

  const manualActionHtml = extensionRedirectUrl
    ? `<a href="${safeRedirectUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">Abrir extensão</a>`
    : "<p>Não foi possível gerar o link de retorno da extensão. Abre manualmente o popup da extensão no Chrome.</p>";

  res.status(200).type("html").send(`<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>A regressar à extensão</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f8fafc; color: #0f172a;">
  <main style="max-width: 560px; margin: 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center;">
    <h1 style="margin-top: 0; font-size: 22px;">Fishing Tides PT</h1>
    <p>${safeStatusMessage}</p>
    ${manualActionHtml}
    <p style="margin-bottom: 0; margin-top: 16px; color: #475569; font-size: 14px;">Se nada acontecer, usa o botão acima.</p>
  </main>
  <script>
    const redirectUrl = ${extensionRedirectUrl ? `"${safeRedirectUrl}"` : "null"};
    if (redirectUrl) {
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 250);
    }
  </script>
</body>
</html>`);
});

/**
 * POST /api/subscription/cancel
 * Cancel subscription
 */
router.post("/cancel", subscriptionLimiter, auth, async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) {
      return;
    }

    const user = req.user;

    if (!user.stripeSubscriptionId) {
      return res
        .status(400)
        .json({ erro: "Nenhuma assinatura ativa encontrada" });
    }

    // Cancel subscription at period end
    const subscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      { cancel_at_period_end: true },
    );

    res.json({
      mensagem: "Assinatura cancelada com sucesso",
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancel_at: subscription.cancel_at
          ? new Date(subscription.cancel_at * 1000)
          : null,
        current_period_end: new Date(subscription.current_period_end * 1000),
      },
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    res.status(500).json({ erro: "Erro ao cancelar assinatura" });
  }
});

/**
 * POST /api/subscription/webhook
 * Handle Stripe webhooks
 * Note: No rate limiting - this endpoint is called by Stripe servers, not users
 * Security is provided by webhook signature verification
 */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    let event;

    try {
      if (!ensureStripeConfigured(res)) {
        return;
      }

      if (!STRIPE_WEBHOOK_SECRET) {
        return res.status(500).json({
          erro: "Webhook Stripe não configurado corretamente.",
        });
      }

      const signature = req.headers["stripe-signature"];
      if (!signature) {
        return res.status(400).json({
          erro: "Assinatura Stripe ausente.",
        });
      }

      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        STRIPE_WEBHOOK_SECRET,
      );

      // Handle the event
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          const userId = session.metadata.userId;
          const customerId = session.customer;
          const subscriptionId = session.subscription;

          const user = await User.findById(userId);
          if (user) {
            await applySubscriptionStateToUser({
              user,
              customerId,
              subscriptionId,
              checkoutPaymentStatus: session.payment_status,
            });

            await user.save();
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object;
          const user = await User.findOne({
            stripeSubscriptionId: subscription.id,
          });

          if (user) {
            user.planoStatus = mapStripeStatusToPlanStatus(subscription.status);
            user.planoExpiraEm = new Date(
              subscription.current_period_end * 1000,
            );

            // Keep premium only while subscription is active/trialing
            if (!["active", "trialing"].includes(user.planoStatus)) {
              user.plano = "free";
            } else {
              user.plano = "premium";
            }

            await user.save();
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object;
          const user = await User.findOne({
            stripeSubscriptionId: subscription.id,
          });

          if (user) {
            user.plano = "free";
            user.planoStatus = "canceled";
            user.stripeSubscriptionId = null;
            await user.save();
          }
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object;
          const subscriptionId = invoice.subscription;

          if (subscriptionId) {
            const user = await User.findOne({
              stripeSubscriptionId: subscriptionId,
            });
            if (user) {
              user.plano = "premium";
              user.planoStatus = "active";
              // Update expiration date if available
              if (
                invoice.lines?.data?.length > 0 &&
                invoice.lines.data[0].period?.end
              ) {
                user.planoExpiraEm = new Date(
                  invoice.lines.data[0].period.end * 1000,
                );
              }
              await user.save();
            }
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object;
          const subscriptionId = invoice.subscription;

          if (subscriptionId) {
            const user = await User.findOne({
              stripeSubscriptionId: subscriptionId,
            });
            if (user) {
              user.planoStatus = "past_due";
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
      console.error("Webhook error:", error);
      res.status(400).json({ erro: "Webhook error", detalhes: error.message });
    }
  },
);

module.exports = router;
