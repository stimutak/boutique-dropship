# Docker Configuration for Boutique E-commerce

This directory contains Docker configuration files for the Boutique application.

## Structure

- `nginx/` - Nginx reverse proxy configuration
  - `nginx.conf` - Main nginx configuration
  - `nginx.dev.conf` - Development-specific nginx config
- `DEPLOYMENT.md` - Comprehensive deployment guide
- `Dockerfile` - Backend application Dockerfile (in root directory)
- `docker-compose.yml` - Production Docker Compose configuration (in root)
- `docker-compose.dev.yml` - Development overrides (in root)

## Quick Start

### Development (Everything in Docker)
```bash
# Start all services in development mode
./docker-helper.sh dev

# Or manually with docker-compose
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Production (Everything in Docker)
```bash
# Build frontend first
cd client && npm run build && cd ..

# Start all services
docker-compose up -d
```

See `DEPLOYMENT.md` for detailed deployment instructions.