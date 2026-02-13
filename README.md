# Fishing Tides PT

Aplicação composta por API Node/Express + extensão Chrome (Manifest V3) para previsão de pesca em Portugal com modelo Freemium e subscrição Stripe.

## Funcionalidades atuais

### Previsão de pesca

- Consulta por spot com maré, ondas, vento, temperatura da água e dados solunares.
- Cálculo de `scorePeixe` e recomendação no popup da extensão.
- Seleção rápida de spots portugueses no popup.

### Autenticação (FREE)

- Registo de conta FREE (`/api/auth/register`).
- Login (`/api/auth/login`).
- JWT guardado internamente em `chrome.storage.local`.
- O token **não é exposto no frontend**.

### Subscrição Stripe (PREMIUM)

- Criação de checkout de subscrição (`/api/subscription/create-checkout`).
- Consulta de estado de plano (`/api/subscription/status`).
- Acesso ao Stripe Billing Portal (`/api/subscription/create-portal`).
- Cancelamento de subscrição (`/api/subscription/cancel`).
- Atualização automática do plano via webhook Stripe (`/api/subscription/webhook`).

### UX atual da extensão

- No estado inicial, mostra apenas os botões **Criar conta FREE** e **Entrar**.
- O formulário de email/password só aparece após o utilizador escolher um dos fluxos.
- Após autenticação, mostra ações de subscrição (estado, upgrade, gerir plano, sair).

## Arquitetura

- `backend/` API Express, MongoDB, autenticação JWT, rotas de subscrição Stripe.
- `extensão/` popup UI + service worker (`background.js`) para chamadas seguras à API.

## API principal

### Previsão

- `GET /api/previsao?spotId=<id>`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Subscrição

- `GET /api/subscription/status`
- `POST /api/subscription/create-checkout`
- `GET /api/subscription/checkout-session/:sessionId`
- `POST /api/subscription/create-portal`
- `POST /api/subscription/cancel`
- `POST /api/subscription/webhook`

## Variáveis de ambiente (backend)

- `MONGO_URI` (opcional; sem isto usa `mongodb://127.0.0.1:27017/fishing-chrome-extension`)
- `PORT` (default `5005`)
- `NODE_ENV`
- `ALLOWED_ORIGINS`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_MONTHLY`
- `STRIPE_PRICE_YEARLY`
- `FRONTEND_URL`

## Executar localmente

1. Iniciar MongoDB local (ou configurar `MONGO_URI` para Atlas).
2. No backend:
   - `cd backend`
   - `pnpm install`
   - `pnpm dev`
3. Carregar extensão em `chrome://extensions` (Load unpacked em `extensão/`).
4. Recarregar a extensão após alterações no `background.js`.

## Como a extensão escolhe a API

O service worker tenta nesta ordem:

1. `http://localhost:5005/api`
2. `https://fishing-chrome-extention.onrender.com/api`

Isto permite desenvolvimento local com fallback para produção.

## Teste de fluxo completo (FREE -> PREMIUM)

1. Abrir popup e clicar **Criar conta FREE**.
2. Submeter email/password e confirmar login automático.
3. Clicar **Upgrade mensal** para abrir Stripe Checkout.
4. Concluir pagamento em modo teste Stripe.
5. Confirmar webhook recebido no backend.
6. Voltar ao popup e clicar **Ver estado** para validar plano PREMIUM.

## Documentação adicional

- [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- [BACKEND_MONETIZATION_API.md](BACKEND_MONETIZATION_API.md)
- [MONETIZATION_PLAN.md](MONETIZATION_PLAN.md)
- [MONETIZATION_PLAN_EN.md](MONETIZATION_PLAN_EN.md)
