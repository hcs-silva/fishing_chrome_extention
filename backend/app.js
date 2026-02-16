require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

connectDB();

const isDevelopment = (process.env.NODE_ENV || "development") !== "production";

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

      if (isDevelopment) {
        const isLocalhost =
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
        const isChromeExtension = origin.startsWith("chrome-extension://");

        if (isLocalhost || isChromeExtension) {
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

module.exports = app;
