# Monetization Plan — Fishing Tides PT
## Freemium + Subscription Model

---

## 📋 Overview

This document defines the monetization strategy for the **Fishing Tides PT** Chrome extension, implementing a **Freemium** model with a **Premium** subscription tier.

---

## 🎯 Objectives

1. **Sustainability**: Generate revenue to maintain and improve the application
2. **Accessibility**: Keep essential features free
3. **Premium Value**: Offer advanced features that justify the subscription
4. **Scalability**: Structure prepared for growth

---

## 💎 Plan Structure

### FREE Plan

**Price**: €0/month

**Included Features**:
- ✅ Basic access to **3 pre-selected fishing spots**
- ✅ Tide predictions (basic data)
- ✅ Fishing score (1-10) for current day
- ✅ Basic wave and wind conditions
- ✅ Current moon phase
- ✅ Sunrise/sunset times
- ✅ 1 update per hour
- ✅ 24-hour history

**Limitations**:
- ❌ Only 3 spots available
- ❌ No personalized alerts
- ❌ No extended forecast (7 days)
- ❌ No historical analysis
- ❌ No unlimited favorite spots

---

### PREMIUM Plan

**Price**: €4.99/month or €49.99/year (save 17%)

**Premium Features**:
- ✅ Access to **ALL fishing spots** in Portugal (30+)
- ✅ **Unlimited favorite spots**
- ✅ **7-day extended forecast**
- ✅ **Personalized alerts** (score > X, ideal conditions)
- ✅ **Trend analysis** and historical patterns
- ✅ **Best fishing times** of the day (advanced algorithm)
- ✅ **Side-by-side spot comparison**
- ✅ **Fishing activity heat maps**
- ✅ **Push notifications** when conditions are ideal
- ✅ **Water temperature data**
- ✅ **Marine current predictions**
- ✅ **Advanced lunar calendar** (complete solunar periods)
- ✅ **Up to 30-day history**
- ✅ **Real-time updates** (every 15 minutes)
- ✅ **Priority support**
- ✅ **Ad-free experience**

---

## 💰 Pricing Strategy

### Proposed Pricing

| Plan | Monthly | Annual | Savings |
|------|---------|--------|---------|
| FREE | €0 | €0 | - |
| PREMIUM | €4.99 | €49.99 | 17% |

### Price Justification

- **€4.99/month**: Competitive compared to similar apps (€3-€10/month)
- **Coffee price**: Less than two coffees per month
- **Annual plan**: Encourages long-term commitment
- **Healthy margin**: Covers infrastructure costs (APIs, servers, MongoDB)

### Market Benchmark

- **Windy.com Premium**: €18.99/year
- **Tides Near Me Pro**: €4.99/month
- **Fishbrain Premium**: €9.99/month
- **MyTide Premium**: €2.99/month

**Positioning**: Middle ground with exceptional value

---

## 🚀 Implementation Roadmap

### Phase 1: Base Infrastructure (2-3 weeks)

**Backend**:
- [x] User model with `plano` field (already implemented)
- [ ] Authentication routes (register, login, logout)
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- [ ] JWT authentication middleware
- [ ] Plan verification middleware
- [ ] Subscription management routes
  - `GET /api/subscription/status`
  - `POST /api/subscription/create-checkout`
  - `POST /api/subscription/cancel`
  - `POST /api/subscription/webhook` (Stripe)

**Stripe Integration**:
- [ ] Configure products in Stripe Dashboard
  - Premium Monthly (€4.99)
  - Premium Yearly (€49.99)
- [ ] Implement Stripe Checkout
- [ ] Configure webhooks for events
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

**Database**:
- [ ] Add fields to User model:
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

### Phase 2: Premium Features (3-4 weeks)

**Backend**:
- [ ] Extended forecast endpoint (7 days)
  - `GET /api/previsao/extended?spotId=X`
- [ ] All spots endpoint (premium restricted)
  - `GET /api/spots/all` (requires premium)
- [ ] Favorite spots endpoints
  - `GET /api/spots/favorites`
  - `POST /api/spots/favorites`
  - `DELETE /api/spots/favorites/:spotId`
- [ ] Alerts endpoints
  - `GET /api/alerts`
  - `POST /api/alerts`
  - `PUT /api/alerts/:id`
  - `DELETE /api/alerts/:id`
- [ ] Historical data endpoint
  - `GET /api/historico?spotId=X&days=30`
- [ ] Push notification system

**Additional APIs** (consider):
- [ ] WorldTides API for more accurate tides
- [ ] Water temperature data
- [ ] Marine current data

### Phase 3: User Interface (2-3 weeks)

**Chrome Extension**:
- [ ] Login/register screen in popup
- [ ] Plan indicator (Free/Premium)
- [ ] Premium badge on extension icon
- [ ] Upgrade to Premium page
- [ ] All spots selector (premium)
- [ ] Favorite spots interface
- [ ] Alerts interface
- [ ] 7-day forecast (chart)
- [ ] Spot comparison tool
- [ ] Notification settings

**Design**:
- [ ] Create screen mockups
- [ ] Define premium color palette (gold/blue)
- [ ] Icons for premium features
- [ ] Animations and transitions

### Phase 4: Testing and Launch (1-2 weeks)

- [ ] Stripe integration tests
- [ ] Payment flow tests (sandbox)
- [ ] Upgrade/downgrade tests
- [ ] Cancellation tests
- [ ] Webhook tests
- [ ] Security validation
- [ ] Code audit
- [ ] Beta testing with 10-20 users
- [ ] API documentation
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] FAQ page

### Phase 5: Marketing and Growth (ongoing)

- [ ] Landing page
- [ ] Demo video
- [ ] Screenshots for Chrome Web Store
- [ ] Social media strategy
- [ ] Email marketing
- [ ] Referral program (optional)
- [ ] Fishing blog posts
- [ ] Partnership with fishing communities

---

## 🛡️ Security and Compliance

### Security Measures

- ✅ **HTTPS mandatory** in production
- ✅ **JWT with expiration** (7 days, refresh tokens)
- ✅ **Hashed passwords** with bcrypt (10 rounds)
- ✅ **Rate limiting** on sensitive endpoints
- ✅ **Input validation** on all routes
- ✅ **CORS** properly configured
- ✅ **Secrets in environment variables**
- ✅ **Signed Stripe webhooks** (webhook secret)

### GDPR Compliance

- [ ] Explicit consent for cookies
- [ ] Clear privacy policy
- [ ] Right to be forgotten (delete account)
- [ ] User data export
- [ ] Marketing email opt-in
- [ ] Secure personal data storage

### PCI-DSS Payments

- ✅ **Stripe** handles card data (PCI compliant)
- ✅ No card numbers stored
- ✅ Only customer ID and subscription ID

---

## 📊 Metrics and KPIs

### Key Metrics to Monitor

1. **Acquisition**:
   - Extension installs (total)
   - New registrations (free)
   - Conversion rate (install → register)

2. **Conversion**:
   - Free → Premium (conversion rate)
   - Trial → Paid (if trial implemented)
   - Average time to conversion

3. **Retention**:
   - Monthly churn rate
   - Lifetime Value (LTV)
   - Annual renewal rate

4. **Revenue**:
   - MRR (Monthly Recurring Revenue)
   - ARR (Annual Recurring Revenue)
   - ARPU (Average Revenue Per User)

5. **Engagement**:
   - DAU/MAU (Daily/Monthly Active Users)
   - Most used features
   - Average time in extension

### First Year Objectives

| Metric | Q1 | Q2 | Q3 | Q4 |
|--------|----|----|----|----|
| Total Users | 100 | 500 | 1,500 | 3,000 |
| Premium Users | 5 | 50 | 150 | 300 |
| Conversion Rate | 5% | 10% | 10% | 10% |
| MRR | €25 | €250 | €750 | €1,500 |
| Churn Rate | - | 10% | 8% | 5% |

---

## 💡 Conversion Strategies

### 1. Free Trial (Optional)

- **7 days of Premium free** for new users
- No credit card required
- Notification 2 days before trial ends
- Email with benefits before expiration

### 2. Smart Upselling

- **Contextual prompts**: "See 7-day forecast? Upgrade to Premium"
- **Feature teasing**: Show locked features with lock icon
- **High score**: "Perfect conditions! Auto notifications with Premium"
- **Visible limitations**: "2 of 3 free spots used"

### 3. Promotional Incentives

- **Early bird**: 20% discount for first 3 months (launch)
- **Black Friday**: 50% discount on annual plan
- **Referral**: 1 free month per subscribed friend
- **Annual vs Monthly**: Highlight 17% savings

### 4. Social Proof

- **Testimonials** from satisfied anglers
- **Ratings** on Chrome Web Store
- **Number of active users**
- **Success stories**: "User X caught Y fish"

---

## 🔄 Subscription Management

### Subscription Flow

```
1. User clicks "Upgrade to Premium"
2. Redirected to Stripe Checkout
3. Choose plan (monthly/annual)
4. Complete payment
5. Stripe webhook → Backend updates User.plano
6. User receives confirmation email
7. Extension updates UI automatically
```

### Cancellation

- **Self-service**: User can cancel anytime
- **Keep until end**: Access until end of billing cycle
- **Cancellation survey**: "Why are you canceling?"
- **Pause option**: 1 month pause (optional)

### Failed Payment Management

1. **Automatic retry**: Stripe retries 3-4x
2. **Alert email**: "Payment problem"
3. **Graceful downgrade**: 7-day grace period
4. **Easy reactivation**: Direct link to update card

---

## 🌍 Future Expansion

### New Markets

- Spain (Spanish translation)
- France (French translation)
- UK/Ireland (already in English)

### New Plans (Future)

**PREMIUM PLUS** (€9.99/month):
- Everything in Premium
- International spot access
- API access for developers
- Unlimited historical data
- Personalized email consultations

**TEAM/CLUB** (€29.99/month):
- 5-10 accounts
- Shared dashboard
- Group statistics
- Trip calendar

---

## 📝 Required Documentation

### For Users

- [ ] **FAQ**: Frequently asked questions about plans
- [ ] **Upgrade Guide**: How to upgrade
- [ ] **Plan Comparison**: Detailed table
- [ ] **Terms of Service**: Legally binding
- [ ] **Privacy Policy**: GDPR compliant
- [ ] **Refund Policy**: 14-day money-back

### For Developers

- [ ] **API Documentation**: Authenticated endpoints
- [ ] **Stripe Integration Guide**: Setup and webhooks
- [ ] **Database Schema**: Data models
- [ ] **Deployment Guide**: Deploy with Stripe
- [ ] **Testing Guide**: Payment testing

---

## 🎨 Marketing Materials

### Main Messaging

**Headline**: "Fish More, Worry Less"

**Subheadline**: "Perfect fishing conditions in your pocket. Real-time data, smart alerts, all spots in Portugal."

**Call-to-Action**: "Try Premium Free for 7 Days"

### Feature Highlights

1. 🎯 **Accuracy**: Advanced fishing score algorithm
2. 🌊 **Real Data**: Professional weather APIs
3. 📍 **30+ Spots**: All the best locations in Portugal
4. 🔔 **Alerts**: Notifications when conditions are ideal
5. 📊 **Analysis**: History and trends for better planning

---

## 💼 Financial Analysis

### Monthly Costs (Estimated)

| Item | Cost |
|------|------|
| Render (Backend) | €7/month |
| MongoDB Atlas | €9/month |
| Stripe Fees (2.9% + €0.25) | Variable |
| Domain | €1/month |
| Email Service (SendGrid) | €0-15/month |
| **TOTAL** | ~€20-30/month |

### Break-Even Point

- **Break-even**: 6-7 monthly premium subscribers
- **Profit**: From 8th subscriber onwards
- **Q1 Goal**: 5 subscribers (near break-even)
- **Q4 Goal**: 300 subscribers (€1,500 MRR - €30 costs = €1,470 profit)

### Annual Revenue Projection (Conservative)

- **Year 1**: €1,500 MRR × 12 = €18,000 ARR
- **Year 1 Costs**: ~€400
- **Year 1 Net Profit**: ~€17,600

---

## 🎯 Immediate Next Steps

### Maximum Priority (Sprint 1-2)

1. [ ] Set up Stripe account in test mode
2. [ ] Implement authentication routes
3. [ ] Create products in Stripe Dashboard
4. [ ] Implement plan verification middleware
5. [ ] Add login UI to extension
6. [ ] Test basic checkout flow

### Quick Wins

- Use Stripe Customer Portal for subscription management
- Implement only Monthly at first (simplify)
- Focus on 2-3 essential premium features first
- Use Stripe email templates

---

## 📞 Support

### Support Channels

- **Email**: support@fishingtides.pt (to be created)
- **FAQ**: In extension and website
- **Discord/Slack**: Community (future)

### SLA

- **Free**: 5-7 business days
- **Premium**: 24-48 hours
- **Critical**: 2-4 hours (payments)

---

## 🏁 Conclusion

This Freemium + Subscription monetization plan is:

- ✅ **Viable**: Infrastructure partially ready
- ✅ **Fair**: Free plan with real value
- ✅ **Scalable**: Prepared for growth
- ✅ **Sustainable**: Break-even with few users
- ✅ **Competitive**: Market-aligned pricing

**Total Implementation Estimate**: 8-12 weeks

**Expected ROI**: Positive from 3rd month

---

**Document created**: 2026-02-12  
**Version**: 1.0  
**Status**: ✅ Approved for implementation
