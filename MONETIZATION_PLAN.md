# Plano de Monetização — Fishing Tides PT
## Freemium + Subscrição

---

## 📋 Visão Geral

Este documento define a estratégia de monetização para a extensão Chrome **Fishing Tides PT**, implementando um modelo **Freemium** com subscrição **Premium**.

---

## 🎯 Objetivos

1. **Sustentabilidade**: Gerar receita para manter e melhorar a aplicação
2. **Acessibilidade**: Manter funcionalidades essenciais gratuitas
3. **Valor Premium**: Oferecer funcionalidades avançadas que justifiquem a subscrição
4. **Escalabilidade**: Estrutura preparada para crescimento

---

## 💎 Estrutura de Planos

### Plano FREE (Gratuito)

**Preço**: €0/mês

**Funcionalidades Incluídas**:
- ✅ Acesso básico a **3 spots de pesca** pré-selecionados
- ✅ Previsão de marés (dados básicos)
- ✅ Score de pesca (1-10) para o dia atual
- ✅ Condições básicas de ondas e vento
- ✅ Fase lunar atual
- ✅ Horários de nascer/pôr do sol
- ✅ 1 atualização por hora
- ✅ Histórico de 24 horas

**Limitações**:
- ❌ Apenas 3 spots disponíveis
- ❌ Sem alertas personalizados
- ❌ Sem previsão estendida (7 dias)
- ❌ Sem análise histórica
- ❌ Sem spots favoritos ilimitados

---

### Plano PREMIUM

**Preço**: €4.99/mês ou €49.99/ano (economize 17%)

**Funcionalidades Premium**:
- ✅ Acesso a **TODOS os spots** de pesca em Portugal (30+)
- ✅ **Spots favoritos ilimitados**
- ✅ **Previsão estendida** de 7 dias
- ✅ **Alertas personalizados** (score > X, condições ideais)
- ✅ **Análise de tendências** e padrões históricos
- ✅ **Melhores horários** do dia para pesca (baseado em algoritmo avançado)
- ✅ **Comparação de spots** lado a lado
- ✅ **Mapas de calor** de atividade de pesca
- ✅ **Notificações push** quando condições são ideias
- ✅ **Dados de temperatura da água**
- ✅ **Previsão de correntes marítimas**
- ✅ **Calendário lunar avançado** (períodos solunar completos)
- ✅ **Histórico de até 30 dias**
- ✅ **Atualizações em tempo real** (a cada 15 minutos)
- ✅ **Suporte prioritário**
- ✅ **Sem anúncios**

---

## 💰 Estratégia de Preços

### Preços Propostos

| Plano | Mensal | Anual | Economia |
|-------|--------|-------|----------|
| FREE | €0 | €0 | - |
| PREMIUM | €4.99 | €49.99 | 17% |

### Justificação dos Preços

- **€4.99/mês**: Preço competitivo comparado a apps similares (€3-€10/mês)
- **Preço de café**: Menos que dois cafés por mês
- **Plano anual**: Incentiva compromisso de longo prazo
- **Margem saudável**: Cobre custos de infraestrutura (APIs, servidores, MongoDB)

### Benchmark de Mercado

- **Windy.com Premium**: €18.99/ano
- **Tides Near Me Pro**: €4.99/mês
- **Fishbrain Premium**: €9.99/mês
- **MyTide Premium**: €2.99/mês

**Posicionamento**: Meio termo com valor excepcional

---

## 🚀 Roadmap de Implementação

### Fase 1: Infraestrutura Base (2-3 semanas)

**Backend**:
- [x] Modelo User com campo `plano` (já implementado)
- [ ] Rotas de autenticação (registro, login, logout)
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- [ ] Middleware de autenticação JWT
- [ ] Middleware de verificação de plano
- [ ] Rotas de gestão de subscrição
  - `GET /api/subscription/status`
  - `POST /api/subscription/create-checkout`
  - `POST /api/subscription/cancel`
  - `POST /api/subscription/webhook` (Stripe)

**Stripe Integration**:
- [ ] Configurar produtos no Stripe Dashboard
  - Premium Monthly (€4.99)
  - Premium Yearly (€49.99)
- [ ] Implementar Stripe Checkout
- [ ] Configurar webhooks para eventos
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

**Database**:
- [ ] Adicionar campos ao User model:
  ```javascript
  {
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    planoExpiraEm: Date,
    planoStatus: String, // active | canceled | past_due
    spotsFavoritos: [Number],
    configuracoes: {
      alertas: Boolean,
      notificacoes: Boolean,
      scoreMinimo: Number
    }
  }
  ```

### Fase 2: Features Premium (3-4 semanas)

**Backend**:
- [ ] Endpoint de previsão estendida (7 dias)
  - `GET /api/previsao/extended?spotId=X`
- [ ] Endpoint de todos os spots (restrito a premium)
  - `GET /api/spots/all` (requer premium)
- [ ] Endpoint de spots favoritos
  - `GET /api/spots/favorites`
  - `POST /api/spots/favorites`
  - `DELETE /api/spots/favorites/:spotId`
- [ ] Endpoint de alertas
  - `GET /api/alerts`
  - `POST /api/alerts`
  - `PUT /api/alerts/:id`
  - `DELETE /api/alerts/:id`
- [ ] Endpoint de histórico
  - `GET /api/historico?spotId=X&days=30`
- [ ] Sistema de notificações push

**APIs Adicionais** (considerar):
- [ ] WorldTides API para marés mais precisas
- [ ] Dados de temperatura da água
- [ ] Dados de correntes marítimas

### Fase 3: Interface do Usuário (2-3 semanas)

**Extensão Chrome**:
- [ ] Tela de login/registro no popup
- [ ] Indicador de plano (Free/Premium)
- [ ] Badge premium no ícone da extensão
- [ ] Página de upgrade para Premium
- [ ] Seletor de todos os spots (premium)
- [ ] Interface de spots favoritos
- [ ] Interface de alertas
- [ ] Previsão de 7 dias (gráfico)
- [ ] Comparador de spots
- [ ] Configurações de notificações

**Design**:
- [ ] Criar mockups das telas
- [ ] Definir paleta de cores premium (dourado/azul)
- [ ] Ícones para features premium
- [ ] Animações e transições

### Fase 4: Testes e Launch (1-2 semanas)

- [ ] Testes de integração Stripe
- [ ] Testes de fluxo de pagamento (sandbox)
- [ ] Testes de upgrade/downgrade
- [ ] Testes de cancelamento
- [ ] Testes de webhooks
- [ ] Validação de segurança
- [ ] Auditoria de código
- [ ] Beta testing com 10-20 usuários
- [ ] Documentação de API
- [ ] Termos de Serviço
- [ ] Política de Privacidade
- [ ] Página de FAQ

### Fase 5: Marketing e Growth (contínuo)

- [ ] Landing page
- [ ] Vídeo demo
- [ ] Screenshots para Chrome Web Store
- [ ] Estratégia de redes sociais
- [ ] Email marketing
- [ ] Programa de referência (opcional)
- [ ] Blog posts sobre pesca
- [ ] Parceria com comunidades de pesca

---

## 🛡️ Segurança e Compliance

### Medidas de Segurança

- ✅ **HTTPS obrigatório** em produção
- ✅ **JWT com expiração** (7 dias, refresh tokens)
- ✅ **Passwords hasheadas** com bcrypt (10 rounds)
- ✅ **Rate limiting** em endpoints sensíveis
- ✅ **Validação de inputs** em todas as rotas
- ✅ **CORS** configurado corretamente
- ✅ **Secrets em variáveis de ambiente**
- ✅ **Stripe webhooks assinados** (webhook secret)

### GDPR Compliance

- [ ] Consentimento explícito para cookies
- [ ] Política de privacidade clara
- [ ] Direito ao esquecimento (delete account)
- [ ] Exportação de dados do usuário
- [ ] Opt-in para emails marketing
- [ ] Armazenamento seguro de dados pessoais

### Pagamentos PCI-DSS

- ✅ **Stripe** lida com dados de cartão (PCI compliant)
- ✅ Não armazenamos números de cartão
- ✅ Apenas customer ID e subscription ID

---

## 📊 Métricas e KPIs

### Métricas Chave a Monitorar

1. **Aquisição**:
   - Instalações da extensão (total)
   - Novos registros (free)
   - Taxa de conversão (install → registro)

2. **Conversão**:
   - Free → Premium (taxa de conversão)
   - Trial → Paid (se implementar trial)
   - Tempo médio até conversão

3. **Retenção**:
   - Churn rate mensal
   - Lifetime Value (LTV)
   - Taxa de renovação anual

4. **Receita**:
   - MRR (Monthly Recurring Revenue)
   - ARR (Annual Recurring Revenue)
   - ARPU (Average Revenue Per User)

5. **Engajamento**:
   - DAU/MAU (Daily/Monthly Active Users)
   - Features mais usadas
   - Tempo médio na extensão

### Objetivos do Primeiro Ano

| Métrica | Q1 | Q2 | Q3 | Q4 |
|---------|----|----|----|----|
| Total Users | 100 | 500 | 1,500 | 3,000 |
| Premium Users | 5 | 50 | 150 | 300 |
| Conversão Rate | 5% | 10% | 10% | 10% |
| MRR | €25 | €250 | €750 | €1,500 |
| Churn Rate | - | 10% | 8% | 5% |

---

## 💡 Estratégias de Conversão

### 1. Trial Gratuito (Opcional)

- **7 dias de Premium grátis** para novos usuários
- Sem necessidade de cartão de crédito
- Notificação 2 dias antes do fim do trial
- Email com benefícios antes de expirar

### 2. Upselling Inteligente

- **Prompts contextuais**: "Ver previsão de 7 dias? Upgrade para Premium"
- **Feature teasing**: Mostrar features bloqueadas com ícone de cadeado
- **Score alto**: "Condições perfeitas! Notificações automáticas com Premium"
- **Limitações visíveis**: "2 de 3 spots grátis usados"

### 3. Incentivos Promocionais

- **Early bird**: 20% desconto nos primeiros 3 meses (lançamento)
- **Black Friday**: 50% desconto no plano anual
- **Referral**: 1 mês grátis por cada amigo que subscrever
- **Anual vs Mensal**: Destacar economia de 17%

### 4. Social Proof

- **Testemunhos** de pescadores satisfeitos
- **Ratings** na Chrome Web Store
- **Número de usuários** ativos
- **Casos de sucesso**: "Usuário X capturou Y peixes"

---

## 🔄 Gestão de Subscrições

### Fluxo de Subscrição

```
1. User clica "Upgrade to Premium"
2. Redirecionado para Stripe Checkout
3. Escolhe plano (mensal/anual)
4. Completa pagamento
5. Stripe webhook → Backend atualiza User.plano
6. User recebe email de confirmação
7. Extensão atualiza UI automaticamente
```

### Cancelamento

- **Self-service**: User pode cancelar a qualquer momento
- **Manter até fim do período**: Acesso até final do billing cycle
- **Survey de cancelamento**: "Por que está cancelando?"
- **Opção de pausa**: 1 mês de pausa (opcional)

### Gestão de Falhas de Pagamento

1. **Retry automático**: Stripe tenta 3-4x
2. **Email de alerta**: "Problema com pagamento"
3. **Downgrade gracioso**: 7 dias de grace period
4. **Reativação fácil**: Link direto para atualizar cartão

---

## 🌍 Expansão Futura

### Novos Mercados

- Espanha (tradução espanhol)
- França (tradução francês)
- UK/Irlanda (já em inglês)

### Novos Planos (Futuro)

**PREMIUM PLUS** (€9.99/mês):
- Tudo do Premium
- Acesso a spots internacionais
- API access para desenvolvedores
- Dados históricos ilimitados
- Consultas personalizadas por email

**TEAM/CLUB** (€29.99/mês):
- 5-10 contas
- Dashboard compartilhado
- Estatísticas de grupo
- Calendário de saídas

---

## 📝 Documentação Necessária

### Para Usuários

- [ ] **FAQ**: Perguntas frequentes sobre planos
- [ ] **Guia de Upgrade**: Como fazer upgrade
- [ ] **Comparação de Planos**: Tabela detalhada
- [ ] **Termos de Serviço**: Legalmente vinculativo
- [ ] **Política de Privacidade**: GDPR compliant
- [ ] **Política de Reembolso**: 14 dias money-back

### Para Desenvolvedores

- [ ] **API Documentation**: Endpoints autenticados
- [ ] **Stripe Integration Guide**: Setup e webhooks
- [ ] **Database Schema**: Modelo de dados
- [ ] **Deployment Guide**: Deploy com Stripe
- [ ] **Testing Guide**: Testes de pagamento

---

## 🎨 Materiais de Marketing

### Messaging Principal

**Headline**: "Pesca Mais, Preocupa-te Menos"

**Subheadline**: "Condições perfeitas de pesca no teu bolso. Dados em tempo real, alertas inteligentes, todos os spots de Portugal."

**Call-to-Action**: "Experimenta Premium Grátis por 7 Dias"

### Features Highlights

1. 🎯 **Precisão**: Algoritmo avançado de score de pesca
2. 🌊 **Dados Reais**: APIs profissionais de meteorologia
3. 📍 **30+ Spots**: Todos os melhores locais de Portugal
4. 🔔 **Alertas**: Notificações quando condições são ideais
5. 📊 **Análise**: Histórico e tendências para melhor planeamento

---

## 💼 Análise Financeira

### Custos Mensais (Estimados)

| Item | Custo |
|------|-------|
| Render (Backend) | €7/mês |
| MongoDB Atlas | €9/mês |
| Stripe Fees (2.9% + €0.25) | Variável |
| Domínio | €1/mês |
| Email Service (SendGrid) | €0-15/mês |
| **TOTAL** | ~€20-30/mês |

### Ponto de Equilíbrio

- **Break-even**: 6-7 subscritores premium mensais
- **Lucro**: A partir do 8º subscritor
- **Objetivo Q1**: 5 subscritores (quase break-even)
- **Objetivo Q4**: 300 subscritores (€1,500 MRR - €30 custos = €1,470 lucro)

### Projeção de Receita Anual (Conservadora)

- **Ano 1**: €1,500 MRR × 12 = €18,000 ARR
- **Custos Ano 1**: ~€400
- **Lucro Líquido Ano 1**: ~€17,600

---

## 🎯 Próximos Passos Imediatos

### Prioridade Máxima (Sprint 1-2)

1. [ ] Configurar conta Stripe em modo test
2. [ ] Implementar rotas de autenticação
3. [ ] Criar produtos no Stripe Dashboard
4. [ ] Implementar middleware de verificação de plano
5. [ ] Adicionar UI de login na extensão
6. [ ] Testar fluxo básico de checkout

### Quick Wins

- Usar Stripe Customer Portal para gestão de subscrições
- Implementar apenas Monthly no início (simplificar)
- Focar em 2-3 features premium essenciais primeiro
- Usar templates de email do Stripe

---

## 📞 Suporte

### Canais de Suporte

- **Email**: support@fishingtides.pt (a criar)
- **FAQ**: Na extensão e website
- **Discord/Slack**: Comunidade (futuro)

### SLA

- **Free**: 5-7 dias úteis
- **Premium**: 24-48 horas
- **Crítico**: 2-4 horas (pagamentos)

---

## 🏁 Conclusão

Este plano de monetização Freemium + Subscrição é:

- ✅ **Viável**: Infraestrutura já parcialmente pronta
- ✅ **Justo**: Plano gratuito com valor real
- ✅ **Escalável**: Preparado para crescimento
- ✅ **Sustentável**: Break-even com poucos usuários
- ✅ **Competitivo**: Preço alinhado com mercado

**Estimativa Total de Implementação**: 8-12 semanas

**ROI Esperado**: Positivo a partir do 3º mês

---

**Documento criado**: 2026-02-12  
**Versão**: 1.0  
**Status**: ✅ Aprovado para implementação
