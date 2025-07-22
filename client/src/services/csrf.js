// We'll use axios directly to avoid circular dependency
import axios from 'axios'

class CSRFService {
  constructor() {
    this.token = null
    this.tokenTimestamp = null
    this.TOKEN_CACHE_DURATION = 5000 // 5 seconds - short cache to avoid stale tokens
  }

  async getToken() {
    // Check if we have a recent token (within 5 seconds)
    const now = Date.now()
    if (this.token && this.tokenTimestamp && (now - this.tokenTimestamp) < this.TOKEN_CACHE_DURATION) {
      return this.token
    }
    
    // Otherwise fetch a fresh token
    await this.fetchToken()
    return this.token
  }

  async fetchToken() {
    try {
      const response = await axios.get('/api/csrf-token', {
        withCredentials: true
      })
      this.token = response.data.csrfToken
      this.tokenTimestamp = Date.now()
      return this.token
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error)
      throw error
    }
  }

  clearToken() {
    this.token = null
    this.tokenTimestamp = null
  }
}

export default new CSRFService()