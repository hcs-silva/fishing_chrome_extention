# Production Readiness Report — Fishing Tides PT

**Date:** 2026-02-20  
**Repository:** hcs-silva/Fishing_Tides_PT  
**Scope:** Backend API (`backend/`) + Chrome Extension (`extensão/`)  
**Overall Rating:** ⚠️ NOT PRODUCTION READY — several critical gaps must be addressed before a public launch.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Security](#2-security)
3. [Testing](#3-testing)
4. [Observability & Operations](#4-observability--operations)
5. [Code Quality & Architecture](#5-code-quality--architecture)
6. [Configuration & Environment](#6-configuration--environment)
7. [API Design](#7-api-design)
8. [Dependencies](#8-dependencies)
9. [Chrome Extension](#9-chrome-extension)
10. [Deployment & Infrastructure](#10-deployment--infrastructure)
11. [Prioritised Action Plan](#11-prioritised-action-plan)

---

## 1. Executive Summary

Fishing Tides PT is a Node.js/Express API paired with a Manifest V3 Chrome Extension. It provides fishing condition forecasts for Portuguese coastal spots with a Freemium model backed by Stripe subscriptions. The codebase demonstrates solid foundational choices—input validation, rate limiting, JWT authentication, bcrypt password hashing, and Stripe webhook signature verification are all in place.

However, several gaps prevent a production launch with confidence:

| Area | Status |
|---|---|
| Security | ⚠️ Gaps (missing security headers, logout token invalidation, NoSQL-injection risk) |
| Testing | ❌ Critical — only 5 unit tests exist; no route, integration, or load tests |
| Observability | ❌ No structured logging, no error monitoring, no metrics |
| Code Quality | ⚠️ Duplicate scoring logic; approximated tide/weather data |
| Configuration | ⚠️ `STRIPE_WEBHOOK_SECRET` not validated in production config check |
| Deployment | ❌ No CI/CD, no Docker, no documented deployment runbook |

---

## 2. Security

### 2.1 ✅ What Is Working Well

| Control | Detail |
|---|---|
| Password hashing | `bcryptjs` with 10 salt rounds |
| Input validation | `express-validator` on `/api/auth/register` and `/api/auth/login` |
| JWT authentication | Tokens signed with `JWT_SECRET`; 7-day expiry |
| Rate limiting | Separate limiters for auth (5 req/15 min), subscription (10 req/15 min), and general API (100 req/15 min) |
| Stripe webhook verification | `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET` prevents spoofed events |
| HTML escaping | `escapeHtml()` applied to user-controlled values in the hosted `/return` page |
| CORS origin allowlist | Production origins are controlled via `ALLOWED_ORIGINS` env var |
| JWT not exposed to extension popup | Token is stored in `chrome.storage.local` inside the service worker, not in page DOM |

### 2.2 ❌ Issues to Fix

#### CRITICAL: No security headers
The API does not set any security-related HTTP headers. Without these, browsers and intermediaries are missing important protections. Install and configure [`helmet`](https://www.npmjs.com/package/helmet) to add:
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Content-Security-Policy`
- `Referrer-Policy`

```js
// backend/app.js — add near the top
const helmet = require('helmet');
app.use(helmet());
```

#### HIGH: No token invalidation on logout
`POST /api/auth/logout` is stateless — it simply returns 200 without invalidating the JWT. A stolen token remains valid for up to 7 days after the user logs out. To fix this, either:
- Maintain a token deny-list in Redis/MongoDB (recommended for production), or
- Shorten the JWT expiry and implement refresh tokens.

#### HIGH: NoSQL injection risk
Mongoose calls such as `User.findOne({ email: email.toLowerCase() })` receive unsanitised string values. While `express-validator` validates the email format, the raw `req.body` object is passed to Mongoose without a dedicated sanitisation step. Add [`express-mongo-sanitize`](https://www.npmjs.com/package/express-mongo-sanitize) to strip `$` and `.` operators from request bodies and query params.

```js
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize());
```

#### MEDIUM: CORS allows requests with no `Origin` header
In `app.js`:
```js
if (!origin) return callback(null, true); // allow tools like curl or extensions without Origin
```
This lets any server-side caller (including automated scanners) bypass CORS entirely. In production, consider restricting this to explicitly allowed cases and logging unexpected origin-less requests.

#### MEDIUM: `STRIPE_WEBHOOK_SECRET` not validated in production startup
`config/config.js` → `validateConfig()` requires `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY`, and `FRONTEND_URL` in production — but **not** `STRIPE_WEBHOOK_SECRET`. An unconfigured webhook secret means Stripe webhook events are rejected at runtime, silently breaking subscription state updates. Add it to the production config check.

#### LOW: No HTTPS enforcement
The server does not redirect HTTP requests to HTTPS. When deployed on a platform that terminates TLS (e.g., Render, Heroku), add a middleware that checks `x-forwarded-proto` and redirects HTTP to HTTPS.

#### LOW: JWT stored in `chrome.storage.local`
While better than storing in a web page, `chrome.storage.local` is readable by any script in the extension context. Prefer `chrome.storage.session` (available in MV3) for shorter-lived tokens and clear storage on logout.

---

## 3. Testing

### 3.1 Current Coverage

| File | Tests | What Is Covered |
|---|---|---|
| `backend/tests/returnUrl.test.js` | 5 unit tests | URL normalisation and Stripe return URL building |

**All API routes, middleware, and services have zero test coverage.**

### 3.2 ❌ Gaps

- **Auth routes** (`/register`, `/login`, `/logout`, `/me`) — not tested
- **Subscription routes** — all 8 endpoints untested
- **Previsão route** — scoring logic, plan gating, and external API fallback untested
- **Spots route** — premium gating, favourites CRUD untested
- **`planCheck` middleware** — `isPremium` and `checkPlan` logic untested
- **`auth` middleware** — JWT verification logic untested
- **Fishing score calculation** — `calculateFishingScore` in `routes/previsao.js` and `utils/scorePeixe.js` both have no tests
- **No integration tests** (API end-to-end with a real/mocked MongoDB)
- **No load or performance tests** — rate-limit behaviour under load is unknown

### 3.3 Recommended Minimum Test Suite

Add a test framework capable of mocking HTTP (e.g., `supertest`) and MongoDB (e.g., `mongodb-memory-server`). The minimum viable test suite before production should cover:

1. Auth: register, login, duplicate email, short password, invalid token
2. Subscription: status, create-checkout (Stripe mocked), webhook signature verification
3. Previsão: free spot access (unauthenticated), premium spot gating, 404 on unknown spot
4. `isPremium` middleware: active, expired, past_due states
5. `validateConfig`: required vars present/absent in production mode

---

## 4. Observability & Operations

### 4.1 ❌ No Structured Logging

The entire backend uses `console.log` / `console.error` / `console.warn`. In production this means:
- No log levels that can be filtered (info, warn, error, debug)
- No JSON format for ingestion by log aggregators (Datadog, Loki, CloudWatch)
- No request correlation IDs to trace a single transaction across log lines

**Recommendation:** Replace `console.*` calls with a structured logger such as [`pino`](https://www.npmjs.com/package/pino) (lightweight, JSON output, compatible with Node.js).

### 4.2 ❌ No HTTP Access Logging

The app has no `morgan` or equivalent access log middleware. There is no record of which endpoints are called, by whom, with what response codes and latencies.

```js
const morgan = require('morgan');
app.use(morgan('combined')); // add to app.js
```

### 4.3 ❌ No Error Monitoring

There is no integration with an error-tracking service (e.g., Sentry, Bugsnag). Unhandled exceptions and rejected promises in production will only be visible in raw server logs, with no alerting.

### 4.4 ❌ No Graceful Shutdown

`server.js` starts the HTTP server but does not handle `SIGTERM` / `SIGINT` signals. On deployment platforms (Render, Kubernetes), the process receives `SIGTERM` before being killed. Without a graceful-shutdown handler, in-flight requests are dropped and open MongoDB connections are not closed cleanly.

```js
process.on('SIGTERM', () => {
  server.close(() => mongoose.connection.close());
});
```

### 4.5 ⚠️ Basic Health Check Only

`GET /` returns `{ status: "ok" }` but does not check MongoDB connectivity. A downstream load balancer or monitoring tool that uses this endpoint will see "ok" even when the database is unreachable.

**Recommendation:** Add a `/health` endpoint that pings MongoDB and returns a non-200 status if the connection is degraded.

### 4.6 ❌ No Metrics

There are no application metrics (request count, error rate, latency percentiles). Before production, integrate a metrics solution (e.g., `prom-client` with a Prometheus/Grafana stack) or use a hosted APM (Datadog, New Relic).

---

## 5. Code Quality & Architecture

### 5.1 ⚠️ Duplicate Fishing Score Calculation

Two independent scoring functions exist:

| Location | Function |
|---|---|
| `backend/utils/scorePeixe.js` | `calcularScorePeixe(spotId, mareAltura, horaAtual, ondasAltura, diaSemana)` |
| `backend/routes/previsao.js` | `calculateFishingScore(tide, waves, wind, moonPhase, hour, dayOfWeek)` |

The route **does not import `utils/scorePeixe.js`**; it uses its own inline function. The two functions use different algorithms, different weights, and different inputs. One of them should be removed and the logic consolidated in `utils/scorePeixe.js`.

### 5.2 ⚠️ Approximated Tide Data

`services/tidesApi.js` uses simplified harmonic analysis (M2 + S2 + N2 tidal constituents with fixed amplitudes) rather than a real tide API. The comments in the file acknowledge this. For a fishing forecast app, inaccurate tide data directly degrades product quality.

**Options for production:**
- [Stormglass.io](https://stormglass.io/) — free tier, Portugal supported
- [WorldTides](https://www.worldtides.info/apidocs) — subscription-based, accurate Portuguese data
- [Instituto Hidrográfico (Portugal)](https://www.hidrografico.pt/) — official Portuguese tidal predictions

### 5.3 ⚠️ Water Temperature Is Hardcoded

`estimateWaterTemperature(month)` in `routes/previsao.js` returns a fixed table of monthly averages, the same for all spots. Sesimbra, Sagres, and Aveiro have noticeably different water temperature profiles. Consider using the Open-Meteo marine API (already in use) which provides sea surface temperature.

### 5.4 ⚠️ `calculateFishingScore` in `previsao.js` Is Not Exported or Unit-Tested

The function is a 50-line algorithm buried inside a route file. It should be extracted to a utility module and covered by unit tests.

### 5.5 ℹ️ No API Versioning

All routes are under `/api/*` with no version segment (e.g., `/api/v1/*`). Adding versioning now, before a public release, is much cheaper than introducing it later with breaking changes already deployed to Chrome Web Store users.

### 5.6 ℹ️ Inconsistent Error Message Language

Some error messages are in English (`'Email já registrado'` uses Portuguese, but `console.error('Error registering user:', error)` uses English). Decide on one language for user-facing messages and another for developer logs — or use error codes with a translation layer.

---

## 6. Configuration & Environment

### 6.1 ❌ `STRIPE_WEBHOOK_SECRET` Not in Production Validation

`config/config.js` → `validateConfig()` does not require `STRIPE_WEBHOOK_SECRET` in production:

```js
// Current production checks in validateConfig():
JWT_SECRET                 ✅ required
STRIPE_SECRET_KEY          ✅ required
STRIPE_PRICE_MONTHLY       ✅ required
STRIPE_PRICE_YEARLY        ✅ required
FRONTEND_URL               ✅ required
STRIPE_WEBHOOK_SECRET      ❌ NOT checked — subscription events will silently fail
```

### 6.2 ❌ No `.env.example` File

There is no `.env.example` or `.env.sample` in the repository. New developers or deployment engineers must read the README and `config/config.js` to discover all required variables. A template file prevents misconfiguration.

**Required variables that need documenting:**

```
MONGO_URI=
PORT=5005
NODE_ENV=production
ALLOWED_ORIGINS=chrome-extension://<extension-id>
JWT_SECRET=
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MONTHLY=price_...
STRIPE_PRICE_YEARLY=price_...
FRONTEND_URL=
```

### 6.3 ⚠️ `MONGO_URI` Has No Production Validation

If `MONGO_URI` is not set, the app silently connects to `mongodb://127.0.0.1:27017/fishing-chrome-extension`. On a cloud host without a local MongoDB, this will cause the app to crash at first DB operation rather than at startup. Add `MONGO_URI` to the production validation check.

### 6.4 ⚠️ Duplicate Lock Files

Both `package-lock.json` and `pnpm-lock.yaml` exist in `backend/`. Using two package managers for the same project leads to inconsistent dependency trees. Choose one (the `package.json` scripts use `pnpm dev`; the README also uses `pnpm install`). Remove `package-lock.json` and commit only `pnpm-lock.yaml`.

---

## 7. API Design

### 7.1 ⚠️ `/api/spots` Not Documented in README

The README lists auth and subscription routes, but `/api/spots/all`, `/api/spots/favorites`, `POST /api/spots/favorites`, and `DELETE /api/spots/favorites/:spotId` are not documented. The referenced `API_DOCUMENTATION.md` and `BACKEND_MONETIZATION_API.md` links in the README are not present in the repository.

### 7.2 ℹ️ No Input Validation on `spotId` Query Parameter

`GET /api/previsao?spotId=<id>` passes `req.query.spotId` directly to `parseInt()` and then to `spots.find()`. While this doesn't cause a security issue (the find returns `undefined`, caught by the 404 branch), adding explicit validation (e.g., `express-validator` `query('spotId').isInt({ min: 1 })`) is good practice.

### 7.3 ℹ️ No Pagination on Spot Listings

`GET /api/spots/all` returns all spots in a single response. This is fine at 7 spots but will not scale without pagination if the spot catalogue grows.

### 7.4 ℹ️ Rate Limiter Is IP-Based Only

All rate limiters use the default IP key. Behind a shared NAT or a CDN/proxy that does not set `X-Forwarded-For`, all users share a single rate-limit bucket. Verify that `express-rate-limit` is configured with `trustProxy` matching the deployment environment.

---

## 8. Dependencies

### 8.1 ⚠️ `@stripe/stripe-js` in Backend Dependencies

`package.json` lists `@stripe/stripe-js: ^8.7.0` as a production dependency. `@stripe/stripe-js` is the **browser** SDK; the backend correctly uses the `stripe` npm package instead. `@stripe/stripe-js` is never imported anywhere in the backend code and should be removed from `package.json` to reduce attack surface and install size.

### 8.2 Installed Versions (as of report date)

| Package | Installed | Notes |
|---|---|---|
| `express` | 4.22.1 | Express 5 is stable; migration is optional |
| `mongoose` | 7.8.8 | Mongoose 8 available; review migration guide for breaking changes |
| `jsonwebtoken` | 9.0.3 | Current stable |
| `bcryptjs` | 3.0.3 | Current stable |
| `stripe` | 13.11.0 | Check Stripe changelog for API version pins |
| `express-rate-limit` | 8.2.1 | Current stable |
| `express-validator` | 7.3.1 | Current stable |
| `node-fetch` | 2.7.0 | v2 (CommonJS); v3 is ESM-only; no action required |
| `cors` | 2.8.6 | Current stable |
| `dotenv` | 16.6.1 | Current stable |

### 8.3 Missing Recommended Production Dependencies

| Package | Purpose |
|---|---|
| `helmet` | Security headers |
| `express-mongo-sanitize` | NoSQL injection prevention |
| `pino` or `winston` | Structured logging |
| `morgan` | HTTP access logging |
| `compression` | Gzip response compression |

---

## 9. Chrome Extension

### 9.1 ⚠️ Typo in Production API Hostname

Both `extensão/background.js` and `extensão/manifest.json` reference:
```
https://fishing-chrome-extention.onrender.com
```
Note the misspelling: **`extention`** instead of **`extension`**. If this hostname is intentional (it was registered with the typo), document it clearly. If it's unintentional, correct it before publishing the extension to the Chrome Web Store.

### 9.2 ⚠️ No Content Security Policy in Manifest

`manifest.json` does not declare a `content_security_policy`. While Manifest V3 has a stricter default CSP than V2, explicitly declaring it documents the intended policy and makes any relaxations visible in code review.

### 9.3 ⚠️ Hardcoded Developer Email in `popup.js`

```js
const mailtoLink = `mailto:hcs.silva.dev@gmail.com?subject=...`;
```

A personal email address is hardcoded in the extension source code. Consider using a dedicated support email address and making it configurable, especially before publishing to the Chrome Web Store.

### 9.4 ℹ️ Token Stored in `chrome.storage.local`

`chrome.storage.local` persists across browser restarts and extension updates. For a short-lived auth token, `chrome.storage.session` (MV3, clears on browser close) is more appropriate. A 7-day JWT stored in `local` storage means a compromised device retains API access for up to 7 days after the user closes the browser.

### 9.5 ℹ️ Service-Suspended Detection Is String-Matching

`background.js` detects Render's suspension page by checking if the response body includes:
```js
"This service has been suspended by its owner."
```
This is fragile — Render may change the message at any time. A more robust approach is to check the HTTP status code (Render typically returns 503) and Content-Type.

### 9.6 ℹ️ Extension Not Published to Chrome Web Store

The extension must be loaded in "developer mode" (`chrome://extensions → Load unpacked`). There is no indication that it has been submitted to the Chrome Web Store. Publishing requires:
- Privacy policy URL
- Permissions justification for `storage` and `geolocation`
- Store listing with screenshots

---

## 10. Deployment & Infrastructure

### 10.1 ❌ No CI/CD Pipeline

There is no `.github/workflows/` directory or equivalent. Every code change requires manual deployment. A minimal CI pipeline should:
1. Install dependencies
2. Run `npm test`
3. Block merges if tests fail
4. (Optional) Auto-deploy to Render on push to `main`

### 10.2 ❌ No Docker / Containerisation

There is no `Dockerfile` or `docker-compose.yml`. Containerisation is not strictly required for Render deployments, but its absence means:
- Local development environment may differ from production
- No isolation of the Node.js version
- MongoDB version not pinned for local development

### 10.3 ❌ No Deployment Runbook

There is no documented procedure for:
- Initial deployment to a new environment
- Database seeding or migration
- Rolling back a bad release
- Configuring Stripe webhooks (endpoint URL, events to subscribe to)
- Rotating secrets (`JWT_SECRET`, Stripe keys)

### 10.4 ⚠️ Hosted on Render Free Tier (Inferred)

`background.js` explicitly detects "This service has been suspended by its owner" — a message served by Render when a free-tier service is inactive. Free-tier Render services spin down after 15 minutes of inactivity and take ~30 seconds to cold-start. This is unacceptable for a production service. Upgrade to a paid Render plan or an equivalent always-on host.

### 10.5 ℹ️ MongoDB Hosting Unclear

The README states: "Start local MongoDB or configure `MONGO_URI` for Atlas." For production, a managed cloud database (MongoDB Atlas M0 free tier or higher) with:
- Authentication enabled
- Network access restricted to the API server IP
- Automatic backups configured
- Connection string using SRV format

---

## 11. Prioritised Action Plan

### 🔴 Critical (block production launch)

| # | Action | File(s) |
|---|---|---|
| 1 | Add `helmet` for security headers | `backend/app.js`, `package.json` |
| 2 | Add `STRIPE_WEBHOOK_SECRET` to `validateConfig()` production checks | `backend/config/config.js` |
| 3 | Add `MONGO_URI` to `validateConfig()` production checks | `backend/config/config.js` |
| 4 | Add `express-mongo-sanitize` to prevent NoSQL injection | `backend/app.js`, `package.json` |
| 5 | Write integration tests for all API routes | `backend/tests/` |
| 6 | Set up CI/CD (GitHub Actions) to run tests on every PR | `.github/workflows/` |
| 7 | Upgrade from Render free tier to a paid/always-on plan | Infrastructure |
| 8 | Create `.env.example` | `backend/.env.example` |

### 🟡 High (address within first sprint post-launch)

| # | Action | File(s) |
|---|---|---|
| 9 | Add structured logging (`pino`) and HTTP access logging (`morgan`) | `backend/app.js`, `backend/server.js` |
| 10 | Add error monitoring (Sentry) | `backend/server.js` |
| 11 | Implement token deny-list or reduce JWT expiry + refresh tokens | `backend/routes/auth.js`, `backend/middleware/auth.js` |
| 12 | Add graceful shutdown handler | `backend/server.js` |
| 13 | Upgrade `/health` endpoint to include MongoDB connectivity check | `backend/app.js` |
| 14 | Remove `@stripe/stripe-js` from backend `package.json` | `backend/package.json` |
| 15 | Consolidate duplicate fishing-score logic | `backend/utils/scorePeixe.js`, `backend/routes/previsao.js` |

### 🟢 Medium (address in near-term backlog)

| # | Action | File(s) |
|---|---|---|
| 16 | Replace approximated tide calculation with a real tide API | `backend/services/tidesApi.js` |
| 17 | Verify / document the `extention` hostname typo | `extensão/background.js`, `extensão/manifest.json` |
| 18 | Add Content Security Policy to Chrome extension manifest | `extensão/manifest.json` |
| 19 | Replace hardcoded developer email with a support address | `extensão/popup/popup.js` |
| 20 | Remove `package-lock.json` (keep only `pnpm-lock.yaml`) | `backend/` |
| 21 | Add API versioning (`/api/v1/`) | All route files |
| 22 | Add a `Dockerfile` and `docker-compose.yml` | Repository root |
| 23 | Write a deployment runbook | `docs/DEPLOYMENT.md` |
| 24 | Add sea surface temperature from Open-Meteo marine API | `backend/routes/previsao.js` |

---

*This report was generated by static analysis of the repository source code. No runtime tests were performed.*
