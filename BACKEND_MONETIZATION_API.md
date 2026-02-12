# Backend Monetization API Documentation

This document describes the new authentication and subscription management endpoints added to the Fishing Tides PT backend.

## Table of Contents
1. [Authentication](#authentication)
2. [Subscription Management](#subscription-management)
3. [Spots Management](#spots-management)
4. [Updated Forecast Endpoint](#updated-forecast-endpoint)
5. [Environment Variables](#environment-variables)

---

## Authentication

### Register User
**POST** `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "senha123"
}
```

**Response (201):**
```json
{
  "mensagem": "Usuário registrado com sucesso",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "plano": "free"
  },
  "token": "jwt_token_here"
}
```

**Errors:**
- `400` - Email já registrado ou dados inválidos
- `500` - Erro ao registrar usuário

---

### Login User
**POST** `/api/auth/login`

Login with existing account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "senha123"
}
```

**Response (200):**
```json
{
  "mensagem": "Login bem-sucedido",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "plano": "premium",
    "planoStatus": "active",
    "planoExpiraEm": "2026-03-12T21:23:54.019Z"
  },
  "token": "jwt_token_here"
}
```

**Errors:**
- `401` - Email ou password incorretos
- `500` - Erro ao fazer login

---

### Logout User
**POST** `/api/auth/logout`

Logout current user (client should delete token).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "mensagem": "Logout bem-sucedido"
}
```

---

### Get Current User
**GET** `/api/auth/me`

Get current authenticated user information.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "plano": "premium",
    "planoStatus": "active",
    "planoExpiraEm": "2026-03-12T21:23:54.019Z",
    "spotsFavoritos": [1, 2, 5],
    "configuracoes": {
      "alertas": true,
      "notificacoes": true,
      "scoreMinimo": 7
    },
    "createdAt": "2026-01-12T10:00:00.000Z"
  }
}
```

**Errors:**
- `401` - Token inválido ou ausente
- `500` - Erro ao obter informações

---

## Subscription Management

### Get Subscription Status
**GET** `/api/subscription/status`

Get current subscription status and details.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "plano": "premium",
  "planoStatus": "active",
  "planoExpiraEm": "2026-03-12T21:23:54.019Z",
  "stripeCustomerId": "cus_xxxxx",
  "isPremium": true,
  "stripeSubscription": {
    "id": "sub_xxxxx",
    "status": "active",
    "current_period_end": "2026-03-12T21:23:54.019Z",
    "cancel_at_period_end": false
  }
}
```

**Errors:**
- `401` - Autenticação necessária
- `500` - Erro ao obter status

---

### Create Checkout Session
**POST** `/api/subscription/create-checkout`

Create a Stripe checkout session to upgrade to Premium.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body (optional):**
```json
{
  "priceId": "price_xxxxx",
  "planType": "monthly"
}
```

**Response (200):**
```json
{
  "sessionId": "cs_test_xxxxx",
  "url": "https://checkout.stripe.com/pay/cs_test_xxxxx"
}
```

**Errors:**
- `401` - Autenticação necessária
- `500` - Stripe não configurado ou erro ao criar checkout

---

### Cancel Subscription
**POST** `/api/subscription/cancel`

Cancel current subscription (will remain active until end of billing period).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "mensagem": "Assinatura cancelada com sucesso",
  "subscription": {
    "id": "sub_xxxxx",
    "status": "active",
    "cancel_at": "2026-03-12T21:23:54.019Z",
    "current_period_end": "2026-03-12T21:23:54.019Z"
  }
}
```

**Errors:**
- `400` - Nenhuma assinatura ativa encontrada
- `401` - Autenticação necessária
- `500` - Erro ao cancelar assinatura

---

### Stripe Webhook
**POST** `/api/subscription/webhook`

Handle Stripe webhook events. **This endpoint should be called by Stripe only.**

**Headers:**
```
stripe-signature: <stripe_signature>
```

**Events Handled:**
- `checkout.session.completed` - User completes payment
- `customer.subscription.updated` - Subscription updated
- `customer.subscription.deleted` - Subscription canceled
- `invoice.payment_succeeded` - Payment successful
- `invoice.payment_failed` - Payment failed

**Response (200):**
```json
{
  "received": true
}
```

---

## Spots Management

### Get All Spots (Premium Only)
**GET** `/api/spots/all`

Get all available fishing spots in Portugal.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "spots": [
    {"id": 1, "nome": "Costa da Caparica", "lat": 38.655, "lng": -9.230},
    {"id": 2, "nome": "Ericeira", "lat": 38.963, "lng": -9.417},
    ...
  ],
  "total": 7
}
```

**Errors:**
- `401` - Autenticação necessária
- `403` - Esta funcionalidade é exclusiva para usuários Premium

---

### Get Favorite Spots
**GET** `/api/spots/favorites`

Get user's favorite spots.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "favorites": [
    {"id": 1, "nome": "Costa da Caparica", "lat": 38.655, "lng": -9.230},
    {"id": 5, "nome": "Sagres", "lat": 37.000, "lng": -8.941}
  ],
  "total": 2
}
```

---

### Add Favorite Spot (Premium Only)
**POST** `/api/spots/favorites`

Add a spot to favorites.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "spotId": 5
}
```

**Response (200):**
```json
{
  "mensagem": "Spot adicionado aos favoritos",
  "spotsFavoritos": [1, 2, 5]
}
```

**Errors:**
- `400` - spotId obrigatório ou spot já está nos favoritos
- `401` - Autenticação necessária
- `403` - Esta funcionalidade é exclusiva para usuários Premium
- `404` - Spot não encontrado

---

### Remove Favorite Spot
**DELETE** `/api/spots/favorites/:spotId`

Remove a spot from favorites.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "mensagem": "Spot removido dos favoritos",
  "spotsFavoritos": [1, 2]
}
```

**Errors:**
- `401` - Autenticação necessária
- `404` - Spot não está nos favoritos

---

## Updated Forecast Endpoint

### Get Forecast
**GET** `/api/previsao?spotId=<id>`

Get fishing forecast for a specific spot. **Now with plan-based access control.**

**Headers (optional):**
```
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `spotId` - Spot ID (required)

**Free Plan Limits:**
- Can only access spots 1, 2, and 3 (Costa da Caparica, Ericeira, Peniche)

**Premium Plan:**
- Can access all spots (1-7)

**Response (200):**
```json
{
  "spot": "Ericeira",
  "agora": "16:23:54",
  "mare": {
    "altura": "3.1m",
    "estado": "Enchente",
    "proxima": "Preia-mar ~2h"
  },
  "ondas": {
    "altura": "1.7m",
    "periodo": "10s",
    "direcao": "270° (W)"
  },
  "vento": {
    "velocidade": "14.0 km/h",
    "rajadas": "22.5 km/h",
    "direcao": "315° (NW)"
  },
  "solunar": {
    "nascerSol": "07:12",
    "porSol": "18:11",
    "luaFase": "Minguante Final",
    "luaFaseValor": "15%"
  },
  "tempAgua": "15.0°C",
  "scorePeixe": 8,
  "bomAgora": true,
  "recomendacao": "🚀 Vai AGORA!",
  "plano": "premium"
}
```

**Errors:**
- `403` - Este spot é exclusivo para usuários Premium
- `404` - Spot não encontrado
- `500` - Erro ao obter dados

---

## Environment Variables

Required environment variables for the backend:

```bash
# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/fishing_db

# Server
PORT=5005
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=http://localhost:3000,chrome-extension://your-extension-id

# JWT Authentication
JWT_SECRET=your_very_long_and_secure_secret_key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_MONTHLY=price_xxxxxxxxxxxxx
STRIPE_PRICE_YEARLY=price_xxxxxxxxxxxxx

# Frontend URL
FRONTEND_URL=chrome-extension://your-extension-id
```

---

## Authentication Flow

1. User registers with email/password → receives JWT token
2. User stores JWT token in extension storage
3. For protected endpoints, include: `Authorization: Bearer <token>`
4. Token expires in 7 days → user must login again
5. To upgrade to Premium, call `/api/subscription/create-checkout`
6. User is redirected to Stripe Checkout
7. After payment, Stripe webhook updates user plan to "premium"
8. Extension checks user plan and enables premium features

---

## Free vs Premium Features

### Free Plan (No Authentication Required)
- Access to 3 spots: Costa da Caparica, Ericeira, Peniche
- Basic fishing forecast
- Score de pesca (1-10)
- Mare, ondas, vento data
- Solunar data (sunrise, sunset, moon phase)

### Premium Plan (Authentication + Active Subscription Required)
- Access to ALL 7 spots in Portugal
- Unlimited favorite spots
- All free features
- Future: 7-day forecast, alerts, historical data

---

## Security Notes

1. **Passwords**: Hashed with bcrypt (10 rounds)
2. **JWT Tokens**: Signed with JWT_SECRET, expire in 7 days
3. **Stripe Webhooks**: Verified with webhook secret signature
4. **CORS**: Restricted to allowed origins
5. **Rate Limiting**: Consider adding rate limiting middleware in production
6. **HTTPS**: Always use HTTPS in production

---

## Testing Endpoints

### Using curl

**Register:**
```bash
curl -X POST http://localhost:5005/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"senha123"}'
```

**Login:**
```bash
curl -X POST http://localhost:5005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"senha123"}'
```

**Get User Info:**
```bash
curl http://localhost:5005/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get Forecast (with auth):**
```bash
curl "http://localhost:5005/api/previsao?spotId=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Next Steps

1. Configure Stripe account and create products
2. Set up environment variables in production
3. Update Chrome extension to use authentication
4. Add UI for login/register
5. Add UI for subscription management
6. Test complete flow from registration to payment

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-12  
**Author:** GitHub Copilot Agent
