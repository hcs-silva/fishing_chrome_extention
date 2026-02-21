# Security Policy

## Segurança da Aplicação Fishing Tides PT

Esta aplicação foi desenvolvida com segurança em mente. Este documento descreve as medidas de segurança implementadas e as melhores práticas para usar e desenvolver a aplicação de forma segura.

## Medidas de Segurança Implementadas

### Backend (API Node.js/Express)

#### 1. Autenticação e Autorização

- ✅ **JWT (JSON Web Tokens)** para autenticação stateless
- ✅ **Bcrypt** para hash de passwords (salt rounds: 10)
- ✅ **Passwords fortes obrigatórias**: mínimo 8 caracteres com letras maiúsculas, minúsculas e números
- ✅ **Tokens com expiração**: JWTs expiram em 7 dias
- ✅ **Middleware de autenticação** protege rotas sensíveis

#### 2. Proteção contra Ataques

- ✅ **Rate Limiting**: Limita requisições por IP para prevenir brute force e DoS
  - Auth endpoints: 5 tentativas / 15 minutos
  - API endpoints: 100 requisições / 15 minutos
  - Subscription endpoints: 10 requisições / 15 minutos
- ✅ **MongoDB Injection**: Sanitização automática de inputs com `express-mongo-sanitize`
- ✅ **XSS Protection**: Sanitização de HTML em outputs
- ✅ **CORS Configurável**: Restringe origens permitidas
- ✅ **Helmet.js**: Headers de segurança HTTP (X-Frame-Options, X-Content-Type-Options, etc.)

#### 3. Validação de Dados

- ✅ **Express-validator** valida e sanitiza todos os inputs
- ✅ **Normalização de emails** (lowercase, trim)
- ✅ **Validação de tipos de dados** (email, password, IDs)

#### 4. Gestão de Erros

- ✅ **Mensagens genéricas em produção**: Não expõe detalhes internos
- ✅ **Logging seguro**: Não faz log de passwords ou tokens
- ✅ **Error handler global**: Captura e trata erros de forma segura

#### 5. Pagamentos (Stripe)

- ✅ **Webhook signature verification**: Valida autenticidade dos webhooks Stripe
- ✅ **Metadata validation**: Verifica ownership das sessões
- ✅ **Test/Live key separation**: Chaves diferentes para dev/prod

#### 6. Base de Dados (MongoDB)

- ✅ **Connection pooling**: Limita conexões simultâneas (max: 10)
- ✅ **Timeouts configurados**: Previne conexões penduradas
- ✅ **Passwords não armazenadas em plain text**: Sempre hashadas com bcrypt

### Frontend (Chrome Extension)

#### 1. Armazenamento Seguro

- ✅ **chrome.storage.local** para tokens JWT (não exposto a páginas web)
- ✅ **Tokens nunca expostos no código frontend**
- ✅ **Service worker** faz chamadas à API (isolamento)

#### 2. Comunicação Segura

- ✅ **HTTPS obrigatório em produção**
- ✅ **Timeout em requisições**: 15 segundos
- ✅ **Validação de respostas da API**

#### 3. Content Security Policy

- ✅ **CSP restritivo**: Apenas scripts da própria extensão
- ✅ **Permissões mínimas**: Apenas `storage` (removida `geolocation` não utilizada)

## Configuração Segura

### Variáveis de Ambiente

**NUNCA comitas o ficheiro `.env` com segredos reais!**

```bash
# Gerar JWT_SECRET forte
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Copiar template
cp backend/.env.example backend/.env

# Editar com valores reais (nunca comitar!)
nano backend/.env
```

### MongoDB

**Desenvolvimento:**

```text
MONGO_URI=mongodb://127.0.0.1:27017/fishing-chrome-extension
```

**Produção (MongoDB Atlas):**

```text
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@cluster.mongodb.net/fishing-chrome-extension?retryWrites=true&w=majority
```

⚠️ **Importante:**

- Usa passwords fortes e únicas
- Restringe acesso por IP (whitelist)
- Ativa autenticação no MongoDB
- Usa MongoDB Atlas em produção

### Stripe

**Desenvolvimento:**

```text
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Produção:**

```text
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

⚠️ **Importante:**

- Nunca uses chaves live em desenvolvimento
- Verifica webhooks em [https://dashboard.stripe.com/webhooks]
- Testa fluxo completo em modo teste antes de ir para produção

## Vulnerabilidades Conhecidas e Mitigações

### 1. Dependency Vulnerabilities

**Mitigação:** Executa regularmente:

```bash
cd backend
npm audit
npm audit fix
npm update
```

### 2. Weak Passwords (Legacy)

**Status:** ✅ CORRIGIDO

- Anteriormente: mínimo 6 caracteres
- Agora: mínimo 8 caracteres + maiúsculas + minúsculas + números

### 3. Information Disclosure

**Status:** ✅ CORRIGIDO

- Erro handler global não expõe stack traces em produção
- Mensagens de erro genéricas para utilizadores

### 4. MongoDB Injection

**Status:** ✅ CORRIGIDO

- `express-mongo-sanitize` remove caracteres perigosos ($, .)
- Validação de inputs com express-validator

## Reportar Vulnerabilidades

Se descobrires uma vulnerabilidade de segurança:

1. **NÃO** abras uma issue pública
2. Envia email para: [inserir email de segurança]
3. Inclui:
   - Descrição detalhada da vulnerabilidade
   - Passos para reproduzir
   - Impacto potencial
   - Sugestões de correção (opcional)

Responderemos em 48 horas e trabalharemos contigo para resolver o problema.

## Melhores Práticas para Desenvolvimento

### Para Developers

1. **Nunca comitar segredos**
   - Usa `.gitignore` (já configurado)
   - Verifica antes de commit: `git diff`
   - Usa variáveis de ambiente

2. **Validar todos os inputs**
   - Backend: express-validator
   - Frontend: validação básica antes de enviar

3. **Sanitizar outputs**
   - Usa escapeHtml() para dados dinâmicos
   - Cuidado com innerHTML

4. **Mantém dependências atualizadas**

   ```bash
   npm audit
   npm update
   npm outdated
   ```

5. **Testa em modo produção**

   ```bash
   NODE_ENV=production npm start
   ```

6. **Revisa código antes de merge**
   - Procura por passwords hardcoded
   - Verifica validação de inputs
   - Confirma tratamento de erros

### Para Utilizadores

1. **Usa passwords fortes e únicas**
   - Mínimo 8 caracteres
   - Mistura de maiúsculas, minúsculas e números
   - Usa gestor de passwords (1Password, Bitwarden, etc.)

2. **Ativa 2FA onde possível**
   - MongoDB Atlas
   - Stripe Dashboard
   - GitHub

3. **Mantém browser atualizado**
   - Chrome updates automáticos
   - Verifica: chrome://settings/help

4. **Não partilhes credenciais**
   - Cada pessoa deve ter a sua conta
   - Nunca partilhes passwords por email/chat

## Compliance e Regulamentação

### RGPD (GDPR)

Esta aplicação processa dados pessoais:

- Email (identificação)
- Password (hashada)
- Dados de pagamento (processados por Stripe, não armazenados)

**Direitos dos utilizadores:**

- Acesso aos dados: GET /api/auth/me
- Eliminação: [implementar endpoint de eliminação de conta]
- Portabilidade: Dados em formato JSON

### PCI DSS

Não armazenamos dados de cartões. Todo o processamento de pagamentos é feito via Stripe (PCI Level 1 compliant).

## Auditorias de Segurança

### Última auditoria: 2026-02-16

**Ferramentas usadas:**

- npm audit (dependências)
- Manual code review
- OWASP Top 10 checklist

**Resultados:**

- ✅ Todas as vulnerabilidades críticas corrigidas
- ✅ Medidas de segurança implementadas
- ⚠️ Recomendação: Implementar 2FA para utilizadores no futuro

### Próxima auditoria: A definir

## Recursos Adicionais

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Stripe Security](https://stripe.com/docs/security)
- [Chrome Extension Security](https://developer.chrome.com/docs/extensions/mv3/security/)

---

**Última atualização:** 2026-02-16  
**Versão:** 1.0.0
