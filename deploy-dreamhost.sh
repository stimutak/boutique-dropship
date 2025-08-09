#!/bin/bash

# DreamHost Static Deployment Script
# This deploys only the React frontend to DreamHost shared hosting

echo "🚀 Starting DreamHost deployment..."

# Configuration
DREAMHOST_USER="your_username"
DREAMHOST_SERVER="server.dreamhost.com"
DREAMHOST_PATH="~/yourdomain.com"
API_URL="https://your-app.onrender.com"

# Step 1: Build the frontend with production API URL
echo "📦 Building frontend..."
cd client
npm install
VITE_API_URL=$API_URL npm run build

# Step 2: Prepare deployment directory
echo "📁 Preparing files..."
cd ..
rm -rf deploy-temp
mkdir deploy-temp
cp -r client/dist/* deploy-temp/

# Step 3: Create .htaccess for SPA routing
cat > deploy-temp/.htaccess << 'EOF'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-Content-Type-Options "nosniff"
  Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Enable compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
EOF

# Step 4: Upload to DreamHost
echo "📤 Uploading to DreamHost..."
rsync -avz --delete deploy-temp/ $DREAMHOST_USER@$DREAMHOST_SERVER:$DREAMHOST_PATH/

# Step 5: Cleanup
rm -rf deploy-temp

echo "✅ Deployment complete!"
echo "🌐 Your site should be live at your domain"
echo "📝 Note: Backend API is hosted on Render.com"