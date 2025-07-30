require('dotenv').config();
const axios = require('axios');

async function testProfileUpdate() {
  const baseURL = 'http://localhost:5001';
  
  // Create axios instance with cookie jar
  const axiosInstance = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  // Store cookies manually
  let cookies = '';
  
  // Intercept responses to capture cookies
  axiosInstance.interceptors.response.use(
    (response) => {
      if (response.headers['set-cookie']) {
        cookies = response.headers['set-cookie'].join('; ');
      }
      return response;
    },
    (error) => Promise.reject(error)
  );
  
  // Add cookies to requests
  axiosInstance.interceptors.request.use(
    (config) => {
      if (cookies) {
        config.headers['Cookie'] = cookies;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
  
  try {
    // 1. Login first
    console.log('1. Logging in...');
    const loginResponse = await axiosInstance.post('/api/auth/login', {
      email: 'john@example.com',
      password: 'Password123!'
    });
    
    const token = loginResponse.data.data.token;
    console.log('Login successful, token:', token ? 'received' : 'missing');
    console.log('Session cookie:', cookies.includes('holistic.sid') ? 'set' : 'missing');
    
    // 2. Get CSRF token
    console.log('\n2. Getting CSRF token...');
    const csrfResponse = await axiosInstance.get('/api/csrf-token');
    
    const csrfToken = csrfResponse.data.csrfToken;
    console.log('CSRF token:', csrfToken ? 'received' : 'missing');
    
    // 3. Try to update profile
    console.log('\n3. Updating profile...');
    const profileUpdateResponse = await axiosInstance.put(
      '/api/auth/profile',
      {
        firstName: 'John Updated',
        phone: '+1234567890'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-csrf-token': csrfToken
        }
      }
    );
    
    console.log('Profile update successful:', profileUpdateResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.error('Authentication failed - details:', error.response.data);
    }
    
    if (error.response?.status === 403) {
      console.error('CSRF validation failed');
    }
  }
}

testProfileUpdate();