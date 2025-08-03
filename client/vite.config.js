import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js'
  }
})