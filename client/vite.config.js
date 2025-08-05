import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: true, // Listen on all addresses for Docker
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://backend:5001',
        changeOrigin: true,
        secure: false
      },
      '/images': {
        target: process.env.VITE_API_URL || 'http://backend:5001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          'ui-vendor': ['react-i18next', 'i18next', 'i18next-browser-languagedetector', 'i18next-http-backend'],
          
          // Admin chunk (heaviest section)
          'admin': [
            './src/pages/admin/AdminDashboard.jsx',
            './src/pages/admin/AdminProducts.jsx',
            './src/pages/admin/AdminOrders.jsx',
            './src/pages/admin/AdminUsers.jsx',
            './src/pages/admin/AdminSettings.jsx',
            './src/components/admin/AdminReviews.jsx'
          ],
          
          // Auth chunk
          'auth': [
            './src/pages/Login.jsx',
            './src/pages/Register.jsx',
            './src/pages/ForgotPassword.jsx',
            './src/pages/ResetPassword.jsx'
          ],
          
          // Commerce chunk
          'commerce': [
            './src/pages/Products.jsx',
            './src/pages/ProductDetail.jsx',
            './src/pages/Cart.jsx',
            './src/pages/Checkout.jsx',
            './src/pages/Payment.jsx'
          ]
        }
      }
    },
    // Enable source maps for better debugging
    sourcemap: process.env.NODE_ENV === 'development',
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js'
  }
});