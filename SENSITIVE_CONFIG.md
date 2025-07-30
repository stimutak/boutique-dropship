# Environment Variables Configuration Guide

This document explains the purpose and configuration of each environment variable used in the Boutique application. Store your actual `.env` file in a secure password manager like 1Password.

## Core Application Settings

### `NODE_ENV`
- **Purpose**: Sets the application environment mode
- **Values**: `development`, `production`, `test`
- **Default**: `development`
- **Impact**: Affects logging levels, error messages, and performance optimizations

### `PORT`
- **Purpose**: The port number for the backend server
- **Default**: `5001`
- **Note**: Frontend expects backend on port 5001 in development

## Frontend Configuration

### `VITE_API_URL`
- **Purpose**: Backend API URL for the Vite-powered frontend
- **Default**: `http://localhost:5001`
- **Production**: Should point to your deployed API endpoint

### `VITE_APP_NAME`
- **Purpose**: Application name displayed in the frontend
- **Default**: `International Boutique Store`

## Database Configuration

### `MONGODB_URI`
- **Purpose**: MongoDB connection string
- **Development**: `mongodb://mongodb:27017/holistic-store` (Docker) or `mongodb://localhost:27017/holistic-store` (local)
- **Production**: Use a secure MongoDB Atlas connection string
- **Security**: Contains database credentials in production

## Security Keys (  HIGHLY SENSITIVE)

### `JWT_SECRET`
- **Purpose**: Secret key for signing JWT tokens
- **Requirements**: Minimum 32 characters, cryptographically secure
- **Generation**: Use a secure random generator
- **Example**: `openssl rand -hex 32`
- **Security**: Never share or expose this value

### `SESSION_SECRET`
- **Purpose**: Secret key for signing session cookies
- **Requirements**: Minimum 32 characters, different from JWT_SECRET
- **Generation**: Use a secure random generator
- **Security**: Never share or expose this value

## Payment Processing

### `MOLLIE_API_KEY`
- **Purpose**: Production API key for Mollie payment processing
- **Format**: `live_xxxxxxxxxxxxxxxxxxxxx`
- **Security**: Keep confidential to prevent unauthorized charges

### `MOLLIE_TEST_KEY`
- **Purpose**: Test API key for Mollie payment processing
- **Format**: `test_xxxxxxxxxxxxxxxxxxxxx`
- **Use**: Development and testing environments only

## URL Configuration

### `FRONTEND_URL`
- **Purpose**: Frontend application URL for CORS and redirects
- **Development**: `http://localhost:3001`
- **Production**: Your deployed frontend URL (e.g., `https://boutique.example.com`)

### `API_URL`
- **Purpose**: Backend API URL for internal references
- **Development**: `http://localhost:5001`
- **Production**: Your deployed API URL

### `ALLOWED_ORIGINS`
- **Purpose**: Comma-separated list of allowed CORS origins
- **Format**: `http://localhost:3001,http://localhost`
- **Security**: Only include trusted domains

## Email Configuration (Optional)

### `EMAIL_HOST`
- **Purpose**: SMTP server hostname
- **Example**: `smtp.gmail.com`, `smtp.sendgrid.net`

### `EMAIL_PORT`
- **Purpose**: SMTP server port
- **Common**: `587` (TLS), `465` (SSL), `25` (unencrypted)

### `EMAIL_USER`
- **Purpose**: SMTP authentication username
- **Example**: `notifications@boutique.com`

### `EMAIL_PASS`
- **Purpose**: SMTP authentication password
- **Security**: Use app-specific passwords when available
- **Note**: For Gmail, generate an app password instead of using your account password

## Notifications

### `WHOLESALER_NOTIFICATION_EMAIL`
- **Purpose**: Email address for wholesaler order notifications
- **Example**: `orders@wholesaler.com`

## API Integration

### `VALID_API_KEYS`
- **Purpose**: Comma-separated list of valid API keys for external integrations
- **Format**: `key1,key2,key3`
- **Security**: Generate unique keys for each integration partner

## Development Tools

### `MONGO_EXPRESS_PASSWORD`
- **Purpose**: Password for MongoDB Express web interface (Docker setup)
- **Development Only**: Should not be used in production

## International Support

### `DEFAULT_LANGUAGE`
- **Purpose**: Default language code
- **Default**: `en`

### `DEFAULT_CURRENCY`
- **Purpose**: Default currency code
- **Default**: `USD`

### `SUPPORTED_LANGUAGES`
- **Purpose**: Comma-separated list of supported language codes
- **Default**: `en,es,fr,de,it,pt,zh,ja,ko,ar,he`

### `SUPPORTED_CURRENCIES`
- **Purpose**: Comma-separated list of supported currency codes
- **Default**: `USD,EUR,GBP,JPY,CNY,CAD,AUD,CHF,SEK,NOK,INR,BRL,MXN`

## Currency API

### `CURRENCY_API_KEY`
- **Purpose**: API key for currency exchange rate service
- **Providers**: OpenExchangeRates, CurrencyAPI, etc.

### `CURRENCY_UPDATE_INTERVAL`
- **Purpose**: Milliseconds between currency rate updates
- **Default**: `3600000` (1 hour)

## CDN Configuration

### `CDN_URL`
- **Purpose**: CDN base URL for static assets
- **Example**: `https://cdn.boutique.com`

### `CDN_ENABLED`
- **Purpose**: Enable/disable CDN usage
- **Values**: `true`, `false`
- **Default**: `false`

## Performance Settings

### `MAX_UPLOAD_SIZE`
- **Purpose**: Maximum file upload size in bytes
- **Default**: `10485760` (10MB)

### `REQUEST_TIMEOUT`
- **Purpose**: Request timeout in milliseconds
- **Default**: `30000` (30 seconds)

### `RATE_LIMIT_WINDOW`
- **Purpose**: Rate limiting window in milliseconds
- **Default**: `900000` (15 minutes)

### `RATE_LIMIT_MAX_REQUESTS`
- **Purpose**: Maximum requests per rate limit window
- **Default**: `100`

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong, unique secrets** for JWT_SECRET and SESSION_SECRET
3. **Rotate secrets regularly** in production
4. **Use environment-specific values** (don't reuse dev keys in production)
5. **Store production secrets** in secure vaults (AWS Secrets Manager, Azure Key Vault, etc.)
6. **Limit access** to production environment variables
7. **Monitor** for exposed secrets in logs and error messages

## Quick Setup Commands

Generate secure secrets:
```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate SESSION_SECRET
openssl rand -hex 32

# Generate API keys
uuidgen | tr '[:upper:]' '[:lower:]'
```

Validate your `.env` file:
```bash
# Check all required variables are set
node -e "require('dotenv').config(); const required = ['JWT_SECRET', 'SESSION_SECRET', 'MONGODB_URI']; required.forEach(v => { if (!process.env[v]) console.error(`Missing: ${v}`) })"
```