import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: '', // Always use relative URLs in production for nginx proxy
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Important for CSRF tokens and sessions
});

// Request interceptor to add CSRF token and guest session ID
api.interceptors.request.use(
  async (config) => {
    // JWT is now sent automatically via httpOnly cookies
    // No need to manually add Authorization header
    
    // Add locale header for currency support
    const locale = localStorage.getItem('i18nextLng') || 'en';
    config.headers['x-locale'] = locale;
    
    // Add guest session ID for cart operations (when not authenticated)
    // Check both cookie-based auth and localStorage during migration
    const guestSessionId = window.sessionStorage?.getItem('guestSessionId');
    if (guestSessionId && !config.headers.Authorization) {
      config.headers['x-guest-session-id'] = guestSessionId;
    }
    
    // Add CSRF token for state-changing requests
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      try {
        const { default: csrfService } = await import('../services/csrf.js');
        const csrfToken = await csrfService.getToken();
        if (csrfToken) {
          config.headers['x-csrf-token'] = csrfToken;
        }
      } catch (error) {
        console.warn('Failed to get CSRF token:', error);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.error?.code;
      
      // Only redirect to login for specific authentication errors
      // Don't redirect for optional authentication routes
      if (errorCode === 'TOKEN_EXPIRED' || errorCode === 'INVALID_TOKEN' || errorCode === 'NO_TOKEN') {
        // Redirect to login for authentication errors
        // Cookies will be cleared by the server
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;