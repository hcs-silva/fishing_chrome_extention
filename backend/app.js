require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const connectDB = require("./config/db");

const app = express();

connectDB();

const isDevelopment = (process.env.NODE_ENV || "development") !== "production";
const trustProxyRaw = process.env.TRUST_PROXY;
const trustProxyHops = Number.parseInt(trustProxyRaw || "1", 10);

if (Number.isInteger(trustProxyHops) && trustProxyHops >= 0) {
  app.set("trust proxy", trustProxyHops);
} else {
  app.set("trust proxy", 1);
}

// Security middleware with Stripe-compatible CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://js.stripe.com"],
        frameSrc: [
          "'self'",
          "https://js.stripe.com",
          "https://checkout.stripe.com",
          "https://billing.stripe.com",
        ],
        connectSrc: ["'self'", "https://api.stripe.com"],
        imgSrc: ["'self'", "data:", "https:"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Required for inline styles
      },
    },
    crossOriginEmbedderPolicy: false, // Disabled for extension compatibility
  }),
);

// Sanitize user input to prevent MongoDB injection attacks
app.use(
  mongoSanitize({
    replaceWith: "_",
    onSanitize: ({ req, key }) => {
      console.warn(
        `[Security] Sanitized potentially malicious input in ${key}`,
      );
    },
  }),
);

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [
      "http://localhost:3000",
      "http://localhost:5005",
      "https://fishing-chrome-extention.onrender.com",
    ];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow tools like curl or extensions without Origin

      const isChromeExtension = /^chrome-extension:\/\/[a-z]{32}$/i.test(
        origin,
      );
      if (isChromeExtension) {
        return callback(null, true);
      }

      if (isDevelopment) {
        const isLocalhost =
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

        if (isLocalhost) {
          return callback(null, true);
        }
      }

      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
  }),
); // Em produção ajuste ALLOWED_ORIGINS ou substitua por 'chrome-extension://<ID>'

// Parse JSON for all routes except webhook
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api/subscription/webhook")) {
    next();
  } else {
    express.json()(req, res, next);
  }
});

app.use("/api/previsao", require("./routes/previsao"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/subscription", require("./routes/subscription"));
app.use("/api/spots", require("./routes/spots"));

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Fishing Tides API",
    version: "1.0.0",
    endpoints: [
      "/api/previsao",
      "/api/auth",
      "/api/subscription",
      "/api/spots",
    ],
  });
});

// Global error handler - prevents leaking sensitive information
app.use((err, req, res, next) => {
  // Log error for debugging (consider using a proper logging service in production)
  console.error("[Error]", err.message);

  // Don't leak error details in production - reuse isDevelopment from above
  res.status(err.status || 500).json({
    erro: isDevelopment ? err.message : "Ocorreu um erro no servidor",
    ...(isDevelopment && { stack: err.stack }),
  });
});

module.exports = app;
