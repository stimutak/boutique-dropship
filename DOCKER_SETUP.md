# Docker Setup for International Boutique Store

This guide provides instructions for using Docker to run the International Boutique Store application.

## Prerequisites

- Docker Desktop (v20.10+)
- Docker Compose (v2.0+)
- 4GB+ available RAM for Docker

## Quick Start

1. **Copy environment configuration:**
   ```bash
   cp .env.docker .env
   ```

2. **Update `.env` with your values** (especially security keys!)

3. **Start development environment:**
   ```bash
   ./docker-helper.sh dev
   ```

   Or manually:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
   ```

4. **Access the application:**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:5001
   - MongoDB Express (dev only): http://localhost:8081

## Docker Helper Script

Use `./docker-helper.sh` for common tasks:

```bash
# Development
./docker-helper.sh dev          # Start development environment
./docker-helper.sh dev:build    # Rebuild and start dev environment

# Production
./docker-helper.sh prod         # Start production environment
./docker-helper.sh prod:build   # Rebuild and start production

# Management
./docker-helper.sh stop         # Stop all containers
./docker-helper.sh clean        # Remove all containers and volumes
./docker-helper.sh logs backend # View logs for specific service
./docker-helper.sh shell backend # Open shell in container
./docker-helper.sh test         # Run tests
./docker-helper.sh status       # Show container status

# Database
./docker-helper.sh migrate      # Run database population
./docker-helper.sh backup       # Backup MongoDB
./docker-helper.sh restore <file> # Restore MongoDB
```

## Architecture

### Services

1. **mongodb** - MongoDB database (port 27017 in dev)
2. **backend** - Node.js API server (port 5001)
3. **frontend** - React application with nginx (port 3001)
4. **nginx** - Reverse proxy (port 80/443 in production)
5. **redis** - Session storage (production only)
6. **mongo-express** - Database GUI (dev only, port 8081)

### Networks

- `boutique-network` - Internal Docker network for service communication

### Volumes

- `mongodb_data` - MongoDB data persistence
- `mongodb_config` - MongoDB configuration
- `redis_data` - Redis data (production)
- `nginx_logs` - Nginx logs (production)

## Development Setup

### Features
- Hot reload for both frontend and backend
- Source code mounted as volumes
- MongoDB Express for database management
- Node.js debugger on port 9229

### Workflow
1. Make code changes
2. Changes auto-reload in containers
3. Test at http://localhost:3001

### Debugging Backend
```bash
# Attach to Node.js debugger
docker-compose exec backend node --inspect-brk=0.0.0.0:9229 server.js
```

## Production Setup

### Features
- Multi-stage builds for optimized images
- Security hardening (non-root users)
- Resource limits
- Health checks
- Log rotation
- Redis for sessions
- Nginx reverse proxy

### Deployment
```bash
# Build and start production
./docker-helper.sh prod:build

# Scale backend for high traffic
./docker-helper.sh scale backend 3

# Monitor logs
./docker-helper.sh logs -f
```

### Security Considerations
1. Update all passwords in `.env`
2. Use strong JWT_SECRET (32+ characters)
3. Configure SSL certificates in nginx/ssl/
4. Set proper CORS origins
5. Enable firewall rules

## International Support

### Language Assets
All language files in `/client/src/i18n/locales/` are automatically included in the Docker image.

### Environment Variables
```env
DEFAULT_LANGUAGE=en
DEFAULT_CURRENCY=USD
SUPPORTED_LANGUAGES=en,es,fr,de,it,pt,zh,ja,ko,ar,he
SUPPORTED_CURRENCIES=USD,EUR,GBP,JPY,CNY,CAD,AUD,CHF,SEK,NOK,INR,BRL,MXN
```

### CDN Integration
For global performance, configure CDN in production:
```env
CDN_URL=https://cdn.your-domain.com
CDN_ENABLED=true
```

## Troubleshooting

### Container won't start
```bash
# Check logs
./docker-helper.sh logs backend

# Rebuild from scratch
./docker-helper.sh clean
./docker-helper.sh dev:build
```

### MongoDB connection issues
```bash
# Check MongoDB health
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Restart MongoDB
./docker-helper.sh restart mongodb
```

### Port conflicts
If ports are already in use, modify `docker-compose.yml`:
```yaml
ports:
  - "5002:5001"  # Change host port
```

### Performance issues
1. Increase Docker memory allocation
2. Use production mode for better performance
3. Enable BuildKit: `export DOCKER_BUILDKIT=1`

## Monitoring

### Health Checks
- Backend: http://localhost:5001/api/monitoring/health
- Frontend: http://localhost:3001/health
- MongoDB: Internal health check

### Logs
```bash
# All services
./docker-helper.sh logs

# Specific service with follow
./docker-helper.sh logs backend -f

# Production logs location
./logs/
```

## Backup & Restore

### Automated Backup
```bash
# Create backup
./docker-helper.sh backup

# Backups stored in ./backups/
```

### Manual Restore
```bash
# Restore from backup
./docker-helper.sh restore backups/mongodb_20240125_120000/backup.archive
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Build Docker images
  run: |
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml build
    
- name: Run tests
  run: |
    docker-compose run --rm backend npm test
```

## Next Steps

1. Configure nginx for SSL (see nginx/nginx.prod.conf)
2. Set up monitoring (Prometheus/Grafana)
3. Configure log aggregation (ELK stack)
4. Implement auto-scaling with Docker Swarm or Kubernetes