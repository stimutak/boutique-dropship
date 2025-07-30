# AGENTS.md - AI Agent Guidelines for Boutique Holistic Store

This file provides guidance for AI agents (Claude Code, GitHub Copilot, Cursor, etc.) working with this repository. These guidelines complement CLAUDE.md with agent-specific best practices.

## 🤖 Agent Configuration

### Recommended Agent Types for This Project

1. **code-review-architect**: Use after implementing features, fixing bugs, or refactoring
2. **sprint-architect-planner**: Use for planning new features or organizing work
3. **bug-detective-tdd**: Use for investigating and fixing bugs with proper test coverage
4. **system-architect-tdd**: Use for designing system architectures with testability (Docker, nginx, etc.)
5. **tdd-advocate**: Use when implementing new features with Test-Driven Development
6. **general-purpose**: Use for multi-step tasks like RTL support, UI enhancements

### When to Use Agents

#### Use code-review-architect when:
- You've completed implementing a new feature
- You've refactored existing code
- You've fixed a bug
- You need architectural feedback
- Before committing significant changes

#### Use sprint-architect-planner when:
- Planning implementation of new features
- Breaking down complex requirements
- Organizing backlog items
- Creating technical implementation plans
- Estimating development effort

#### Use bug-detective-tdd when:
- Users report bugs or issues
- Features behave unexpectedly
- You need to debug with proper test coverage
- Ensuring bugs stay fixed with regression tests

#### Use tdd-advocate when:
- Starting new feature development
- Adding tests to existing code
- Learning TDD best practices
- Ensuring proper test coverage

## 📋 Agent Task Templates

### Feature Implementation Template
```
/sprint-architect-planner "Plan implementation of [FEATURE NAME] for international e-commerce platform supporting multiple languages and currencies. Consider existing patterns in /routes, /models, and /client/src. Must follow CLAUDE.md guidelines."
```

### Code Review Template
```
/code-review-architect "Review the [FEATURE/FIX] implementation in [FILES]. Check for security, performance, internationalization support, and adherence to CLAUDE.md guidelines. This is a MERN stack e-commerce platform."
```

### Bug Investigation Template
```
/bug-detective-tdd "Investigate [BUG DESCRIPTION]. The system uses MongoDB, Express, React 19, Node.js. Check for related issues in cart persistence, authentication (JWT in httpOnly cookies), or internationalization. Write tests to reproduce before fixing."
```

## 🚨 Critical Context for Agents

### Project Architecture
- **Stack**: MongoDB, Express, React 19, Node.js (MERN)
- **Development**: Docker environment with hot reload
- **Auth**: JWT in httpOnly cookies (✅ migrated from localStorage)
- **State**: Redux Toolkit with existing slices (enhanced versions removed)
- **i18n**: react-i18next with 7 languages + RTL support (Arabic, Hebrew)
- **Payments**: Mollie with multi-currency support
- **Deployment**: Docker + nginx, production-ready

### Known Issues & Solutions
1. **Cart Persistence**: Already fixed with atomic updates
2. **Cart Merging**: Guest items are ADDED to user's existing cart on login
3. **N+1 Queries**: Already fixed with batch fetching
4. **Duplicate Code**: Don't create "enhanced" versions - fix existing code
5. **React Version**: Both frontend and backend use React 19

### Current Implementation Status (~87% Complete)
- ✅ Secure authentication (httpOnly cookies)
- ✅ Cart persistence and merging
- ✅ Internationalization (7 languages, RTL support)
- ✅ Multi-currency support (20+ currencies)
- ✅ Database indexes and performance optimization
- ✅ Docker deployment infrastructure
- ✅ nginx reverse proxy configuration
- ⏳ Error handling standardization (next priority)
- ⏳ Order fulfillment workflow
- ⏳ Email notifications system
- ⏳ Admin dashboard

## 🛠️ Agent-Specific Guidelines

### 1. Always Check First
Before implementing anything:
- Search for existing implementations
- Read CLAUDE.md constraints
- Check if enhanced versions already exist (and were removed)
- Verify current patterns in similar files

### 2. Follow Existing Patterns
- Routes: Thin controllers in `/routes`
- Models: Mongoose schemas only in `/models`
- Frontend: Existing Redux slices in `/client/src/store/slices`
- Components: Reusable UI in `/client/src/components`

### 3. International Requirements
This is an international platform. Always consider:
- Multiple languages (7 configured)
- Multiple currencies (Mollie supports many)
- RTL support for Arabic
- Locale-aware formatting
- Timezone handling

### 4. Security First
- JWT tokens in httpOnly cookies only
- CSRF protection already implemented
- Input validation on all routes
- No sensitive data in frontend code

### 5. Performance Considerations
- Batch database queries (no N+1)
- Use existing indexes
- Implement lazy loading for routes
- Consider caching for static data

## 📁 File Structure Quick Reference

```
/
├── server.js              # Main server (PORT 5001)
├── routes/                # Express routes (thin controllers)
│   ├── auth.js           # Auth endpoints with cookie handling
│   ├── cart.js           # Cart with merge logic
│   ├── orders.js         # Orders with batch fetching
│   └── products.js       # Product endpoints
├── models/               # Mongoose models only
├── middleware/           # Auth, CSRF, error handling
└── client/
    ├── src/
    │   ├── i18n/         # Internationalization config
    │   ├── store/        # Redux store (use existing slices)
    │   ├── components/   # Reusable UI components
    │   └── pages/        # Route-level components
    └── package.json      # React 19, redux, i18next

```

## 🚫 What NOT to Do

1. **Don't create enhanced versions** - We already removed enhancedAuthSlice.js and enhancedCartSlice.js
2. **Don't add complexity** - No event emitters, observables, or over-engineering
3. **Don't create duplicate files** - No -fixed, -new, or -enhanced suffixes
4. **Don't ignore existing patterns** - Follow what's already there
5. **Don't store JWT in localStorage** - Already migrated to httpOnly cookies

## ✅ What TO Do

1. **Fix in place** - Update existing files rather than creating new ones
2. **Keep it simple** - This is an e-commerce site, not a spaceship
3. **Think internationally** - Every feature should support multiple languages/currencies
4. **Test thoroughly** - Use existing test patterns
5. **Document sparingly** - Code should be self-documenting

## 🎯 Agent Success Metrics

Your agent task is successful when:
- [ ] No new duplicate files created
- [ ] Existing patterns followed
- [ ] International support considered
- [ ] Security best practices maintained
- [ ] Performance optimizations included
- [ ] Tests pass without modification
- [ ] Code follows CLAUDE.md guidelines

## 📝 Example Agent Interactions

### Good Agent Usage
```
User: "Add a wishlist feature"
You: /sprint-architect-planner "Plan wishlist feature for international e-commerce platform. Must support multi-user wishlists, work with existing auth (JWT in cookies), integrate with current cart system, and support all 7 configured languages. Follow patterns in existing routes and models."
```

### Bad Agent Usage
```
User: "Add a wishlist feature"
You: /general-purpose "Create a wishlist feature" ❌ (Too vague, wrong agent type)
```

## 🔄 Continuous Improvement

When agents complete tasks:
1. Review their output against CLAUDE.md
2. Check for duplicate code or files
3. Ensure international support
4. Verify security compliance
5. Test the implementation
6. Update this file with new patterns discovered

Remember: The best code is often the code you don't write. Always consider if existing code can be fixed or reused before creating something new.