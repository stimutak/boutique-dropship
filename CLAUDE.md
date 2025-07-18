# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend Development
- `npm run dev` - Start backend server with nodemon (port 5001)
- `npm start` - Start production backend server
- `npm test` - Run Jest tests for backend
- `npm run test:watch` - Run Jest tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

### Frontend Development (in /client directory)
- `npm run dev` - Start Vite development server (port 3001)
- `npm run build` - Build production frontend
- `npm run preview` - Preview production build
- `npm test` - Run Vitest tests
- `npm run test:watch` - Run Vitest in watch mode
- `npm run test:ui` - Run Vitest with UI

### Database Setup
- `node populate-simple.js` - Populate database with test data and users
- MongoDB runs on: `mongodb://localhost:27017/holistic-store`

### Test Data
After running populate script:
- Admin: john@example.com / Password123!
- User: jane@example.com / Password123!

## Architecture Overview

### Backend Structure
- **server.js** - Main Express server with security middleware, rate limiting, CORS
- **models/** - Mongoose schemas (User, Product, Order)
- **routes/** - Express route handlers (auth, products, cart, orders, payments, admin)
- **middleware/** - Authentication, security headers, error handling
- **utils/** - Email service, logging (Winston), wholesaler notifications

### Frontend Structure (React + Redux)
- **src/pages/** - Route components (Home, Products, Cart, Checkout, etc.)
- **src/components/** - Reusable components (Header, Footer, ProtectedRoute)
- **src/store/** - Redux Toolkit store with slices (auth, cart, products, orders)
- **src/api/** - Axios configuration and API client

### Key Integrations
- **Authentication**: JWT tokens with Express sessions
- **Payments**: Mollie API for cards and cryptocurrency
- **Database**: MongoDB with Mongoose ODM
- **State Management**: Redux Toolkit for frontend state
- **Security**: Helmet, CORS, rate limiting, input validation

### API Structure
- Base URL: `http://localhost:5001/api`
- Authentication required for: cart, orders, profile, admin routes
- CSRF protection on write operations
- Rate limiting: 100 requests per 15 minutes

### Environment Configuration
Required `.env` variables:
- `MONGODB_URI` - Database connection
- `JWT_SECRET` - Token signing key
- `SESSION_SECRET` - Session encryption
- `MOLLIE_API_KEY` - Payment processing
- `FRONTEND_URL` - CORS origin
- `NODE_ENV` - Environment mode

### Development Notes
- Frontend and backend run on separate ports (3001 and 5001)
- Tests use in-memory MongoDB and mocked services
- Logging configured with Winston to files in `/logs`
- Image uploads handled via Multer to `/uploads/temp`
- Wholesaler notification system for dropshipping automation