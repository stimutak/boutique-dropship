# DreamHost Deployment Guide for Boutique E-commerce

## Prerequisites

1. **DreamHost Account** with:
   - Shared hosting with Node.js support OR
   - VPS hosting (recommended for e-commerce)
   
2. **MongoDB Atlas Account** (free tier works):
   - Sign up at https://www.mongodb.com/cloud/atlas
   - Create a cluster
   - Get your connection string

3. **Mollie Account** for payments:
   - Sign up at https://www.mollie.com
   - Get your live API key

## Step-by-Step DreamHost Setup

### 1. DreamHost Control Panel Configuration

#### A. Enable Node.js/Passenger
1. Log into [DreamHost Panel](https://panel.dreamhost.com)
2. Navigate to **Domains → Manage Domains**
3. Click **Edit** next to your domain
4. Under **Web Options**:
   - Enable **Passenger (Node.js/Ruby/Python apps)**
   - Set **Node.js version** to 18.x or higher
   - Set **Environment** to "Production"
   - **Web Directory**: `/public`
   - **Application Root**: `/`

#### B. Create Database User (for session storage)
1. Go to **MySQL Databases**
2. Create a new database (optional, we're using MongoDB)
3. Note the hostname (usually mysql.yourdomain.com)

#### C. Set up SSL Certificate
1. Go to **Domains → SSL/TLS Certificates**
2. Enable **Let's Encrypt** (free SSL)
3. Wait for certificate to be issued (usually within minutes)

### 2. Prepare Your Application Locally

```bash
# 1. Update configuration
cp .env.production .env.production.local
# Edit .env.production.local with your actual values:
# - MongoDB Atlas connection string
# - Mollie live API key
# - Your domain name
# - Email credentials

# 2. Build the application
npm run build:production

# 3. Test locally with production build
NODE_ENV=production node server.production.js
```

### 3. Upload Files to DreamHost

#### Option A: Using SSH/SFTP (Recommended)

```bash
# 1. Connect via SSH
ssh username@server.dreamhost.com

# 2. Navigate to your domain directory
cd ~/yourdomain.com

# 3. Upload files using rsync (from local machine)
rsync -avz --exclude node_modules --exclude .git \
  /path/to/boutique/ username@server.dreamhost.com:~/yourdomain.com/
```

#### Option B: Using DreamHost File Manager
1. Go to **Files → File Manager** in DreamHost panel
2. Navigate to your domain folder
3. Upload the following:
   - All backend files (models, routes, middleware, utils)
   - `server.production.js` (rename to `app.js`)
   - `package.json` and `package-lock.json`
   - `.env.production` (rename to `.env`)
   - `public/` folder with built React app

### 4. Install Dependencies on Server

```bash
# SSH into your server
ssh username@server.dreamhost.com

# Navigate to your app
cd ~/yourdomain.com

# Install production dependencies
npm ci --production

# Create required directories
mkdir -p logs public/uploads public/images/products tmp

# Set permissions
chmod 755 public/uploads
chmod 755 public/images/products
chmod 755 logs
```

### 5. Configure Passenger

Create `~/yourdomain.com/passenger_wsgi.py`:
```python
#!/usr/bin/env python
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

# This is just a placeholder for Passenger
```

Create `~/yourdomain.com/tmp/restart.txt`:
```bash
touch ~/yourdomain.com/tmp/restart.txt
```

### 6. Environment Variables Setup

DreamHost doesn't support `.env` files directly with Passenger. Set them in the panel:

1. Go to **Domains → Manage Domains**
2. Click **Edit** on your domain
3. Under **Environment Variables**, add:
   ```
   NODE_ENV=production
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   SESSION_SECRET=your_session_secret
   MOLLIE_API_KEY=your_mollie_key
   ```

### 7. Configure Cron Jobs

Add these cron jobs in DreamHost panel (**Advanced → Cron Jobs**):

```bash
# Clean up old sessions (daily at 2 AM)
0 2 * * * cd /home/username/yourdomain.com && node scripts/cleanup-sessions.js

# Backup database (weekly)
0 3 * * 0 cd /home/username/yourdomain.com && node scripts/backup-database.js
```

### 8. Testing Your Deployment

1. **Check Application Health**:
   ```
   https://yourdomain.com/api/health
   ```

2. **Check Logs**:
   ```bash
   ssh username@server.dreamhost.com
   cd ~/yourdomain.com
   tail -f logs/production.log
   ```

3. **Restart Application**:
   ```bash
   touch ~/yourdomain.com/tmp/restart.txt
   ```

## MongoDB Atlas Setup

1. **Create Cluster**:
   - Choose free tier (M0)
   - Select a region close to DreamHost servers (US West recommended)

2. **Configure Access**:
   - Add DreamHost IP to whitelist (or allow from anywhere: 0.0.0.0/0)
   - Create database user with read/write permissions

3. **Get Connection String**:
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your actual password

## Troubleshooting

### Application Won't Start
- Check `~/yourdomain.com/logs/passenger.log`
- Verify Node.js version: `node --version`
- Check environment variables are set

### Database Connection Issues
- Verify MongoDB Atlas whitelist includes DreamHost IP
- Test connection: `node -e "require('mongoose').connect('your-connection-string')"`

### 500 Errors
- Check file permissions: `ls -la ~/yourdomain.com/`
- Verify all dependencies installed: `npm ls`
- Check error logs: `tail -f ~/yourdomain.com/logs/error.log`

### Static Files Not Loading
- Verify public directory structure
- Check .htaccess file in public folder
- Clear browser cache

## Performance Optimization

1. **Enable Cloudflare** (free):
   - Sign up at cloudflare.com
   - Point your domain to Cloudflare
   - Enable caching and minification

2. **Enable DreamHost Caching**:
   - In panel: **Domains → Manage Domains → Edit**
   - Enable **Extra Web Security**
   - Enable **PageSpeed Optimization**

3. **Database Indexes**:
   Already configured in the application

## Security Checklist

- [ ] SSL certificate active
- [ ] Environment variables set (not in code)
- [ ] MongoDB Atlas IP whitelist configured
- [ ] File permissions set correctly (755 for directories, 644 for files)
- [ ] Admin account password changed
- [ ] Rate limiting enabled
- [ ] CORS configured for your domain only

## Support

- **DreamHost Support**: https://help.dreamhost.com
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com
- **Application Issues**: Check `CLAUDE.md` for codebase guidance

## Quick Commands Reference

```bash
# SSH to server
ssh username@server.dreamhost.com

# Navigate to app
cd ~/yourdomain.com

# View logs
tail -f logs/production.log

# Restart app
touch tmp/restart.txt

# Check Node version
node --version

# Check app status
curl https://yourdomain.com/api/health

# Update code
git pull origin main
npm ci --production
npm run build:production
touch tmp/restart.txt
```