// Simple CSRF token service that works with session-based CSRF
import axios from 'axios';

// Create a separate axios instance without interceptors to avoid circular dependency
// This instance is only used for fetching CSRF tokens
const csrfAxios = axios.create({
  baseURL: '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true // Important for CSRF tokens and sessions
});

class CSRFService {
  constructor() {
    this.token = null;
  }

  async getToken() {
    // Return cached token if available
    if (this.token) {
      return this.token;
    }
    
    try {
      // Auth is handled via httpOnly cookies automatically
      const response = await csrfAxios.get('/api/csrf-token');
      this.token = response.data.csrfToken;
      return this.token;
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
      return null;
    }
  }

  clearToken() {
    this.token = null;
  }

  async fetchToken() {
    return this.getToken();
  }
}

export default new CSRFService();