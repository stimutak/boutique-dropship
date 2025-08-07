#!/bin/bash

# DreamHost Deployment Script for Boutique E-commerce
# =====================================================

echo "🚀 Starting DreamHost Deployment Process..."

# Configuration
DREAMHOST_USER="your_username"
DREAMHOST_SERVER="your_server.dreamhost.com"
DREAMHOST_PATH="/home/$DREAMHOST_USER/your-domain.com"
LOCAL_BUILD_DIR="./dist"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build the frontend
echo -e "${YELLOW}Building frontend...${NC}"
cd client
npm ci --production=false
npm run build
cd ..

# Step 2: Prepare deployment package
echo -e "${YELLOW}Preparing deployment package...${NC}"
rm -rf deploy-package
mkdir -p deploy-package

# Copy backend files
cp -r models routes middleware utils deploy-package/
cp server.js package.json package-lock.json .env.production deploy-package/
cp -r public deploy-package/

# Copy built frontend to public directory
mkdir -p deploy-package/public
cp -r client/dist/* deploy-package/public/

# Create app.js for Passenger (DreamHost requirement)
cat > deploy-package/app.js << 'EOF'
// DreamHost Passenger entry point
const app = require('./server.js');
const PORT = process.env.PORT || 3000;

if (typeof(PhusionPassenger) !== 'undefined') {
    PhusionPassenger.configure({ autoInstall: false });
    app.listen('passenger');
} else {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
EOF

# Create .htaccess for proper routing
cat > deploy-package/public/.htaccess << 'EOF'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Handle API routes
  RewriteCond %{REQUEST_URI} ^/api
  RewriteRule ^api/(.*)$ http://127.0.0.1:3000/api/$1 [P,L]
  
  # Handle React Router
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "DENY"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/plain
  AddOutputFilterByType DEFLATE text/html
  AddOutputFilterByType DEFLATE text/xml
  AddOutputFilterByType DEFLATE text/css
  AddOutputFilterByType DEFLATE application/xml
  AddOutputFilterByType DEFLATE application/xhtml+xml
  AddOutputFilterByType DEFLATE application/rss+xml
  AddOutputFilterByType DEFLATE application/javascript
  AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Cache control
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/pdf "access plus 1 month"
  ExpiresByType text/x-javascript "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType application/x-shockwave-flash "access plus 1 month"
  ExpiresByType image/x-icon "access plus 1 year"
  ExpiresDefault "access plus 2 days"
</IfModule>
EOF

# Step 3: Create deployment archive
echo -e "${YELLOW}Creating deployment archive...${NC}"
tar -czf boutique-deploy.tar.gz deploy-package/

# Step 4: Upload to DreamHost
echo -e "${YELLOW}Uploading to DreamHost...${NC}"
scp boutique-deploy.tar.gz $DREAMHOST_USER@$DREAMHOST_SERVER:~/

# Step 5: Deploy on server
echo -e "${YELLOW}Deploying on server...${NC}"
ssh $DREAMHOST_USER@$DREAMHOST_SERVER << 'ENDSSH'
  cd ~/
  
  # Backup existing deployment
  if [ -d "$DREAMHOST_PATH" ]; then
    mv $DREAMHOST_PATH $DREAMHOST_PATH.backup.$(date +%Y%m%d_%H%M%S)
  fi
  
  # Extract new deployment
  tar -xzf boutique-deploy.tar.gz
  mv deploy-package $DREAMHOST_PATH
  
  # Install dependencies
  cd $DREAMHOST_PATH
  npm ci --production
  
  # Restart Passenger
  touch tmp/restart.txt
  
  echo "✅ Deployment complete!"
ENDSSH

echo -e "${GREEN}✨ Deployment successful!${NC}"
echo -e "${GREEN}Visit your site to verify everything is working.${NC}"