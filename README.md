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
- Sincronização imediata pós-checkout (`/api/subscription/finalize-checkout`).
- Página de retorno hospedada para voltar à extensão (`/api/subscription/return`).
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
- `POST /api/subscription/finalize-checkout`
- `POST /api/subscription/create-portal`
- `GET /api/subscription/return`
- `POST /api/subscription/cancel`
- `POST /api/subscription/webhook`

## Variáveis de ambiente (backend)

⚠️ **IMPORTANTE**: Nunca comitas o ficheiro `.env` com segredos reais. Usa `.env.example` como template.

- `MONGO_URI` (opcional; sem isto usa `mongodb://127.0.0.1:27017/fishing-chrome-extension`)
- `PORT` (default `5005`)
- `NODE_ENV` (development/production)
- `ALLOWED_ORIGINS` (domínios permitidos, separados por vírgula)
- `JWT_SECRET` ⚠️ **CRÍTICO**: Gera um segredo forte com `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `STRIPE_SECRET_KEY` ⚠️ **SENSÍVEL**: Usa chaves de teste (`sk_test_`) em desenvolvimento
- `STRIPE_WEBHOOK_SECRET` ⚠️ **SENSÍVEL**: Sem espaços (ex.: `STRIPE_WEBHOOK_SECRET=whsec_xxx`)
- `STRIPE_PRICE_MONTHLY`
- `STRIPE_PRICE_YEARLY`
- `FRONTEND_URL`

### Configuração segura

1. Copia `.env.example` para `.env`: `cp backend/.env.example backend/.env`
2. Preenche os valores no `.env` com as tuas credenciais
3. **NUNCA** partilhes ou comitas o ficheiro `.env`
4. Em produção, usa sempre HTTPS e credenciais de produção

## Segurança

### Medidas implementadas

- ✅ Autenticação JWT com tokens seguros
- ✅ Passwords hashadas com bcrypt
- ✅ Rate limiting em todas as rotas
- ✅ Proteção contra injeção MongoDB (mongo-sanitize)
- ✅ Proteção XSS com sanitização de outputs
- ✅ Headers de segurança HTTP (helmet)
- ✅ Validação e sanitização de inputs
- ✅ Passwords fortes obrigatórias (min 8 caracteres, maiúsculas, minúsculas e números)
- ✅ CORS configurável
- ✅ Webhook Stripe com verificação de assinatura
- ✅ Gestão de erros segura (mensagens genéricas em produção)
- ✅ Timeout de 15s nas chamadas da extensão
- ✅ CSP restritiva e permissões mínimas na extensão

### Limites de rate limiting

- Auth: `5` tentativas por `15` minutos
- API geral: `100` requisições por `15` minutos
- Subscrição: `10` requisições por `15` minutos

### Vulnerabilidades conhecidas e mitigação

- Vulnerabilidades de dependências: executar regularmente `npm audit`, `npm audit fix`, `npm update`
- Weak Passwords (legacy): **corrigido** (de mínimo 6 para mínimo 8 + complexidade)
- Information disclosure: **corrigido** com error handler global seguro
- MongoDB injection: **corrigido** com `express-mongo-sanitize` + validação de inputs

### Melhores práticas

1. **Passwords**: Mínimo 8 caracteres com letras maiúsculas, minúsculas e números
2. **Secrets**: Gera segredos fortes e únicos para produção
3. **HTTPS**: Usa sempre HTTPS em produção (nunca HTTP)
4. **Dependências**: Mantém atualizadas com `npm audit` e `npm update`
5. **MongoDB**: Usa autenticação e restringe acesso por IP
6. **Stripe**: Usa chaves de teste em dev, chaves live só em produção
7. **Logs**: Não faças log de passwords, tokens ou dados sensíveis
8. **2FA**: Ativa autenticação de dois fatores em todas as contas (MongoDB Atlas, Stripe, GitHub)

### Compliance

- **RGPD (GDPR)**: a aplicação processa email, password (hash) e metadados de pagamento via Stripe
- **PCI DSS**: dados de cartão não são armazenados; processamento realizado pela Stripe (PCI Level 1)

### Reportar vulnerabilidades

1. **NÃO** abrir issue pública para falhas de segurança
2. Reportar por canal privado de segurança
3. Incluir descrição, passos para reproduzir, impacto e sugestão de correção (opcional)

Para política completa e procedimento detalhado, consultar `SECURITY.md`.

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
5. Após pagamento, o Stripe redireciona para `/api/subscription/return`, que volta à extensão.
6. A extensão sincroniza o plano via `finalize-checkout` (não depende apenas do webhook).
7. Clicar **Ver estado** para validar plano PREMIUM.

## Troubleshooting rápido (plano continua FREE)

- Confirmar que o checkout foi concluído e voltou com `billingStatus=success` e `session_id`.
- Verificar `STRIPE_WEBHOOK_SECRET` sem espaços e com valor correto de teste (`whsec_...`).
- Recarregar a extensão após alterações de `manifest.json`, `background.js` ou `popup.js`.
- Validar `ALLOWED_ORIGINS` com o `chrome-extension://<ID>` correto.
- No backend, confirmar logs de `finalize-checkout` e `/webhook`.

## Documentação adicional

- [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- [BACKEND_MONETIZATION_API.md](BACKEND_MONETIZATION_API.md)
- [MONETIZATION_PLAN.md](MONETIZATION_PLAN.md)
- [MONETIZATION_PLAN_EN.md](MONETIZATION_PLAN_EN.md)
