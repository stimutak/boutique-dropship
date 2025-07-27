// Simple CSRF token service that works with session-based CSRF
import axios from 'axios'

class CSRFService {
  constructor() {
    this.token = null
  }

  async getToken() {
    try {
      // Get token from session-based endpoint
      const response = await axios.get('/api/csrf-token', {
        withCredentials: true
      })
      this.token = response.data.csrfToken
      return this.token
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error)
      return null
    }
  }

  clearToken() {
    this.token = null
  }

  async fetchToken() {
    return this.getToken()
  }
}

export default new CSRFService()