# Technology Stack

## Backend Framework
- **Node.js** with **Express.js** - RESTful API server
- **MongoDB** with **Mongoose** ODM for data persistence
- **JWT** for authentication and session management

## Key Dependencies
- **bcryptjs** - Password hashing
- **cors** - Cross-origin resource sharing
- **helmet** - Security headers
- **express-rate-limit** - API rate limiting
- **express-validator** - Input validation
- **multer** - File upload handling
- **nodemailer** - Email notifications
- **axios** - HTTP client for external APIs
- **dotenv** - Environment configuration

## Payment Integration
- **Mollie** - Payment processor supporting cards and cryptocurrency

## Security Features
- Rate limiting (100 requests per 15 minutes)
- Helmet security headers
- CORS with configurable origins
- JWT token authentication
- Password hashing with bcrypt

## Development Tools
- **nodemon** - Development server with auto-restart
- **webpack** - Build system for production

## Common Commands

### Development
```bash
npm run dev          # Start development server with nodemon
npm start           # Start production server
npm run build       # Build for production with webpack
```

### Environment Setup
- Copy `.env.example` to `.env` and configure variables
- Ensure MongoDB is running locally or configure MONGODB_URI
- Set JWT_SECRET for token signing
- Configure Mollie API keys for payments
- Set ALLOWED_ORIGINS for CORS configuration

## API Structure
- RESTful endpoints under `/api/` prefix
- Health check endpoint at `/health`
- Static file serving for uploads and public assets
- Rate limiting applied globally