require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

connectDB();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:5005"];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow tools like curl or extensions without Origin
      if (
        allowedOrigins.includes(origin) ||
        origin.startsWith("chrome-extension://")
      )
        return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
  }),
); // Em produção ajuste ALLOWED_ORIGINS ou substitua por 'chrome-extension://<ID>'
app.use(express.json());

app.use("/api/previsao", require("./routes/previsao"));
// app.use('/api/auth', require('./routes/auth'));
// app.use('/api/stripe', require('./routes/stripe'));

module.exports = app;
