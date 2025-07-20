# Holistic Dropship Store API Documentation

## Overview

The Holistic Dropship Store API provides a complete e-commerce solution for holistic products including crystals, herbs, essential oils, and supplements. The API supports both registered users and guest checkout, integrates with Mollie for payments, and includes automated wholesaler communication for dropshipping.

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {} // Optional additional context
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `INVALID_CREDENTIALS` | Login credentials are incorrect |
| `UNAUTHORIZED` | Authentication required |
| `INSUFFICIENT_PERMISSIONS` | Admin access required |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist |
| `PAYMENT_FAILED` | Payment processing failed |
| `WHOLESALER_ERROR` | Wholesaler communication failed |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

## Rate Limiting

- **General endpoints**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 5 requests per 15 minutes per IP
- **Payment endpoints**: 10 requests per 15 minutes per IP

## Endpoints

### Authentication (`/api/auth`)

#### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isAdmin": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt_token_here"
  }
}
```

#### Login User
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isAdmin": false
    },
    "token": "jwt_token_here"
  }
}
```

#### Get User Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "addresses": [
        {
          "type": "shipping",
          "firstName": "John",
          "lastName": "Doe",
          "street": "123 Main St",
          "city": "Anytown",
          "state": "CA",
          "zipCode": "12345",
          "country": "US",
          "isDefault": true
        }
      ],
      "preferences": {
        "newsletter": true,
        "orderUpdates": true
      }
    }
  }
}
```

#### Update User Profile
```http
PUT /api/auth/profile
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "addresses": [
    {
      "type": "shipping",
      "firstName": "John",
      "lastName": "Smith",
      "street": "456 New St",
      "city": "New City",
      "state": "NY",
      "zipCode": "54321",
      "country": "US",
      "isDefault": true
    }
  ]
}
```

#### Logout User
```http
POST /api/auth/logout
Authorization: Bearer <token>
```

### Products (`/api/products`)

#### Get All Products
```http
GET /api/products
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `category` (string): Filter by category (crystals, herbs, oils, supplements)
- `chakra` (string): Filter by chakra association
- `element` (string): Filter by element (earth, water, fire, air)
- `zodiac` (string): Filter by zodiac sign
- `priceMin` (number): Minimum price filter
- `priceMax` (number): Maximum price filter
- `sort` (string): Sort by (name, price, createdAt)
- `order` (string): Sort order (asc, desc)

**Example:**
```http
GET /api/products?category=crystals&chakra=heart&sort=price&order=asc&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "product_id",
        "name": "Amethyst Crystal",
        "slug": "amethyst-crystal",
        "description": "Beautiful purple amethyst for spiritual healing",
        "shortDescription": "Purple amethyst crystal",
        "price": 24.99,
        "compareAtPrice": 29.99,
        "category": "crystals",
        "images": [
          {
            "url": "/images/products/amethyst.jpg",
            "alt": "Amethyst Crystal",
            "isPrimary": true
          }
        ],
        "properties": {
          "chakra": ["crown", "third-eye"],
          "element": "air",
          "zodiac": ["pisces", "aquarius"],
          "healing": ["stress-relief", "intuition"],
          "origin": "Brazil",
          "size": "2-3 inches",
          "weight": "50-75g"
        },
        "tags": ["healing", "meditation", "purple"],
        "inStock": true,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 50,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Get Single Product
```http
GET /api/products/:slug
```

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "_id": "product_id",
      "name": "Amethyst Crystal",
      "slug": "amethyst-crystal",
      "description": "Beautiful purple amethyst for spiritual healing and meditation. This high-quality crystal promotes clarity, intuition, and spiritual growth.",
      "shortDescription": "Purple amethyst crystal",
      "price": 24.99,
      "compareAtPrice": 29.99,
      "category": "crystals",
      "images": [
        {
          "url": "/images/products/amethyst.jpg",
          "alt": "Amethyst Crystal",
          "isPrimary": true
        }
      ],
      "properties": {
        "chakra": ["crown", "third-eye"],
        "element": "air",
        "zodiac": ["pisces", "aquarius"],
        "healing": ["stress-relief", "intuition", "spiritual-growth"],
        "origin": "Brazil",
        "size": "2-3 inches",
        "weight": "50-75g"
      },
      "tags": ["healing", "meditation", "purple", "spiritual"],
      "seo": {
        "title": "Amethyst Crystal - Spiritual Healing Stone",
        "description": "Premium amethyst crystal for meditation and spiritual growth",
        "keywords": ["amethyst", "crystal", "healing", "meditation"]
      }
    }
  }
}
```

#### Search Products
```http
GET /api/products/search
```

**Query Parameters:**
- `q` (string): Search query
- `category` (string): Filter by category
- `page` (number): Page number
- `limit` (number): Items per page

**Example:**
```http
GET /api/products/search?q=healing crystal&category=crystals
```

### Shopping Cart (`/api/cart`)

#### Get Cart
```http
GET /api/cart
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cart": {
      "items": [
        {
          "product": {
            "_id": "product_id",
            "name": "Amethyst Crystal",
            "slug": "amethyst-crystal",
            "price": 24.99,
            "images": [
              {
                "url": "/images/products/amethyst.jpg",
                "alt": "Amethyst Crystal",
                "isPrimary": true
              }
            ]
          },
          "quantity": 2,
          "subtotal": 49.98
        }
      ],
      "itemCount": 2,
      "subtotal": 49.98,
      "tax": 4.50,
      "total": 54.48
    }
  }
}
```

#### Add Item to Cart
```http
POST /api/cart/add
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "productId": "product_id",
  "quantity": 2
}
```

#### Update Cart Item
```http
PUT /api/cart/update
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "productId": "product_id",
  "quantity": 3
}
```

#### Remove Item from Cart
```http
DELETE /api/cart/remove
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "productId": "product_id"
}
```

#### Clear Cart
```http
DELETE /api/cart/clear
Authorization: Bearer <token>
```

### Orders (`/api/orders`)

#### Create Order (Registered User)
```http
POST /api/orders
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "items": [
    {
      "product": "product_id",
      "quantity": 1,
      "price": 24.99
    }
  ],
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "street": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zipCode": "12345",
    "country": "US"
  },
  "billingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "street": "123 Main St",
    "city": "Anytown",
    "state": "CA",
    "zipCode": "12345",
    "country": "US"
  },
  "useDefaultAddress": false,
  "referralSource": "holistic-school"
}
```

#### Create Guest Order
```http
POST /api/orders/guest
```

**Request Body:**
```json
{
  "guestInfo": {
    "email": "guest@example.com",
    "firstName": "Guest",
    "lastName": "User",
    "phone": "555-123-4567"
  },
  "items": [
    {
      "product": "product_id",
      "quantity": 1,
      "price": 24.99
    }
  ],
  "shippingAddress": {
    "firstName": "Guest",
    "lastName": "User",
    "street": "456 Guest Ave",
    "city": "Guest City",
    "state": "NY",
    "zipCode": "54321",
    "country": "US"
  },
  "billingAddress": {
    "firstName": "Guest",
    "lastName": "User",
    "street": "456 Guest Ave",
    "city": "Guest City",
    "state": "NY",
    "zipCode": "54321",
    "country": "US"
  },
  "referralSource": "travel-discovery"
}
```

#### Get User Orders
```http
GET /api/orders
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by status

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "_id": "order_id",
        "orderNumber": "ORD-2024-001",
        "items": [
          {
            "product": {
              "_id": "product_id",
              "name": "Amethyst Crystal",
              "slug": "amethyst-crystal"
            },
            "quantity": 1,
            "price": 24.99
          }
        ],
        "shippingAddress": {
          "firstName": "John",
          "lastName": "Doe",
          "street": "123 Main St",
          "city": "Anytown",
          "state": "CA",
          "zipCode": "12345",
          "country": "US"
        },
        "subtotal": 24.99,
        "tax": 2.25,
        "shipping": 5.99,
        "total": 33.23,
        "payment": {
          "method": "card",
          "status": "completed",
          "paidAt": "2024-01-01T12:00:00.000Z"
        },
        "status": "processing",
        "createdAt": "2024-01-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 2,
      "totalItems": 15
    }
  }
}
```

#### Get Single Order
```http
GET /api/orders/:id
Authorization: Bearer <token>
```

### Payments (`/api/payments`)

#### Create Payment
```http
POST /api/payments/create
Authorization: Bearer <token> (optional for guest orders)
```

**Request Body:**
```json
{
  "amount": 33.23,
  "description": "Order ORD-2024-001",
  "orderId": "order_id",
  "method": "card",
  "redirectUrl": "https://yoursite.com/payment/success",
  "webhookUrl": "https://yoursite.com/api/payments/webhook"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "mollie_payment_id",
    "checkoutUrl": "https://www.mollie.com/payscreen/select-method/...",
    "status": "open"
  }
}
```

#### Check Payment Status
```http
GET /api/payments/status/:paymentId
Authorization: Bearer <token> (optional for guest orders)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentId": "mollie_payment_id",
    "status": "paid",
    "amount": 33.23,
    "paidAt": "2024-01-01T12:00:00.000Z",
    "method": "creditcard"
  }
}
```

#### Payment Webhook (Mollie)
```http
POST /api/payments/webhook
```

**Request Body:**
```json
{
  "id": "mollie_payment_id"
}
```

### Cross-Site Integration (`/api/integration`)

#### Get Product for Integration
```http
GET /api/integration/products/:slug
```

**Query Parameters:**
- `referrer` (string): Referring site identifier

**Response:**
```json
{
  "success": true,
  "data": {
    "product": {
      "_id": "product_id",
      "name": "Amethyst Crystal",
      "slug": "amethyst-crystal",
      "shortDescription": "Purple amethyst crystal",
      "price": 24.99,
      "images": [
        {
          "url": "/images/products/amethyst.jpg",
          "alt": "Amethyst Crystal",
          "isPrimary": true
        }
      ],
      "properties": {
        "chakra": ["crown", "third-eye"],
        "element": "air"
      },
      "directUrl": "https://store.com/products/amethyst-crystal"
    }
  }
}
```

#### Get Embeddable Product Widget
```http
GET /api/integration/embed/:slug
```

**Response:**
```json
{
  "success": true,
  "data": {
    "html": "<div class='product-widget'>...</div>",
    "css": ".product-widget { ... }",
    "js": "// Widget JavaScript"
  }
}
```

### Admin Routes (`/api/admin`)

All admin routes require admin authentication.

#### Get All Products (Admin)
```http
GET /api/admin/products
Authorization: Bearer <admin-token>
```

**Response includes wholesaler information:**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "_id": "product_id",
        "name": "Amethyst Crystal",
        "price": 24.99,
        "wholesaler": {
          "name": "Crystal Wholesaler",
          "email": "crystals@wholesaler.com",
          "productCode": "AME001",
          "cost": 12.50
        },
        "margin": 12.49,
        "marginPercent": 50.0
      }
    ]
  }
}
```

#### Create Product
```http
POST /api/admin/products
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "name": "New Crystal",
  "slug": "new-crystal",
  "description": "A beautiful new crystal",
  "shortDescription": "New crystal",
  "price": 19.99,
  "category": "crystals",
  "properties": {
    "chakra": ["heart"],
    "element": "earth"
  },
  "wholesaler": {
    "name": "Crystal Wholesaler",
    "email": "crystals@wholesaler.com",
    "productCode": "NC001",
    "cost": 10.00
  }
}
```

#### Update Product
```http
PUT /api/admin/products/:id
Authorization: Bearer <admin-token>
```

#### Delete Product
```http
DELETE /api/admin/products/:id
Authorization: Bearer <admin-token>
```

#### Get All Orders (Admin)
```http
GET /api/admin/orders
Authorization: Bearer <admin-token>
```

#### Update Order Status
```http
PUT /api/admin/orders/:id/status
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "status": "shipped",
  "trackingNumber": "1234567890",
  "notes": "Order shipped via FedEx"
}
```

### Wholesaler Management (`/api/wholesalers`)

#### Send Order to Wholesaler
```http
POST /api/wholesalers/notify
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "orderId": "order_id"
}
```

#### Get Wholesaler Notification Status
```http
GET /api/wholesalers/orders/:orderId
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order_id",
    "notifications": [
      {
        "wholesaler": "Crystal Wholesaler",
        "email": "crystals@wholesaler.com",
        "status": "sent",
        "sentAt": "2024-01-01T12:00:00.000Z",
        "attempts": 1
      }
    ]
  }
}
```

#### Retry Failed Notifications
```http
POST /api/wholesalers/retry/:orderId
Authorization: Bearer <admin-token>
```

### Monitoring (`/api/monitoring`)

#### Health Check
```http
GET /api/monitoring/health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600
}
```

#### System Status (Admin)
```http
GET /api/monitoring/status
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "uptime": 3600,
    "memory": {
      "used": "45.2 MB",
      "total": "128 MB"
    },
    "database": {
      "status": "connected",
      "collections": {
        "users": 150,
        "products": 75,
        "orders": 230
      }
    },
    "external": {
      "mollie": "connected",
      "email": "connected"
    }
  }
}
```

## Webhooks

### Mollie Payment Webhook

Mollie will send POST requests to your webhook URL when payment status changes:

```http
POST /api/payments/webhook
Content-Type: application/x-www-form-urlencoded

id=tr_WDqYK6vllg
```

Your application should:
1. Verify the payment ID with Mollie API
2. Update the order status based on payment status
3. Send confirmation emails if payment is successful
4. Trigger wholesaler notifications for completed orders

## SDKs and Examples

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Register user
async function registerUser(userData) {
  try {
    const response = await api.post('/auth/register', userData);
    localStorage.setItem('token', response.data.data.token);
    return response.data;
  } catch (error) {
    console.error('Registration failed:', error.response.data);
    throw error;
  }
}

// Get products
async function getProducts(filters = {}) {
  try {
    const response = await api.get('/products', { params: filters });
    return response.data.data.products;
  } catch (error) {
    console.error('Failed to fetch products:', error.response.data);
    throw error;
  }
}

// Add to cart
async function addToCart(productId, quantity) {
  try {
    const response = await api.post('/cart/add', { productId, quantity });
    return response.data.data.cart;
  } catch (error) {
    console.error('Failed to add to cart:', error.response.data);
    throw error;
  }
}
```

### cURL Examples

```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Get products
curl -X GET "http://localhost:3000/api/products?category=crystals&limit=10"

# Add to cart (requires auth token)
curl -X POST http://localhost:3000/api/cart/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productId": "product_id_here",
    "quantity": 2
  }'

# Create payment
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 29.99,
    "description": "Order payment",
    "orderId": "order_id_here"
  }'
```

## Testing

The API includes comprehensive test coverage. Run tests with:

```bash
npm test                # Run all tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

## Support

For API support and questions:
- Email: support@holisticstore.com
- Documentation: https://docs.holisticstore.com
- Status Page: https://status.holisticstore.com