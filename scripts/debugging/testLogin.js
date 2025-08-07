const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login for oed@mac.com...\n');
    
    const response = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'oed@mac.com',
      password: 'TempPass123!'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Login failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

testLogin();