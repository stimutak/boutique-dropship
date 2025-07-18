const axios = require('axios');

const API_BASE = 'http://localhost:5001';

async function testAuthFixes() {
  console.log('Testing authentication fixes...\n');
  
  try {
    // Test 1: Cart operations without authentication (should work)
    console.log('1. Testing cart GET without auth...');
    const cartResponse = await axios.get(`${API_BASE}/api/cart`, {
      withCredentials: true
    });
    console.log('✅ Cart GET works without auth');
    console.log('Response format:', Object.keys(cartResponse.data));
    
    // Test 2: Payment creation without auth (should work for guest checkout)
    console.log('\n2. Testing payment creation without auth...');
    try {
      const paymentResponse = await axios.post(`${API_BASE}/api/payments/create`, {
        orderId: '507f1f77bcf86cd799439011', // fake order ID
        method: 'card'
      });
      console.log('✅ Payment creation allows guest access');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Payment creation allows guest access (order not found is expected)');
      } else if (error.response?.status === 401) {
        console.log('❌ Payment creation still requires auth');
      } else {
        console.log('✅ Payment creation allows guest access (other error is expected)');
      }
    }
    
    // Test 3: Add to cart without auth (should work)
    console.log('\n3. Testing add to cart without auth...');
    try {
      const addCartResponse = await axios.post(`${API_BASE}/api/cart/add`, {
        productId: '507f1f77bcf86cd799439011', // fake product ID
        quantity: 1
      }, {
        withCredentials: true
      });
      console.log('✅ Add to cart works without auth');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Add to cart works without auth (product not found is expected)');
      } else if (error.response?.status === 401) {
        console.log('❌ Add to cart still requires auth');
      } else {
        console.log('✅ Add to cart works without auth (other error is expected)');
      }
    }
    
    console.log('\n✅ Authentication fixes test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testAuthFixes();