# Quick Start Guide - Boutique E-Commerce

## 🚀 Immediate Actions (Do These First!)

### 1. Generate Secure Secrets (5 minutes)
```bash
# Generate new JWT secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Generate new session secret  
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"

# Update your .env file with these values
```

### 2. Fix React Version Mismatch (30 minutes)
```bash
# Option A: Upgrade frontend to React 19
cd client
npm install react@^19.0.0 react-dom@^19.0.0
npm test  # Verify nothing breaks

# Option B: Downgrade backend to React 18
cd ..
npm install react@^18.2.0 react-dom@^18.2.0
```

### 3. Add Missing Database Indexes (10 minutes)
```javascript
// Run in MongoDB shell or create a script
db.orders.createIndex({ status: 1, createdAt: -1 })
db.orders.createIndex({ customer: 1, createdAt: -1 })
db.products.createIndex({ wholesaler: 1, isActive: 1 })
db.products.createIndex({ price: 1, isActive: 1 })
```

### 4. Clean Up Dead Code (20 minutes)
```bash
# Delete enhanced Redux slices (1,200+ lines of unused code)
rm client/src/store/slices/enhancedAuthSlice.js
rm client/src/store/slices/enhancedCartSlice.js

# Remove duplicate test files
rm test/routes/auth-fixed.test.js  # Keep auth.test.js
# Check for other *-fixed.test.js files and remove them
```

### 5. Configure Mollie for Production (1 hour)
```javascript
// Update .env with real Mollie API key
MOLLIE_API_KEY=live_xxxxxxxxxxxxx  // Get from Mollie dashboard

// Enable multi-currency in Mollie dashboard:
// 1. Log into Mollie
// 2. Settings → Payment methods
// 3. Enable currencies: EUR, USD, GBP, CAD, etc.
// 4. Configure settlement currency
```

## 🤖 Working with AI Agents

### ALWAYS Start Prompts With:
```
"Following CLAUDE.md constraints, implement [feature] for our international e-commerce platform..."
```

### Key Constraints to Mention:
1. **"DO NOT create enhanced versions or duplicate files"**
2. **"This is an international platform - include i18n support"**
3. **"Modify existing files, don't create new ones"**
4. **"Keep it simple - no event emitters or complex abstractions"**
5. **"Cart persistence is already fixed - don't change it"**

### Example Good Prompts:
```
✅ "Following CLAUDE.md, add multi-language support to the checkout page using i18n keys"
✅ "Update the existing auth routes to use httpOnly cookies instead of localStorage"
✅ "Add currency conversion to product prices, storing amounts with currency codes"
```

### Example Bad Prompts:
```
❌ "Create an enhanced authentication system"
❌ "Build a new cart service with better architecture"
❌ "Implement a sophisticated caching layer"
```

## 📋 Development Checklist

Before starting any task:
- [ ] Read CLAUDE.md completely
- [ ] Check if similar code already exists
- [ ] Consider internationalization requirements
- [ ] Plan for multiple currencies
- [ ] Use existing patterns and middleware

Before committing code:
- [ ] No new "enhanced" files created
- [ ] No duplicate test files
- [ ] i18n keys used (no hardcoded strings)
- [ ] Currency codes included with amounts
- [ ] Follows existing patterns

## 🔥 Current Priorities

1. **Security**: Move JWT from localStorage to httpOnly cookies
2. **Stability**: Fix React version mismatch
3. **Performance**: Add database indexes
4. **Cleanup**: Remove dead code
5. **International**: Setup i18n framework

## 📚 Key Files to Reference

- `CLAUDE.md` - Project constraints and rules
- `PRODUCTION_ROADMAP.md` - Detailed timeline and phases
- `.plan` - Daily priorities and progress
- `INTERNATIONALIZATION.md` - i18n implementation guide

## 🚨 DO NOT TOUCH

These are already working correctly:
- Cart persistence logic (recently fixed)
- Guest checkout flow
- CSRF protection
- Basic authentication (needs security upgrade only)

## 💡 Quick Wins

Tasks you can complete in under 30 minutes:
1. Generate secure secrets
2. Delete enhanced Redux slices
3. Add database indexes
4. Remove duplicate test files
5. Update Mollie API key

---

**Remember**: This is an international e-commerce platform. Every feature must support multiple languages and currencies!