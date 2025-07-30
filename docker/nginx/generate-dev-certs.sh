#!/bin/bash

# Generate self-signed SSL certificates for development
# Following CLAUDE.md: Keep it simple, use existing patterns

set -e

SSL_DIR="./ssl"
DAYS=365

echo "Generating self-signed SSL certificates for development..."

# Create SSL directory if it doesn't exist
mkdir -p "$SSL_DIR"

# Generate private key
openssl genrsa -out "$SSL_DIR/privkey.pem" 2048

# Generate certificate signing request
openssl req -new -key "$SSL_DIR/privkey.pem" -out "$SSL_DIR/csr.pem" -subj "/C=US/ST=Development/L=Local/O=International Boutique Store/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -days $DAYS -in "$SSL_DIR/csr.pem" -signkey "$SSL_DIR/privkey.pem" -out "$SSL_DIR/fullchain.pem"

# Copy fullchain as chain for compatibility
cp "$SSL_DIR/fullchain.pem" "$SSL_DIR/chain.pem"

# Generate Diffie-Hellman parameters (this may take a while)
echo "Generating Diffie-Hellman parameters (this may take a minute)..."
openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048

# Set proper permissions
chmod 644 "$SSL_DIR/fullchain.pem" "$SSL_DIR/chain.pem"
chmod 600 "$SSL_DIR/privkey.pem"
chmod 644 "$SSL_DIR/dhparam.pem"

# Clean up CSR
rm -f "$SSL_DIR/csr.pem"

echo "Development SSL certificates generated successfully!"
echo "Files created in $SSL_DIR:"
echo "  - privkey.pem (private key)"
echo "  - fullchain.pem (certificate)"
echo "  - chain.pem (certificate chain)"
echo "  - dhparam.pem (DH parameters)"
echo ""
echo "To use in development:"
echo "  docker-compose -f docker-compose.yml -f docker-compose.dev.yml up"