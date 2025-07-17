import api from '../api/config'

class CSRFService {
  constructor() {
    this.token = null
  }

  async getToken() {
    if (!this.token) {
      await this.fetchToken()
    }
    return this.token
  }

  async fetchToken() {
    try {
      const response = await api.get('/api/csrf-token')
      this.token = response.data.csrfToken
      return this.token
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error)
      throw error
    }
  }

  clearToken() {
    this.token = null
  }
}

export default new CSRFService()