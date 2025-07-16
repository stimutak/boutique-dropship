# Administrative Management Interface

This document describes the administrative management interface for the holistic dropship store.

## Overview

The admin interface provides comprehensive management capabilities for administrators to manage products, orders, users, and view analytics. All admin routes require authentication with admin privileges.

## Authentication

All admin routes are protected by the `requireAdmin` middleware which:
1. Validates JWT token
2. Checks if user exists and is active
3. Verifies user has admin role (`isAdmin: true`)

### Access Control

- **Base Path**: `/api/admin/*`
- **Authentication**: Bearer token required
- **Authorization**: Admin role required
- **Error Responses**:
  - `401 NO_TOKEN` - No authorization token provided
  - `401 INVALID_TOKEN` - Invalid or expired token
  - `403 INSUFFICIENT_PERMISSIONS` - User is not an admin

## Product Management

### GET /api/admin/products
Get all products with full admin data including wholesaler information.

**Query Parameters:**
- `page` (default: 1) - Page number for pagination
- `limit` (default: 20) - Items per page
- `search` - Search in name, description, tags, wholesaler name
- `category` - Filter by product category
- `status` - Filter by status: 'all', 'active', 'inactive'
- `sort` - Sort order: 'newest', 'oldest', 'name', 'price-low', 'price-high'

**Response:**
```json
{
  "success": true,
  "products": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalProducts": 100,
    "limit": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "filters": {...}
}
```

### POST /api/admin/products/bulk-import
Import products from CSV file.

**Request:** Multipart form with `csvFile` field

**CSV Format:**
```csv
name,price,category,wholesaler_name,wholesaler_email,wholesaler_product_code,description,short_description,tags,chakra,element,zodiac,healing,origin,size,weight,seo_title,seo_description,seo_keywords,images,is_active,is_featured
```

**Response:**
```json
{
  "success": true,
  "message": "Bulk import completed. 95/100 products imported successfully.",
  "summary": {
    "totalRows": 100,
    "successCount": 95,
    "errorCount": 5
  },
  "results": [...],
  "errors": [...]
}
```

### GET /api/admin/products/export
Export products to CSV file.

**Query Parameters:**
- `category` - Filter by category
- `status` - Filter by status: 'all', 'active', 'inactive'

**Response:** CSV file download

## Order Management

### GET /api/admin/orders
Get all orders with full admin data.

**Query Parameters:**
- `page`, `limit` - Pagination
- `status` - Order status filter
- `paymentStatus` - Payment status filter
- `search` - Search in order number, customer info
- `dateFrom`, `dateTo` - Date range filter
- `sort` - Sort order

**Response:**
```json
{
  "success": true,
  "orders": [...],
  "pagination": {...},
  "filters": {...}
}
```

### GET /api/admin/orders/:id
Get single order with full admin data including wholesaler information.

### PUT /api/admin/orders/:id/status
Update order status.

**Request Body:**
```json
{
  "status": "shipped",
  "notes": "Order shipped via FedEx"
}
```

**Valid Statuses:** pending, processing, shipped, delivered, cancelled

## Analytics

### GET /api/admin/analytics/dashboard
Get dashboard analytics with key metrics.

**Query Parameters:**
- `period` - Time period: '7d', '30d', '90d', '1y'

**Response:**
```json
{
  "success": true,
  "analytics": {
    "period": "30d",
    "dateRange": {
      "from": "2024-01-01T00:00:00.000Z",
      "to": "2024-01-31T23:59:59.999Z"
    },
    "metrics": {
      "sales": {
        "totalRevenue": 15420.50,
        "totalOrders": 156,
        "avgOrderValue": 98.85,
        "totalItems": 312
      },
      "products": {
        "totalProducts": 450,
        "activeProducts": 420,
        "featuredProducts": 25
      },
      "users": {
        "totalUsers": 1250,
        "activeUsers": 1180,
        "adminUsers": 3,
        "recentUsers": 45
      }
    }
  }
}
```

## User Management

### GET /api/admin/users
Get all users with filtering and search.

**Query Parameters:**
- `page`, `limit` - Pagination
- `search` - Search in email, first name, last name
- `status` - Filter by status: 'all', 'active', 'inactive'
- `role` - Filter by role: 'all', 'admin', 'customer'
- `sort` - Sort order: 'newest', 'oldest', 'name', 'email', 'last-login'

### PUT /api/admin/users/:id/status
Update user status and role.

**Request Body:**
```json
{
  "isActive": true,
  "isAdmin": false
}
```

## Wholesaler Communication Management

### GET /api/admin/wholesalers/logs
Get wholesaler communication logs (planned feature).

### POST /api/admin/wholesalers/retry/:orderId
Retry wholesaler notifications for specific order (planned feature).

### GET /api/admin/wholesalers/summary
Get wholesaler communication summary statistics (planned feature).

## Error Handling

All admin endpoints follow consistent error response format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": [...] // Optional validation details
  }
}
```

## Security Considerations

1. **Authentication Required**: All endpoints require valid JWT token
2. **Admin Authorization**: All endpoints require admin role
3. **Input Validation**: All inputs are validated using express-validator
4. **File Upload Security**: CSV uploads are restricted by file type and size
5. **Rate Limiting**: Global rate limiting applies to all admin endpoints
6. **Data Sanitization**: All user inputs are sanitized
7. **Sensitive Data Protection**: Passwords are never returned in responses

## Usage Examples

### Creating an Admin User
```javascript
const adminUser = await User.create({
  email: 'admin@example.com',
  password: 'securepassword',
  firstName: 'Admin',
  lastName: 'User',
  isAdmin: true
});
```

### Making Admin API Calls
```javascript
const response = await fetch('/api/admin/products', {
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  }
});
```

### Bulk Product Import
```javascript
const formData = new FormData();
formData.append('csvFile', csvFile);

const response = await fetch('/api/admin/products/bulk-import', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`
  },
  body: formData
});
```

## Testing

The admin interface includes comprehensive tests covering:
- Authentication and authorization
- Product management operations
- Order management
- User management
- Analytics endpoints
- Error handling
- Input validation
- File upload functionality

Run admin tests with:
```bash
npm test -- --testPathPattern=admin
```