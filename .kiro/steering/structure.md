# Project Structure

## Root Level
- `server.js` - Main application entry point with Express setup
- `package.json` - Dependencies and npm scripts
- `.env.example` - Environment variables template

## Core Directories

### `/models/`
Mongoose schemas and data models:
- `User.js` - User accounts with authentication, addresses, preferences
- `Product.js` - Product catalog with spiritual properties and wholesaler info
- `Order.js` - Order management with dropshipping workflow

### `/routes/`
Express route handlers organized by feature:
- `auth.js` - Authentication endpoints (login, register, profile)
- `products.js` - Product CRUD and search
- `cart.js` - Shopping cart management
- `orders.js` - Order processing and status
- `payments.js` - Payment processing via Mollie
- `wholesalers.js` - Wholesaler integration and notifications

### `/middleware/`
Custom Express middleware (authentication, validation, etc.)

### `/utils/`
Utility functions and helpers

## Conventions

### Model Patterns
- Use Mongoose schemas with proper validation
- Include timestamps on all models
- Pre-save hooks for data processing (password hashing, order numbers)
- Proper indexing for search and performance
- Embedded subdocuments for related data (addresses, order items)

### API Patterns
- RESTful endpoints with `/api/` prefix
- Consistent error handling and validation
- JWT middleware for protected routes
- Input validation using express-validator
- Proper HTTP status codes

### Data Structure
- Products include spiritual properties (chakra, element, zodiac)
- Orders support both registered users and guest checkout
- Wholesaler integration embedded in product and order models
- Cross-site integration fields for sister website referrals

### File Organization
- Models contain business logic and validation
- Routes handle HTTP concerns and call model methods
- Middleware for cross-cutting concerns
- Utils for shared functionality
- Static files served from `/uploads/` and `/public/`

### Environment Configuration
- All sensitive data in environment variables
- Separate development and production configurations
- CORS origins configurable for multi-site integration