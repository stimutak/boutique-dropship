# Nginx Configuration for International Boutique Store

This directory contains nginx configurations optimized for an international e-commerce platform supporting 10+ languages and 20+ currencies.

## Configuration Files

- **nginx.conf** - Base configuration with international support
- **nginx.dev.conf** - Development overrides with relaxed security
- **nginx.prod.conf** - Production configuration with full security and caching
- **ssl.conf** - SSL/TLS configuration for strong security
- **security.conf** - Security headers for e-commerce protection

## Features

### International Support
- Full UTF-8 support for all languages
- Proper handling of Unicode URLs
- Support for RTL languages
- Multi-domain configuration for international TLDs

### Performance Optimizations
- Gzip compression for all text-based assets
- Static file caching with CDN-friendly headers
- API response caching (respects auth)
- Connection pooling and keep-alive
- Rate limiting to prevent abuse

### Security
- TLS 1.2/1.3 only with modern cipher suites
- HSTS, CSP, and other security headers
- Rate limiting on auth endpoints
- CORS properly configured for API
- Hidden file protection

### High Availability
- Health check endpoints
- Graceful error pages
- WebSocket support for real-time features
- Upstream health monitoring
- Auto-retry failed backends

## Quick Start

### Development
```bash
# Generate self-signed certificates
./generate-dev-certs.sh

# Start with development configuration
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Production
```bash
# Ensure SSL certificates are in place (see ssl/README_SSL.txt)
# Start with production configuration
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Directory Structure
```
docker/nginx/
├── nginx.conf          # Base configuration
├── nginx.dev.conf      # Development config
├── nginx.prod.conf     # Production config
├── ssl.conf           # SSL settings
├── security.conf      # Security headers
├── generate-dev-certs.sh  # Dev SSL generator
├── html/
│   ├── 404.html      # Custom 404 page
│   └── 50x.html      # Custom error page
└── ssl/
    ├── README_SSL.txt # SSL setup guide
    ├── fullchain.pem  # Certificate chain
    ├── privkey.pem    # Private key
    ├── chain.pem      # Intermediate certs
    └── dhparam.pem    # DH parameters
```

## Configuration Details

### Rate Limiting
- API endpoints: 30 requests/second
- Auth endpoints: 5 requests/second  
- Static files: 100 requests/second

### Caching Strategy
- Static assets: 7 days
- API responses: 5 minutes (auth-aware)
- Product images: 30 days

### Upload Limits
- Maximum file size: 50MB (for product images)
- Body buffer size: 128KB

## Monitoring

Access nginx status:
```
# Development only
curl http://localhost/nginx-status
```

View logs:
```
docker-compose logs nginx
docker exec boutique-nginx tail -f /var/log/nginx/access.log
```

## SSL Certificate Management

See `ssl/README_SSL.txt` for detailed SSL setup instructions including:
- Let's Encrypt production certificates
- Self-signed development certificates
- Auto-renewal configuration

## Troubleshooting

### 502 Bad Gateway
- Check if backend/frontend services are running
- Verify upstream hostnames in configuration
- Check Docker network connectivity

### SSL Errors
- Ensure certificates are properly mounted
- Verify certificate permissions (644 for certs, 600 for keys)
- Check certificate expiration dates

### Performance Issues
- Monitor cache hit rates in logs
- Adjust worker processes/connections
- Check rate limiting thresholds

## Security Considerations

- Private keys are excluded from git via .gitignore
- Use strong passwords for any basic auth
- Regularly update nginx image
- Monitor access logs for suspicious activity
- Keep SSL certificates up to date