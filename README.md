# Holistic Dropship Store

A full-stack e-commerce application for spiritual and wellness products with dropshipping functionality, built with React and Node.js.

## 🌟 Features

- **Full E-commerce Functionality**: Product catalog, shopping cart, checkout, and order management
- **Dropshipping Integration**: Automated wholesaler notifications and order processing
- **User Authentication**: Registration, login, and profile management with JWT tokens
- **Admin Interface**: Product management, order tracking, and analytics
- **Payment Processing**: Mollie integration for cards and cryptocurrency
- **Cross-site Integration**: API for sister websites and embeddable widgets
- **Email Notifications**: Order confirmations, payment receipts, and wholesaler alerts
- **Responsive Design**: Mobile-friendly React frontend
- **Security Features**: Rate limiting, CORS protection, input validation

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

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (running locally or connection string)
- npm or yarn

### Installation

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
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:slug` - Get product by slug
- `GET /api/products/search` - Search products

### Cart & Orders
- `GET /api/cart` - Get user's cart
- `POST /api/cart/add` - Add item to cart
- `POST /api/orders` - Create new order
- `GET /api/orders` - Get user's orders

### Payments
- `POST /api/payments/create` - Create payment
- `POST /api/payments/webhook` - Mollie webhook
- `GET /api/payments/status/:id` - Check payment status

### Admin
- `GET /api/admin/products` - Manage products
- `GET /api/admin/orders` - Manage orders
- `GET /api/admin/analytics` - View analytics

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

- JWT token authentication
- Password hashing with bcrypt
- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Input validation and sanitization
- Security headers with Helmet
- MongoDB injection protection

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

### Recent Fixes Applied
- Fixed Redux store to properly handle API response structure
- Corrected product image rendering in components
- Updated CORS configuration for development ports
- Added comprehensive error handling and logging
- Implemented proper JWT token validation

### Known Issues
- Mollie payment integration requires valid API keys for full functionality
- Email notifications require SMTP configuration
- Some features may require additional environment setup

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

---

**Last Updated**: July 17, 2025
**Version**: 1.0.0