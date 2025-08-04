# Holistic Dropship Store

[![CI](https://github.com/ORG/REPO/actions/workflows/test.yml/badge.svg)](https://github.com/ORG/REPO/actions/workflows/test.yml) [![Coverage](https://img.shields.io/codecov/c/github/ORG/REPO.svg)](https://codecov.io/gh/ORG/REPO) [![Dependencies](https://img.shields.io/librariesio/release/npm/holistic-dropship-store)](https://github.com/ORG/REPO/pulls?q=is%3Apr+is%3Aopen+label%3A%22dependencies%22)

A full-stack **international** e-commerce platform for spiritual and wellness products with dropshipping functionality, built with React and Node.js.

## 🌟 Features

### ✅ Completed Features (~87% Complete)

#### 🌍 Internationalization & Localization
- **Multi-language Support**: 7 languages including RTL (Arabic, Hebrew)
- **Multi-currency Support**: 20+ currencies with real-time conversion
- **Locale-aware Formatting**: Dates, numbers, addresses per region
- **Global Payment Methods**: Mollie handles international payments

#### 🛒 E-commerce Core
- **Full Shopping Experience**: Product catalog, cart persistence, guest checkout
- **Advanced Product Management**: Bulk import/export via CSV, image management
- **Wholesaler Management**: Automated notifications, product mapping, cost tracking
- **Order Processing**: Creation, tracking, status management
- **Inventory Tracking**: Stock levels, low stock alerts

#### 🔐 Security & Authentication
- **Secure Authentication**: JWT in httpOnly cookies (localStorage removed)
- **CSRF Protection**: Implemented and working
- **Session Management**: Atomic operations with proper cleanup
- **Password Security**: Bcrypt hashing, secure reset flows
- **Rate Limiting**: API protection against abuse

#### 👨‍💼 Admin Dashboard
- **Product Management**: CRUD operations, bulk import/export
- **Order Management**: View, process, update order status
- **User Management**: View users, manage roles
- **Analytics Dashboard**: Sales metrics, product performance
- **Wholesaler Interface**: Manage suppliers and products

#### 🎨 Frontend Features
- **Responsive Design**: Mobile-first, works on all devices
- **RTL Support**: Full support for Arabic and Hebrew
- **State Management**: Redux Toolkit with optimized slices
- **Performance**: Database indexes, batch queries, optimized APIs
- **Accessibility**: ARIA labels, keyboard navigation

#### 🏗️ Infrastructure
- **Docker Support**: Full containerization with docker-compose
- **Production Ready**: Nginx configuration, environment-based configs
- **Monitoring**: Winston logging, error tracking
- **Testing**: Comprehensive test suites with Vitest

### 🚧 Remaining Features (4 tasks)
- **Error Handling Standardization**: Consistent error responses
- **Order Fulfillment Workflow**: Complete shipping process
- **Email Notifications**: Order confirmations, shipping updates
- **Code Splitting**: Frontend lazy loading for better performance

## 🛠 Tech Stack

### Backend
- **Node.js** with **Express.js** - RESTful API server
- **MongoDB** with **Mongoose** ODM - Database and data modeling
- **JWT** - Authentication and session management
- **Mollie** - Payment processing
- **Nodemailer** - Email notifications
- **Winston** - Logging

### Frontend
- **React 19** - UI framework
- **Redux Toolkit** - State management
- **React Router** - Client-side routing
- **Vite** - Build tool and dev server
- **Axios** - HTTP client

### Security & Performance
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing
- **Express Rate Limit** - API rate limiting
- **Express Validator** - Input validation
- **Bcrypt** - Password hashing

## 🚀 Quick Start

### Docker Development (Recommended)
```bash
# Start all services
./docker-helper.sh dev

# View logs
./docker-helper.sh logs

# Stop services
./docker-helper.sh stop
```

**Access Points:**
- Frontend: http://localhost:3001
- Backend API: http://localhost:5001
- Database UI: http://localhost:8081 (admin/admin123)

### Local Development

#### Prerequisites
- Node.js (v18 or higher)
- MongoDB (running locally or connection string)
- npm or yarn

#### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd holistic-dropship-store
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration. See [SENSITIVE_CONFIG.md](SENSITIVE_CONFIG.md) for detailed explanations of each variable.
   
   **Important Security Notes:**
   - The `.env` file contains sensitive information and is excluded from version control
   - Generate secure values for JWT_SECRET and SESSION_SECRET (minimum 32 characters)
   - Store your actual `.env` file securely (e.g., 1Password, LastPass)
   - Never commit the `.env` file to Git

5. **Start MongoDB**
   ```bash
   brew services start mongodb/brew/mongodb-community
   ```

6. **Populate the database with test data**
   ```bash
   node populate-simple.js
   ```

7. **Start the backend server**
   ```bash
   npm run dev
   ```

8. **Start the frontend client** (in a new terminal)
   ```bash
   cd client
   npm run dev
   ```

### 🌐 Access the Application

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:5001
- **API Health Check**: http://localhost:5001/health

## 👥 Test Accounts

After running the populate script, you can use these test accounts:

- **Admin User**: john@example.com / Password123!
- **Regular User**: jane@example.com / Password123!

## 📊 Database

The application includes 5 test products:
- Amethyst Crystal Cluster ($45.99)
- Rose Quartz Heart Stone ($28.50)
- White Sage Smudge Bundle ($12.99)
- Lavender Essential Oil ($24.99)
- Chakra Balancing Stone Set ($89.99)

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login with JWT cookie
- `POST /api/auth/logout` - Clear authentication
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Products
- `GET /api/products` - Get all products (paginated)
- `GET /api/products/:slug` - Get product by slug
- `GET /api/products/search` - Search products
- `GET /api/products/category/:category` - Get by category
- `GET /api/products/featured` - Get featured products

### Cart & Orders
- `GET /api/cart` - Get user's cart (session-based)
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update` - Update quantities
- `DELETE /api/cart/remove/:productId` - Remove item
- `POST /api/cart/clear` - Clear cart
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order details

### Payments
- `POST /api/payments/create` - Create Mollie payment
- `POST /api/payments/webhook` - Mollie webhook handler
- `GET /api/payments/status/:id` - Check payment status
- `GET /api/payments/methods` - Available payment methods

### Admin
- `GET /api/admin/products` - List all products
- `POST /api/admin/products` - Create product
- `PUT /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Soft delete product
- `POST /api/admin/products/bulk-import` - Import CSV
- `GET /api/admin/products/export` - Export to CSV
- `POST /api/admin/products/:id/images` - Upload images
- `GET /api/admin/orders` - List all orders
- `PUT /api/admin/orders/:id/status` - Update order status
- `GET /api/admin/analytics` - Dashboard metrics
- `GET /api/admin/users` - List all users
- `GET /api/admin/wholesalers` - Manage wholesalers

## 🏗 Project Structure

```
├── server.js              # Main server file
├── package.json           # Backend dependencies
├── .env.example           # Environment variables template
├── populate-simple.js     # Database population script
├── models/                # Mongoose models
│   ├── User.js
│   ├── Product.js
│   └── Order.js
├── routes/                # Express routes
│   ├── auth.js
│   ├── products.js
│   ├── cart.js
│   ├── orders.js
│   ├── payments.js
│   └── admin.js
├── middleware/            # Custom middleware
│   ├── auth.js
│   ├── security.js
│   └── errorHandler.js
├── utils/                 # Utility functions
│   ├── emailService.js
│   ├── logger.js
│   └── wholesalerNotificationService.js
└── client/                # React frontend
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── store/
    │   └── api/
    └── package.json
```

## 🔒 Security Features

- **JWT Authentication**: Stored in httpOnly cookies (not localStorage)
- **CSRF Protection**: Token-based protection for state-changing operations
- **Password Security**: Bcrypt hashing with salt rounds
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Configured for production domains
- **Input Validation**: Express-validator for all inputs
- **Security Headers**: Helmet.js for XSS, clickjacking protection
- **MongoDB Injection**: Parameterized queries, input sanitization
- **Session Security**: Atomic operations, proper cleanup

## 🚢 Deployment

### Environment Variables for Production
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-production-jwt-secret
MOLLIE_API_KEY=your-production-mollie-key
FRONTEND_URL=https://your-domain.com

# Email Configuration (Optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

**Note:** Email service is optional. When not configured, the application will:
- Skip sending emails without errors
- Log password reset URLs to the console (development mode)
- Continue functioning normally

See [Email Setup Guide](docs/EMAIL_SETUP.md) for detailed configuration instructions.

### Build Commands
```bash
# Build frontend
cd client && npm run build

# Start production server
npm start
```

## 🧪 Testing

```bash
# Run backend tests
npm test

# Run frontend tests
cd client && npm test

# Run with coverage
npm run test:coverage
```

## 📝 Development Notes

### Important Guidelines
- **Read CLAUDE.md** before making changes - contains critical project constraints
- **International Platform**: Always consider multi-language and multi-currency
- **No Duplicate Code**: Search before creating new files
- **Keep It Simple**: This is an e-commerce site, not a distributed system

### Recent Improvements
- ✅ JWT moved to httpOnly cookies (removed from localStorage)
- ✅ CSRF protection implemented and working
- ✅ Cart persistence with atomic operations
- ✅ Database indexes added for performance
- ✅ N+1 queries fixed with batch operations
- ✅ React 19 upgrade completed
- ✅ Enhanced Redux slices removed (cleaned up duplication)
- ✅ Port configuration fixed (reads from .env)

### Known Issues & TODOs
- ⚠️ Unused dependencies still present (webpack, nyc, multiple eslint configs)
- ⏳ Code splitting not implemented (frontend loads everything at once)
- ⏳ Email notifications need configuration
- ⏳ Order fulfillment workflow incomplete
- ⏳ Some memory leaks from uncleaned event listeners

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the console logs for error messages
2. Verify environment variables are set correctly
3. Ensure MongoDB is running
4. Check that all dependencies are installed

## 📚 Documentation

- [CLAUDE.md](CLAUDE.md) - Critical project constraints and guidelines
- [SENSITIVE_CONFIG.md](SENSITIVE_CONFIG.md) - Environment variables guide
- [Email Setup Guide](docs/EMAIL_SETUP.md) - Email configuration
- [Admin Dashboard](docs/ADMIN_DASHBOARD.md) - Admin interface documentation

## 🌐 Bulk Import/Export

The admin dashboard includes CSV import/export functionality:

### CSV Import Format
Required fields: `name`, `price`, `category`, `wholesaler_name`, `wholesaler_email`

Optional fields: `slug`, `description`, `tags`, `images`, `is_featured`, etc.

Download a template from Admin → Products → Bulk Import/Export

---

**Last Updated**: December 2024
**Version**: 1.0.0 (~87% Complete)
