import axios from 'axios'

// Create axios instance with base URL
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '', // Use empty string to use relative URLs and proxy
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for CSRF tokens and sessions
})

// Request interceptor to add auth token, CSRF token, and guest session ID
api.interceptors.request.use(
  async (config) => {
    // JWT Migration: Token now sent via httpOnly cookie
    // Keeping localStorage check for backward compatibility during migration
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add guest session ID for cart operations (when not authenticated)
    // Check both cookie-based auth and localStorage during migration
    const guestSessionId = window.sessionStorage?.getItem('guestSessionId')
    if (guestSessionId && !config.headers.Authorization) {
      config.headers['x-guest-session-id'] = guestSessionId
    }
    
    // Add CSRF token for state-changing requests
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      try {
        const { default: csrfService } = await import('../services/csrf.js')
        const csrfToken = await csrfService.getToken()
        if (csrfToken) {
          config.headers['x-csrf-token'] = csrfToken
        }
      } catch (error) {
        console.warn('Failed to get CSRF token:', error)
      }
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.error?.code
      
      // Only redirect to login for specific authentication errors
      // Don't redirect for optional authentication routes
      if (errorCode === 'TOKEN_EXPIRED' || errorCode === 'INVALID_TOKEN' || errorCode === 'NO_TOKEN') {
        // Clear token and redirect to login only if user was previously authenticated
        const wasAuthenticated = localStorage.getItem('token')
        if (wasAuthenticated) {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api