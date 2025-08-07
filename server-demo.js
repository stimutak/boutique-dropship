/**
 * Simplified Demo Server for DreamHost Shared Hosting
 * Just enough to show the site working
 */

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');

// Load environment variables
require('dotenv').config();

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// MongoDB connection (simplified)
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.log('❌ MongoDB connection error:', err));
} else {
  console.log('⚠️  No MongoDB URI provided - running without database');
}

// Import only essential routes
try {
  const authRoutes = require('./routes/auth');
  const productRoutes = require('./routes/products');
  const cartRoutes = require('./routes/cart');
  
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/cart', cartRoutes);
} catch (error) {
  console.log('⚠️  Some routes not loaded:', error.message);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'running',
    mode: 'demo',
    timestamp: new Date().toISOString()
  });
});

// Demo data endpoint (in case MongoDB isn't connected)
app.get('/api/demo/products', (req, res) => {
  res.json({
    products: [
      {
        _id: '1',
        name: 'Rose Quartz Crystal',
        price: 24.99,
        category: 'crystals',
        description: 'Beautiful rose quartz for love and healing',
        images: [{ url: '/images/demo/crystal1.jpg' }],
        inStock: true
      },
      {
        _id: '2',
        name: 'Lavender Essential Oil',
        price: 18.99,
        category: 'oils',
        description: 'Pure lavender oil for relaxation',
        images: [{ url: '/images/demo/oil1.jpg' }],
        inStock: true
      },
      {
        _id: '3',
        name: 'Meditation Cushion',
        price: 45.99,
        category: 'accessories',
        description: 'Comfortable cushion for meditation practice',
        images: [{ url: '/images/demo/cushion1.jpg' }],
        inStock: true
      }
    ]
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// For DreamHost Passenger
if (typeof(PhusionPassenger) !== 'undefined') {
  app.listen('passenger');
  console.log('🚀 Demo server started with Passenger');
} else {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Demo server running on port ${PORT}`);
  });
}

module.exports = app;