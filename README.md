# Fishing Tides PT — Aplicação

**Descrição:** Pequena API (Node/Express) + extensão Chrome que mostra marés, ondas e um `scorePeixe` por spot em Portugal. O backend produz previsões simuladas (maré sinusoidal, ondas por spot) e a extensão exibe os dados no popup via service worker.

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
- Extensão com UI: seleção de spot e badge com score; as chamadas a API passam pelo `background.js` para não expor o URL no frontend.

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
4. Abrir a extensão no Chrome (carregar unpacked). Se mudares o backend, ajusta o `API_URL` em `extensão/background.js` e recarrega a extensão.

> Nota: em `chrome://extensions`, usa o link “Service worker” -> “Inspect views” para confirmar que o worker arrancou e ver logs.

---

## 🚀 Deploy

Seguir os passos em `README-deploy.md` para criar o serviço no Render e conectar o MongoDB Atlas. Após o deploy, atualizar `extensão/manifest.json` `host_permissions` e recarregar a extensão.

---

## 🔒 Segurança / CORS

- Em produção define `ALLOWED_ORIGINS` estritamente (não usar `*`).
- Mantém segredos (Mongo URI, JWT secret) fora do repositório.

---

## 📌 Próximos passos / TODO

- Implementar autenticação e rotas para favoritos de spots (User model já presente).
- Adicionar testes unitários para `scorePeixe`.
- Opcional: `render.yaml` para deploy como infra-as-code.

---

## Contacto

- Se quiseres, posso gerar o `render.yaml` de exemplo ou abrir um PR com pequenas melhorias (logs CORS, rota `/` de health).
