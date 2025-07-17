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

// Request interceptor to add auth token and CSRF token
api.interceptors.request.use(
  async (config) => {
    // Add auth token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add CSRF token for state-changing requests
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      try {
        // Import here to avoid circular dependency
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
      // Clear token and redirect to login
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api