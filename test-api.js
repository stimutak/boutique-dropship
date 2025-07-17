const axios = require('axios');

async function testAPI() {
  try {
    console.log('Testing API connection...');
    
    // Test health endpoint
    const healthResponse = await axios.get('http://localhost:5003/health');
    console.log('✅ Health check:', healthResponse.data);
    
    // Test products endpoint
    const productsResponse = await axios.get('http://localhost:5003/api/products');
    console.log('✅ Products count:', productsResponse.data.data.products.length);
    
    // Test registration
    const registerResponse = await axios.post('http://localhost:5003/api/auth/register', {
      firstName: 'API',
      lastName: 'Test',
      email: 'apitest@example.com',
      password: 'Password123!'
    });
    console.log('✅ Registration successful:', registerResponse.data.success);
    
  } catch (error) {
    console.error('❌ API Error:', error.response?.data || error.message);
  }
}

testAPI();