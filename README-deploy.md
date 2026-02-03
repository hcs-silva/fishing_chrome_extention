# Deploy no Render (Passo-a-passo)

Este documento descreve os passos para colocar o backend (pasta `backend/`) no Render e integrar a extensão.

## 1. Preparar o repositório

- Confirma que `package.json` tem `start: node server.js` (já presente).
- Garante que variáveis sensíveis não estão no repositório. Usa `process.env` para segredos.

## 2. MongoDB Atlas

1. Cria conta e cluster em [https://cloud.mongodb.com]
2. Cria um utilizador DB e guarda user/pass
3. Permite IPs de acesso (0.0.0.0/0 só para testes)
4. Copia a connection string (ex.: `mongodb+srv://USER:PASS@cluster0.mongodb.net/fishing?retryWrites=true&w=majority`)

## 3. Criar Web Service no Render

1. Acede [https://dashboard.render.com] → New → Web Service
2. Conecta o repositório GitHub/GitLab e escolhe a branch (ex.: `main`)
3. Configura:
   - Build Command: `npm install` (ou deixar em branco)
   - Start Command: `npm start`
   - Região e plano conforme tua necessidade
4. Clica Create

## 4. Variáveis de ambiente no Render

No painel do serviço → Environment → Add Environment Variable:

- `MONGO_URI` = (string do Atlas)
- `NODE_ENV` = `production`
- `ALLOWED_ORIGINS` = `https://fishing-chrome-extention.onrender.com,chrome-extension://<ID>`
- `JWT_SECRET` = <segredo>
- Outros segredos necessários (STRIPE_KEY, etc.)

> Nota: Render fornece a `PORT` automaticamente. O `server.js` usa `process.env.PORT || 3000`.

## 5. CORS

- Garante que a variável `ALLOWED_ORIGINS` em produção contenha o domínio do serviço no Render e o `chrome-extension://<ID>` da tua extensão.
- `app.js` já tenta ler `ALLOWED_ORIGINS`, ajusta se necessário.

## 6. Validar Endpoint

- Após deploy, usa `curl` ou browser:
  `curl https://fishing-chrome-extention.onrender.com/api/previsao?spotId=1`
- Deve devolver JSON com `spot`, `mare`, `ondas`, `scorePeixe` etc.

## 7. Atualizar Extensão Chrome

- Em `extensão/manifest.json` adiciona `https://fishing-chrome-extention.onrender.com/*` em `host_permissions`. (Atualizado automaticamente)
- Atualiza `extensão/popup/popup.js` para apontar à URL do Render ou usa o novo painel de **Settings** na popup para definir a `API URL` sem editar ficheiros.
- Recarrega a extensão em chrome://extensions → Reload

## 8. Pós-deploy (boas práticas)

- Ativa deploy automático no Render quando fizeres push para a branch escolhida.
- Configura health checks, limits e alerts no Render.
- Usa `render.yaml` para infra como código se preferires (opcional).

---

Se quiseres, ajudo a:

- Preencher as variáveis do Render diretamente (precisas da URL/credentials)? ✅
- Fazer um `render.yaml` de exemplo para deploy automatizado? ✅

Indica qual das opções preferes.
