# Deployment Guide

## Overview

This guide explains the deployment architecture for the Boutique e-commerce application and the differences between development and production setups.

## Development vs Production

### Development Setup (Current)
- **Backend**: Runs in Docker container on port 5001
- **Frontend**: Runs locally with `npm run dev` on port 3001
- **Database**: MongoDB in Docker container
- **Purpose**: Hot reloading, debugging, rapid development

### Production Setup (Required for Deployment)
- **Backend**: Runs in Docker container
- **Frontend**: Runs in Docker container with production build
- **Database**: MongoDB in Docker container (or managed service)
- **Nginx**: Reverse proxy for routing and static file serving
- **Purpose**: Optimized performance, security, scalability

## Production Deployment Steps

### 1. Environment Configuration

Create a `.env.production` file with production values:
```bash
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb://mongodb:27017/holistic-store  # Or your managed MongoDB URL
JWT_SECRET=[production-secret-at-least-32-chars]
SESSION_SECRET=[production-session-secret]
MOLLIE_API_KEY=[production-mollie-key]
FRONTEND_URL=https://yourdomain.com
```

### 2. Build Frontend for Production

The frontend needs to be built and served statically in production:

```bash
cd client
npm run build
```

This creates an optimized production build in `client/dist/`.

### 3. Use Production Docker Compose

For production deployment, use the main `docker-compose.yml` file:

```bash
# Build and start all services
docker-compose up -d

# Or if you need to rebuild
docker-compose up -d --build
```

### 4. Production Docker Configuration

The production setup includes:

1. **Frontend Container**: 
   - Serves the production build via nginx
   - No hot reloading or development server
   - Optimized for performance

2. **Backend Container**:
   - Runs with `NODE_ENV=production`
   - No file watching or auto-restart
   - Production error handling

3. **Nginx Container**:
   - Routes `/api/*` requests to backend
   - Serves frontend static files
   - Handles SSL termination (when configured)

### 5. SSL/TLS Configuration

For production, you should add SSL certificates. Update the nginx configuration:

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    # ... rest of configuration
}
```

### 6. Database Considerations

For production:
- Consider using a managed MongoDB service (MongoDB Atlas, AWS DocumentDB)
- Enable authentication on MongoDB
- Set up regular backups
- Configure replica sets for high availability

### 7. Monitoring and Logging

Production deployment should include:
- Container health checks
- Log aggregation (ELK stack, CloudWatch, etc.)
- Application monitoring (New Relic, DataDog, etc.)
- Uptime monitoring

## Deployment Commands

### Local Development
```bash
# Start backend in Docker, frontend locally
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d mongodb backend
cd client && npm run dev
```

### Production Deployment
```bash
# Build frontend
cd client && npm run build && cd ..

# Deploy all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale backend if needed
docker-compose up -d --scale backend=3
```

## Environment-Specific Considerations

### Development
- Frontend proxy configuration in `vite.config.js` points to `http://localhost:5001`
- Hot module replacement enabled
- Verbose logging
- CORS configured for local development

### Production
- Frontend served statically via nginx
- API calls routed through nginx reverse proxy
- Minimal logging
- Strict CORS configuration
- Rate limiting enabled

## Troubleshooting

### Frontend not accessible in production
- Check nginx configuration
- Verify frontend build completed successfully
- Check Docker logs: `docker-compose logs frontend`

### API calls failing in production
- Verify nginx proxy configuration
- Check backend is running: `docker-compose ps`
- Review backend logs: `docker-compose logs backend`

### Database connection issues
- Verify MongoDB is accessible from backend container
- Check connection string in environment variables
- Ensure database authentication is configured correctly

## Security Checklist

- [ ] Remove `.env` from repository
- [ ] Use strong JWT_SECRET and SESSION_SECRET
- [ ] Enable MongoDB authentication
- [ ] Configure SSL/TLS certificates
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Configure CORS for production domain only
- [ ] Remove debug endpoints
- [ ] Enable security headers in nginx

## Next Steps

1. Choose a hosting provider (AWS, DigitalOcean, Google Cloud, etc.)
2. Set up CI/CD pipeline for automated deployments
3. Configure monitoring and alerting
4. Set up backup strategies
5. Plan for scaling and load balancing