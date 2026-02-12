# Fishing Tides PT — Aplicação

**Descrição:** Pequena API (Node/Express) + extensão Chrome que mostra marés, ondas e um `scorePeixe` por spot em Portugal. O backend produz previsões simuladas (maré sinusoidal, ondas por spot) e a extensão exibe os dados no popup.

---

## 📁 Estrutura do repositório

- `backend/` — API Express, conexão MongoDB, utilitários (`scorePeixe`, `spots`) e modelo `User`.
- `extensão/` — código da Chrome Extension (MV3): `popup/` (HTML/CSS/JS) e `background.js`.
- `README-deploy.md` — guia de deploy no Render.

---

## ⚙️ Funcionalidades principais

- Endpoint GET `/api/previsao?spotId=<id>` devolve:
  - `spot`, `agora`, `mare`, `ondas`, `tempAgua`, `scorePeixe`, `bomAgora`, `recomendacao`.
- Lógica de score baseada em: maré, hora do dia, ondas, dia da semana e base por spot.
- Extensão com UI: seleção de spot, badge com score e painel de **Settings** para configurar `API URL` (armazenado em `chrome.storage`).

---

## 🔌 Endpoints

- GET `/api/previsao?spotId=1` — exemplo: `curl https://fishing-chrome-extention.onrender.com/api/previsao?spotId=1`

(O backend só expõe rotas sob `/api` — a raiz `/` não tem UI.)

---

## 🧩 Variáveis de ambiente (backend)

- `MONGO_URI` — connection string do MongoDB Atlas
- `NODE_ENV` — `production` ou `development`
- `ALLOWED_ORIGINS` — lista separada por vírgulas das origens permitidas para CORS (ex.: `https://fishing-chrome-extention.onrender.com,chrome-extension://<ID>`)
- `JWT_SECRET` — se implementares auth

> Nota: `PORT` é fornecida pelo Render em produção. O `server.js` usa `process.env.PORT || 3000`.

---

## ▶️ Executar localmente

1. Instalar dependências: `cd backend && npm install`
2. Definir `MONGO_URI` em `.env` (opcional para funcionamento reduzido)
3. Iniciar em modo dev: `npm run dev` (nodemon) ou `npm start`
4. Abrir a extensão no Chrome (carregar unpacked) e definir `API URL` no Settings do popup se necessário.

---

## 🚀 Deploy

Seguir os passos em `README-deploy.md` para criar o serviço no Render e conectar o MongoDB Atlas. Após o deploy, atualizar `extensão/manifest.json` `host_permissions` e recarregar a extensão.

---

## 🔒 Segurança / CORS

- Em produção define `ALLOWED_ORIGINS` estritamente (não usar `*`).
- Mantém segredos (Mongo URI, JWT secret) fora do repositório.

---

## 💎 Plano de Monetização

Este projeto inclui um **plano de monetização Freemium + Subscrição** detalhado:

- 📄 **[MONETIZATION_PLAN.md](MONETIZATION_PLAN.md)** — Plano completo em português
- 📄 **[MONETIZATION_PLAN_EN.md](MONETIZATION_PLAN_EN.md)** — Complete plan in English

O plano inclui:
- Estrutura de planos (FREE vs PREMIUM)
- Estratégia de preços (€4.99/mês ou €49.99/ano)
- Roadmap de implementação (8-12 semanas)
- Integração com Stripe
- Análise financeira e KPIs
- Estratégias de conversão e marketing

---

## 📌 Próximos passos / TODO

- Implementar autenticação e rotas para favoritos de spots (User model já presente).
- Implementar sistema de subscrições (ver MONETIZATION_PLAN.md).
- Adicionar testes unitários para `scorePeixe`.
- Opcional: `render.yaml` para deploy como infra-as-code.

---

## Contacto

- Se quiseres, posso gerar o `render.yaml` de exemplo ou abrir um PR com pequenas melhorias (logs CORS, rota `/` de health).
