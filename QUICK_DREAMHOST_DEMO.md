# Quick Demo Deployment to DreamHost (Shared Hosting)

## Purpose: Show Progress/Demo Only

### Step 1: Get Free MongoDB Atlas
1. Go to https://mongodb.com/cloud/atlas
2. Sign up for free account
3. Create free M0 cluster
4. In "Network Access" → Add IP: `0.0.0.0/0` (allows all - fine for demo)
5. In "Database Access" → Create user with password
6. In "Connect" → Get your connection string:
   ```
   mongodb+srv://username:password@cluster.mongodb.net/boutique?retryWrites=true&w=majority
   ```

### Step 2: Prepare Files Locally

```bash
# 1. Build the frontend
cd client
npm install
npm run build
cd ..

# 2. Create a simple demo server file
```

Create `server-demo.js`:
```javascript
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI || 'your-mongodb-atlas-url-here');

// Import existing routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
```

### Step 3: Upload to DreamHost

#### Via FTP (FileZilla or DreamHost File Manager):

1. Connect to your DreamHost account
2. Navigate to: `~/yourdomain.com/`
3. Upload these folders/files:
   ```
   models/          (all MongoDB models)
   routes/          (all API routes)  
   middleware/      (auth middleware)
   utils/           (utilities)
   public/          (copy client/dist/* here)
   package.json
   package-lock.json
   server-demo.js   (rename to app.js)
   ```

4. Create `.env` file in DreamHost:
   ```
   NODE_ENV=production
   MONGODB_URI=your_mongodb_atlas_connection_string
   JWT_SECRET=any-long-random-string-for-demo
   SESSION_SECRET=another-long-random-string
   ```

### Step 4: Install Dependencies via SSH

```bash
# SSH into DreamHost
ssh username@server.dreamhost.com

# Go to your domain folder
cd ~/yourdomain.com

# Install dependencies
npm install --production

# Create required folders
mkdir -p tmp public/uploads public/images/products

# Restart Passenger
touch tmp/restart.txt
```

### Step 5: DreamHost Panel Settings

1. Go to **Manage Domains**
2. Click **Edit** on your domain
3. Under **Web Options**:
   - Enable **Passenger**
   - Node.js version: **18.x**
   - App root: `/`
   - Public directory: `/public`
   - App startup file: `app.js`

### What Will Work:
✅ Homepage display  
✅ Product browsing  
✅ User registration/login  
✅ Basic cart functionality  
✅ Viewing products  

### What Won't Work (Demo Limitations):
❌ Payment processing (needs Mollie setup)  
❌ Email notifications (needs email config)  
❌ Image uploads (needs proper file permissions)  
❌ Admin features (needs full setup)  

### Test Your Demo:
```
https://yourdomain.com
https://yourdomain.com/api/health
```

### Quick Troubleshooting:

**Site shows 500 error:**
- Check: `~/yourdomain.com/logs/error.log`
- Fix: Make sure MongoDB Atlas allows connections from anywhere

**Can't connect to database:**
- Make sure MongoDB Atlas connection string is correct in .env
- Whitelist IP `0.0.0.0/0` in Atlas

**Styles look broken:**
- Clear browser cache
- Check public folder has all files from client/dist

### To Update the Demo:
```bash
# Locally
cd client && npm run build

# Upload new public folder via FTP

# On server
ssh username@server.dreamhost.com
cd ~/yourdomain.com
touch tmp/restart.txt
```

## Done! 🎉

This gives you a working demo to show progress. The site will load, show products, and demonstrate basic functionality. Perfect for showing stakeholders or getting feedback!