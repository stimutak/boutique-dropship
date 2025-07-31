# Admin Dashboard Documentation

## Overview

The Boutique e-commerce platform requires a unified Admin Dashboard that combines all administrative functions into a single, cohesive interface. This document outlines the complete admin system architecture.

## Current Status

### ✅ What Exists
- **Backend Admin API**: Complete backend routes in `/routes/admin.js`
  - Product management (CRUD, bulk import/export)
  - Order management (view, filter, status updates)
  - User management (view, status updates)
  - Analytics endpoints
- **Authentication**: `requireAdmin` middleware ready
- **Email Service**: 87% complete, missing admin-triggered emails

### ❌ What's Missing
- **Frontend Admin Dashboard**: No admin UI exists
- **Order Fulfillment UI**: Needs to be part of unified dashboard
- **Email Template i18n**: Currently hardcoded in English

## Unified Admin Architecture

### Single Admin Interface Structure
```
/admin (protected route)
├── /dashboard        → Analytics overview
├── /products         → Product management
├── /orders          → Order management & fulfillment
├── /users           → User management
├── /settings        → Store settings & configuration
└── /email-templates → Email template management
```

### NO Separate Interfaces
- ❌ NO separate "Order Fulfillment Dashboard"
- ❌ NO separate "Email Management Panel"
- ✅ ONE unified admin interface at `/admin`

## How to Access Admin Dashboard

### 1. Backend Access (Already Working)
```bash
# Admin user credentials (from test data)
Email: john@example.com
Password: Password123!

# API endpoints require admin JWT token
GET /api/admin/* - All admin endpoints
```

### 2. Frontend Access (To Be Implemented)
```bash
# Admin dashboard URL
http://localhost:3001/admin

# Protected by:
- requireAuth (user must be logged in)
- requireAdmin (user.isAdmin must be true)
- Redirect non-admins to home page
```

## Implementation Plan

### Phase 1: Core Admin UI (Priority: HIGH)
Create the base admin dashboard structure:

```jsx
// client/src/pages/admin/AdminDashboard.jsx
- Main admin layout with navigation
- Analytics overview page
- Route protection with admin check

// client/src/pages/admin/AdminProducts.jsx
- Product list with filters
- Product create/edit forms
- Bulk import/export UI

// client/src/pages/admin/AdminOrders.jsx
- Order list with status filters
- Order detail view
- Status update workflow
- Tracking information management
- Shipping label generation

// client/src/pages/admin/AdminUsers.jsx
- User list with role filters
- User status management
- Password reset functionality
```

### Phase 2: Redux Integration
```javascript
// client/src/store/slices/adminSlice.js
- Unified admin state management
- Sub-slices for products, orders, users
- Analytics data management
```

### Phase 3: Advanced Features
- Email template editor with i18n
- Store settings management
- Advanced analytics dashboards

## API Integration

### Existing Admin Endpoints
```javascript
// Product Management
GET    /api/admin/products
POST   /api/admin/products
POST   /api/admin/products/bulk-import
GET    /api/admin/products/export

// Order Management  
GET    /api/admin/orders
GET    /api/admin/orders/:id
PUT    /api/admin/orders/:id/status

// User Management
GET    /api/admin/users
PUT    /api/admin/users/:id/status

// Analytics
GET    /api/admin/analytics/dashboard
```

### New Endpoints Needed
```javascript
// Order Fulfillment
PUT    /api/admin/orders/:id/tracking
POST   /api/admin/orders/:id/shipping-label
GET    /api/admin/orders/:id/invoice

// Email Management
GET    /api/admin/email-templates
PUT    /api/admin/email-templates/:type
POST   /api/admin/email/test
```

## Testing Admin Features

### 1. Backend Testing
```bash
# Run existing admin route tests
npm test test/routes/admin.test.js

# Test admin authentication
curl -X GET http://localhost:5001/api/admin/products \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

### 2. Frontend Testing (Once Implemented)
```bash
# Component tests
npm test client/src/__tests__/admin/

# E2E admin flow tests
npm run test:e2e:admin
```

### 3. Manual Testing Checklist
- [ ] Admin login redirects to dashboard
- [ ] Non-admin users see "Access Denied"
- [ ] All CRUD operations work
- [ ] Filters and pagination function
- [ ] Bulk operations handle errors gracefully
- [ ] International data displays correctly
- [ ] RTL languages render properly

## Security Considerations

1. **Authentication**: All admin routes protected by `requireAdmin` middleware
2. **Authorization**: Role-based access control (RBAC)
3. **Audit Logging**: Track all admin actions
4. **Session Management**: Admin sessions expire after inactivity
5. **CSRF Protection**: Already implemented

## Internationalization Requirements

Following CLAUDE.md requirements:
- All UI text uses i18n keys
- Support for 10+ languages including RTL
- Currency display with proper formatting
- Date/time formatting per locale
- Email templates in multiple languages

## Development Workflow

### Setting Up Admin Development
```bash
# 1. Start development environment
./docker-helper.sh dev

# 2. Create admin user (if needed)
docker-compose exec backend node scripts/createAdminUser.js

# 3. Access admin API
http://localhost:5001/api/admin/

# 4. Access admin UI (once built)
http://localhost:3001/admin
```

### Adding New Admin Features
1. Add backend route in `/routes/admin.js`
2. Create frontend component in `/client/src/pages/admin/`
3. Add Redux slice if needed
4. Write tests for both backend and frontend
5. Update this documentation

## Common Issues & Solutions

### Issue: Admin routes return 403 Forbidden
**Solution**: Ensure user has `isAdmin: true` in database

### Issue: Admin dashboard not loading
**Solution**: Check Redux auth state has admin user

### Issue: Bulk operations timeout
**Solution**: Implement pagination for large datasets

## Next Steps

1. **Immediate Priority**: Build core admin UI components
2. **Order Fulfillment**: Integrate into main admin dashboard
3. **Email Templates**: Add i18n support
4. **Testing**: Comprehensive test suite for admin features

## References

- Backend admin routes: `/routes/admin.js`
- Admin middleware: `/middleware/auth.js` (requireAdmin)
- Authentication: JWT in httpOnly cookies
- Test users: john@example.com (admin), jane@example.com (regular)