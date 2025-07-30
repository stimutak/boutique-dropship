# TODO List - Boutique E-Commerce

## 🎯 Today's Quick Wins (< 1 hour total)

### 🏃 Do These First:
- [x] 1. **Generate secure secrets** (5 min) - ✅ COMPLETED
- [x] 2. **Add database indexes** (10 min) - ✅ COMPLETED
- [x] 3. **Delete enhanced Redux slices** (20 min) - ✅ Already removed
- [x] 4. **Remove duplicate test files** (15 min) - ✅ Removed auth-fixed.test.js

### 🔧 Then These Immediate Actions:
- [x] 5. **Fix React version mismatch** (30 min) - ✅ Both on React v19
- [x] 6. **Configure Mollie API key** (30 min) - ✅ Setup guide created

## 📋 Next Phase (After Quick Wins)
- [ ] JWT migration to cookies (2-3 days)
- [ ] i18n framework setup (1-2 days)
- [ ] Multi-currency support (1 day)

## ✅ Completed
- [x] Cart persistence bug fixed (atomic updates, duplicate cleanup)

## 🚨 Critical Security Issues
- [ ] Move JWT from localStorage to httpOnly cookies (196 references)
- [ ] Replace weak JWT secret with cryptographically secure secret
- [ ] Fix React version mismatch (Backend: v19, Frontend: v18)

## 🌍 Internationalization
- [ ] Setup i18n framework (react-i18next)
- [ ] Add multi-currency support to models
- [ ] Currency converter service (OpenExchangeRates)
- [ ] Locale-aware formatting
- [ ] Language selector component
- [ ] RTL language support
- [ ] Translation management system
- [ ] Geo-location detection

## 📈 Performance
- [ ] Fix N+1 queries in order routes
- [ ] Redis caching layer
- [ ] Code splitting & lazy loading

## 🚀 Deployment
- [ ] Create Dockerfile and docker-compose
- [ ] Setup nginx configuration
- [ ] CI/CD pipeline setup

## 🛠️ Features
- [ ] Order fulfillment workflow
- [ ] Email notifications system
- [ ] Admin dashboard
- [ ] Cryptocurrency payments

## 🧹 Cleanup
- [ ] Standardize error handling
- [ ] Consolidate 27 scripts to 5
- [ ] Integration tests for user journeys