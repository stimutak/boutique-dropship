# CLAUDE.md

This file provides critical guidance to Claude Code (claude.ai/code) when working with this repository. READ THIS ENTIRE FILE BEFORE MAKING ANY CHANGES.

## ⚠️ CRITICAL: STOP AND THINK BEFORE CODING

### Before You Write ANY Code:
1. **CHECK IF IT ALREADY EXISTS** - This codebase has significant duplication. Search thoroughly.
2. **DON'T CREATE "ENHANCED" VERSIONS** - We already have unused enhancedAuthSlice.js and enhancedCartSlice.js
3. **DON'T ADD UNNECESSARY COMPLEXITY** - No event emitters, connection pools, or performance monitoring unless explicitly requested
4. **USE EXISTING PATTERNS** - Follow the patterns already established in the codebase

## 🚨 Known Issues and What NOT to Do

### 1. **Duplicate Code Already Exists - DO NOT CREATE MORE**
- **Enhanced Redux Slices**: `/client/src/store/slices/enhancedAuthSlice.js` and `enhancedCartSlice.js` are UNUSED dead code (1,200+ lines)
- **Old Route Files**: `cart-old.js` exists - don't create new versions, fix the existing one
- **Duplicate Test Files**: `auth.test.js` vs `auth-fixed.test.js` - update the original, don't create new ones
- **Multiple Scripts**: 12+ scripts doing similar things in `/scripts/` - use existing ones

### 2. **Architecture Rules - FOLLOW THESE**
- **NO NEW ABSTRACTION LAYERS**: Don't create service layers that wrap existing functionality
- **NO EVENT EMITTERS**: The cartService.js already has unnecessary EventEmitter complexity
- **USE EXISTING MIDDLEWARE**: Don't create new auth middleware - `authenticateToken`, `requireAuth`, and `requireAdmin` already exist
- **KEEP IT SIMPLE**: This is a standard e-commerce app, not a distributed system

### 3. **Security Issues - FIX, DON'T WORKAROUND**
- **JWT Storage**: Currently in localStorage (BAD) - should be httpOnly cookies
- **196 localStorage references**: Need systematic fix, not band-aids
- **CSRF Protection**: Already implemented in `sessionCSRF.js` - use it, don't recreate

### 4. **Performance Problems - Address Root Causes**
- **N+1 Queries**: In `/routes/orders.js` - use batch queries, not individual loops
- **Missing Indexes**: Add to models, don't work around with complex caching
- **No Code Splitting**: Frontend loads everything at once - implement lazy loading

## 📁 Project Structure - WHERE THINGS BELONG

### Backend Structure:
```
├── server.js              # Main server (PORT from .env, not hardcoded)
├── models/                # Mongoose models ONLY
├── routes/                # Express routes - thin controllers only
├── middleware/            # Reusable middleware
├── utils/                 # Pure utility functions
└── scripts/               # One-off scripts (CHECK BEFORE CREATING NEW ONES)
```

### Frontend Structure:
```
client/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/          # Route-level components
│   ├── store/          # Redux store (USE EXISTING SLICES)
│   └── api/            # API configuration
```

### What NOT to Create:
- ❌ `/services/` directory - routes handle business logic
- ❌ Enhanced versions of existing files
- ❌ New test files with "-fixed" or "-new" suffixes
- ❌ Debug components in production directories

## 🔧 Development Commands

### Backend Development
```bash
npm run dev        # Start with nodemon on port 5001
npm start         # Production server
npm test          # Run tests
```

### Frontend Development (in /client)
```bash
npm run dev       # Vite dev server on port 3001  
npm run build     # Production build
npm test          # Run Vitest tests
```

### Database
- MongoDB: `mongodb://localhost:27017/holistic-store`
- Populate: `node populate-simple.js`
- Test users: john@example.com / Password123! (admin), jane@example.com / Password123!

## 🐛 Current Bugs to Be Aware Of

1. **Port Configuration**: Server defaults to 5000 if env not loaded properly (should be 5001)
2. **Cart Logic**: Complex session handling - guest carts use sessionId headers
3. **React Version Mismatch**: Backend has React 19, frontend has React 18
4. **Unused Dependencies**: webpack, nyc, multiple eslint configs with no .eslintrc

## ✅ Best Practices for This Codebase

### When Asked to Fix Something:
1. **Search First**: Use Grep/Glob to find existing implementations
2. **Read the File**: Understand current implementation before changing
3. **Update in Place**: Modify existing files rather than creating new ones
4. **Test Existing Tests**: Run tests before and after changes
5. **Check for Side Effects**: This codebase has many interdependencies

### When Asked to Add Features:
1. **Check Scripts Directory**: Feature might already exist as a script
2. **Use Existing Patterns**: Follow patterns in similar routes/components
3. **Minimal Dependencies**: Don't add new packages unless absolutely necessary
4. **Simple Solutions**: Avoid over-engineering (no event emitters, observables, etc.)

### Common Pitfalls to Avoid:
- Creating "enhanced" or "improved" versions of existing code
- Adding abstraction layers that don't add value
- Implementing complex patterns for simple problems
- Creating duplicate test files instead of fixing existing ones
- Adding performance monitoring for operations that take milliseconds

## 🚀 Optimization Opportunities (If Asked)

### High Priority:
1. Fix N+1 queries in order creation (batch product lookups)
2. Add database indexes (User: email, Order: customer+createdAt, Product: price+isActive)
3. Implement code splitting (lazy load routes)
4. Fix memory leaks (event listeners not cleaned up)

### Medium Priority:
1. Consolidate duplicate auth middleware functions
2. Create centralized error handling
3. Move JWT to httpOnly cookies
4. Add response caching

### Low Priority:
1. Remove unused dependencies
2. Consolidate test files
3. Clean up scripts directory
4. Remove dead code (enhanced slices)

## 📝 Environment Configuration

Required `.env` variables:
```
NODE_ENV=development
PORT=5001                    # Backend port
MONGODB_URI=mongodb://localhost:27017/holistic-store
JWT_SECRET=[32+ characters]  # Must be at least 32 chars
SESSION_SECRET=[long string]
MOLLIE_API_KEY=[your key]
FRONTEND_URL=http://localhost:3001
```

## 🎯 Summary: Think Before You Code

1. **This codebase already has too much code** - Don't add more without good reason
2. **Duplication is the enemy** - Always search for existing implementations
3. **Simple is better** - This is an e-commerce site, not a spaceship
4. **Fix in place** - Update existing code rather than creating new versions
5. **Test thoroughly** - Many interdependencies exist

Remember: The best code is often the code you don't write. Always consider if the existing code can be fixed or reused before creating something new.