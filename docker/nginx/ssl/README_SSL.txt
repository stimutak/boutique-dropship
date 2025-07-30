# SSL Certificate Setup for International Boutique Store

## Let's Encrypt SSL Certificates (Production)

1. Generate certificates using Certbot:
```bash
docker run -it --rm \
  -v /Users/oliver/Projects/boutique/docker/nginx/ssl:/etc/letsencrypt \
  -v /Users/oliver/Projects/boutique/docker/nginx/html:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@boutique.international \
  --agree-tos \
  --no-eff-email \
  -d boutique.international \
  -d www.boutique.international \
  -d boutique.fr \
  -d boutique.de \
  -d boutique.es \
  -d boutique.jp \
  -d boutique.cn
```

2. Set up auto-renewal with cron:
```bash
0 0 * * 0 docker run --rm -v /Users/oliver/Projects/boutique/docker/nginx/ssl:/etc/letsencrypt -v /Users/oliver/Projects/boutique/docker/nginx/html:/var/www/certbot certbot/certbot renew --quiet && docker-compose exec nginx nginx -s reload
```

## Self-Signed Certificates (Development)

1. Generate a self-signed certificate:
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=International Boutique/CN=localhost"
```

2. Generate Diffie-Hellman parameters:
```bash
openssl dhparam -out dhparam.pem 2048
```

## Certificate Files Required

- fullchain.pem - Full certificate chain
- privkey.pem - Private key
- chain.pem - Intermediate certificates only
- dhparam.pem - Diffie-Hellman parameters

## Important Notes

- Keep private keys secure and never commit to git
- Set proper file permissions: 644 for certificates, 600 for private keys
- Certificates must support all international domains
- Monitor expiration dates and renew before expiry