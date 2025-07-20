# Deployment and Configuration Guide

## Overview

This guide covers deployment options, configuration, and operational procedures for the Holistic Dropship Store application.

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Local Development](#local-development)
3. [Production Deployment](#production-deployment)
4. [Docker Deployment](#docker-deployment)
5. [Cloud Deployment](#cloud-deployment)
6. [Configuration](#configuration)
7. [Database Setup](#database-setup)
8. [SSL/TLS Configuration](#ssltls-configuration)
9. [Monitoring and Logging](#monitoring-and-logging)
10. [Backup and Recovery](#backup-and-recovery)
11. [Troubleshooting](#troubleshooting)

## Environment Setup

### Prerequisites

- Node.js 18.x or higher
- MongoDB 6.0 or higher
- npm or yarn package manager
- Git

### System Requirements

**Minimum:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB
- Network: 100Mbps

**Recommended:**
- CPU: 4 cores
- RAM: 8GB
- Storage: 50GB SSD
- Network: 1Gbps

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/your-org/holistic-dropship-store.git
cd holistic-dropship-store
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Configure your `.env` file:

```env
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/holistic-store
MONGODB_TEST_URI=mongodb://localhost:27017/holistic-store-test

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Payment Processing (Mollie)
MOLLIE_API_KEY=test_your_mollie_test_key_here
MOLLIE_WEBHOOK_URL=http://localhost:3000/api/payments/webhook

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@holisticstore.com

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/combined.log
ERROR_LOG_FILE=./logs/error.log
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### 5. Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Production Deployment

### 1. Server Preparation

Update system packages:

```bash
sudo apt update && sudo apt upgrade -y
```

Install Node.js:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Install MongoDB:

```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
```

Install PM2 for process management:

```bash
sudo npm install -g pm2
```

### 2. Application Deployment

Clone and setup application:

```bash
cd /var/www
sudo git clone https://github.com/your-org/holistic-dropship-store.git
sudo chown -R $USER:$USER holistic-dropship-store
cd holistic-dropship-store
npm ci --production
```

### 3. Production Environment Configuration

Create production environment file:

```bash
sudo nano .env.production
```

```env
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://your-domain.com

# Database
MONGODB_URI=mongodb://localhost:27017/holistic-store-prod

# Authentication
JWT_SECRET=your-super-secure-production-jwt-secret
JWT_EXPIRES_IN=7d

# Payment Processing (Mollie)
MOLLIE_API_KEY=live_your_mollie_live_key_here
MOLLIE_WEBHOOK_URL=https://your-domain.com/api/payments/webhook

# Email Configuration
EMAIL_HOST=smtp.your-provider.com
EMAIL_PORT=587
EMAIL_SECURE=true
EMAIL_USER=noreply@your-domain.com
EMAIL_PASS=your-secure-email-password
EMAIL_FROM=noreply@your-domain.com

# CORS Configuration
ALLOWED_ORIGINS=https://your-domain.com,https://school.your-domain.com,https://travel.your-domain.com

# Security
HELMET_CSP_DIRECTIVES=default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=warn
LOG_FILE=/var/log/holistic-store/combined.log
ERROR_LOG_FILE=/var/log/holistic-store/error.log
```

### 4. Build Application

```bash
npm run build
```

### 5. PM2 Configuration

Create PM2 ecosystem file:

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'holistic-store',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: '/var/log/holistic-store/pm2.log',
    error_file: '/var/log/holistic-store/pm2-error.log',
    out_file: '/var/log/holistic-store/pm2-out.log',
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

Start application with PM2:

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## Docker Deployment

### 1. Dockerfile

```dockerfile
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /usr/src/app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start application
CMD ["node", "server.js"]
```

### 2. Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/holistic-store
    depends_on:
      - mongo
      - redis
    volumes:
      - ./uploads:/usr/src/app/uploads
      - ./logs:/usr/src/app/logs
    restart: unless-stopped

  mongo:
    image: mongo:6.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=secure_password
      - MONGO_INITDB_DATABASE=holistic-store
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    restart: unless-stopped

volumes:
  mongo_data:
  redis_data:
```

### 3. Deploy with Docker

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Scale application
docker-compose up -d --scale app=3
```

## Cloud Deployment

### AWS Deployment

#### 1. EC2 Instance Setup

Launch EC2 instance:
- Instance type: t3.medium or larger
- AMI: Ubuntu 22.04 LTS
- Security groups: HTTP (80), HTTPS (443), SSH (22)

#### 2. RDS MongoDB Setup

Create MongoDB Atlas cluster or use DocumentDB:

```bash
# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/holistic-store
```

#### 3. Application Load Balancer

Configure ALB for high availability:
- Target groups: EC2 instances running the application
- Health checks: `/health` endpoint
- SSL termination with ACM certificate

#### 4. CloudFront CDN

Setup CloudFront for static assets:
- Origin: S3 bucket for uploads and static files
- Behaviors: Cache static assets, forward API requests

### Heroku Deployment

#### 1. Heroku Setup

```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create holistic-store-app

# Add MongoDB addon
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-jwt-secret
heroku config:set MOLLIE_API_KEY=your-mollie-key
```

#### 2. Deploy

```bash
# Deploy to Heroku
git push heroku main

# Scale dynos
heroku ps:scale web=2

# View logs
heroku logs --tail
```

### DigitalOcean App Platform

#### 1. App Spec Configuration

```yaml
name: holistic-store
services:
- name: api
  source_dir: /
  github:
    repo: your-org/holistic-dropship-store
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 2
  instance_size_slug: basic-xxs
  env:
  - key: NODE_ENV
    value: production
  - key: MONGODB_URI
    value: ${db.CONNECTION_STRING}
  - key: JWT_SECRET
    value: ${JWT_SECRET}

databases:
- name: db
  engine: MONGODB
  version: "6"
  size: basic-xs
```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment (development/production) | Yes | development |
| `PORT` | Server port | No | 3000 |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `MOLLIE_API_KEY` | Mollie payment API key | Yes | - |
| `EMAIL_HOST` | SMTP host | Yes | - |
| `EMAIL_USER` | SMTP username | Yes | - |
| `EMAIL_PASS` | SMTP password | Yes | - |
| `ALLOWED_ORIGINS` | CORS allowed origins | No | * |

### Security Configuration

#### 1. SSL/TLS Setup

Generate SSL certificate:

```bash
# Using Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

#### 2. Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        alias /var/www/holistic-dropship-store/uploads;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Database Setup

### MongoDB Configuration

#### 1. Production MongoDB Setup

```bash
# Create database user
mongo
use holistic-store
db.createUser({
  user: "storeapp",
  pwd: "secure_password",
  roles: [
    { role: "readWrite", db: "holistic-store" }
  ]
})
```

#### 2. Database Indexes

```javascript
// Create indexes for performance
db.products.createIndex({ "slug": 1 }, { unique: true })
db.products.createIndex({ "category": 1 })
db.products.createIndex({ "properties.chakra": 1 })
db.products.createIndex({ "properties.element": 1 })
db.products.createIndex({ "tags": 1 })
db.products.createIndex({ "name": "text", "description": "text" })

db.orders.createIndex({ "customer": 1 })
db.orders.createIndex({ "orderNumber": 1 }, { unique: true })
db.orders.createIndex({ "status": 1 })
db.orders.createIndex({ "createdAt": -1 })

db.users.createIndex({ "email": 1 }, { unique: true })
```

#### 3. Database Backup

```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/mongodb"
mkdir -p $BACKUP_DIR

mongodump --host localhost --port 27017 --db holistic-store --out $BACKUP_DIR/backup_$DATE

# Compress backup
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $BACKUP_DIR backup_$DATE
rm -rf $BACKUP_DIR/backup_$DATE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "backup_*.tar.gz" -mtime +7 -delete
```

## Monitoring and Logging

### 1. Application Monitoring

Install monitoring tools:

```bash
npm install --save express-prometheus-middleware
```

Add monitoring middleware:

```javascript
const promMid = require('express-prometheus-middleware');

app.use(promMid({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5]
}));
```

### 2. Log Management

Configure Winston logging:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

### 3. Health Checks

Create health check endpoint:

```javascript
// healthcheck.js
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  method: 'GET',
  timeout: 2000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => {
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();
```

## Backup and Recovery

### 1. Automated Backup Script

```bash
#!/bin/bash
# backup.sh

set -e

# Configuration
BACKUP_DIR="/var/backups/holistic-store"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
echo "Starting database backup..."
mongodump --uri="$MONGODB_URI" --out $BACKUP_DIR/db_$DATE

# Application files backup
echo "Starting application backup..."
tar -czf $BACKUP_DIR/app_$DATE.tar.gz \
  --exclude=node_modules \
  --exclude=logs \
  --exclude=.git \
  /var/www/holistic-dropship-store

# Uploads backup
echo "Starting uploads backup..."
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz \
  /var/www/holistic-dropship-store/uploads

# Cleanup old backups
echo "Cleaning up old backups..."
find $BACKUP_DIR -name "*_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "db_*" -mtime +$RETENTION_DAYS -exec rm -rf {} \;

echo "Backup completed successfully"
```

### 2. Recovery Procedures

```bash
#!/bin/bash
# restore.sh

BACKUP_DATE=$1
BACKUP_DIR="/var/backups/holistic-store"

if [ -z "$BACKUP_DATE" ]; then
  echo "Usage: $0 <backup_date>"
  echo "Available backups:"
  ls -la $BACKUP_DIR | grep db_
  exit 1
fi

# Stop application
pm2 stop holistic-store

# Restore database
echo "Restoring database..."
mongorestore --uri="$MONGODB_URI" --drop $BACKUP_DIR/db_$BACKUP_DATE/holistic-store

# Restore uploads
echo "Restoring uploads..."
tar -xzf $BACKUP_DIR/uploads_$BACKUP_DATE.tar.gz -C /

# Start application
pm2 start holistic-store

echo "Restore completed successfully"
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start

Check logs:
```bash
pm2 logs holistic-store
tail -f /var/log/holistic-store/error.log
```

Common causes:
- Missing environment variables
- Database connection issues
- Port already in use
- Permission issues

#### 2. Database Connection Issues

Test MongoDB connection:
```bash
mongosh "$MONGODB_URI"
```

Check MongoDB status:
```bash
sudo systemctl status mongod
```

#### 3. Payment Processing Issues

Verify Mollie configuration:
- Check API key validity
- Verify webhook URL accessibility
- Test with Mollie test mode

#### 4. Email Delivery Issues

Test SMTP connection:
```bash
telnet smtp.your-provider.com 587
```

Check email logs:
```bash
grep -i "email" /var/log/holistic-store/combined.log
```

### Performance Issues

#### 1. High Memory Usage

Monitor memory:
```bash
pm2 monit
htop
```

Optimize Node.js memory:
```bash
pm2 start ecosystem.config.js --node-args="--max-old-space-size=2048"
```

#### 2. Slow Database Queries

Enable MongoDB profiling:
```javascript
db.setProfilingLevel(2, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(5)
```

#### 3. High CPU Usage

Check PM2 cluster mode:
```bash
pm2 start ecosystem.config.js --instances max
```

### Security Issues

#### 1. SSL Certificate Renewal

Automate with cron:
```bash
0 12 * * * /usr/bin/certbot renew --quiet
```

#### 2. Security Headers

Verify security headers:
```bash
curl -I https://your-domain.com
```

#### 3. Rate Limiting

Monitor rate limiting:
```bash
grep "rate limit" /var/log/nginx/error.log
```

## Maintenance

### Regular Maintenance Tasks

1. **Weekly:**
   - Review application logs
   - Check disk space usage
   - Verify backup integrity
   - Update dependencies (security patches)

2. **Monthly:**
   - Review performance metrics
   - Update SSL certificates if needed
   - Clean up old log files
   - Database maintenance (reindex, compact)

3. **Quarterly:**
   - Security audit
   - Performance optimization review
   - Disaster recovery testing
   - Documentation updates

### Maintenance Scripts

Create maintenance cron jobs:

```bash
# /etc/cron.d/holistic-store

# Daily backup at 2 AM
0 2 * * * root /var/www/holistic-dropship-store/scripts/backup.sh

# Weekly log rotation at 3 AM Sunday
0 3 * * 0 root /usr/sbin/logrotate /etc/logrotate.d/holistic-store

# Monthly cleanup at 4 AM on 1st
0 4 1 * * root /var/www/holistic-dropship-store/scripts/cleanup.sh
```

## Support and Documentation

- **Application Logs**: `/var/log/holistic-store/`
- **PM2 Logs**: `pm2 logs`
- **System Logs**: `/var/log/syslog`
- **Nginx Logs**: `/var/log/nginx/`
- **MongoDB Logs**: `/var/log/mongodb/`

For additional support:
- Check the troubleshooting section
- Review application logs
- Contact the development team
- Refer to the API documentation