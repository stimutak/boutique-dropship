const axios = require('axios');

async function testOrderCurrency() {
  const API_URL = 'http://localhost:5001/api';
  
  try {
    console.log('\n🧪 Testing Order Currency Support\n');
    
    // First, get a product ID
    const productsRes = await axios.get(`${API_URL}/products`);
    const productId = productsRes.data.data.products[0]._id;
    console.log(`Using product ID: ${productId}`);
    
    // Test 1: Guest checkout with EUR (French locale)
    console.log('\n1. Testing guest checkout with EUR (French locale)...');
    try {
      const guestOrderEUR = await axios.post(`${API_URL}/orders/guest`, {
        guestInfo: {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        },
        items: [{
          productId: productId,
          quantity: 1
        }],
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'Paris',
          state: 'IDF',
          zipCode: '75001',
          country: 'FR'
        },
        billingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'Paris',
          state: 'IDF',
          zipCode: '75001',
          country: 'FR'
        }
      }, {
        headers: {
          'x-locale': 'fr'
        }
      });
      
      const order = guestOrderEUR.data.data?.order || guestOrderEUR.data.order;
      console.log('✅ EUR Order created:');
      console.log(`   Order Number: ${order.orderNumber}`);
      console.log(`   Currency: ${order.currency || 'Not captured'}`);
      console.log(`   Exchange Rate: ${order.exchangeRate || 'Not captured'}`);
      console.log(`   Total: ${order.total}`);
    } catch (error) {
      console.error('❌ EUR order failed:', error.response?.data || error.message);
    }
    
    // Test 2: Guest checkout with USD (default)
    console.log('\n2. Testing guest checkout with USD (default)...');
    try {
      const guestOrderUSD = await axios.post(`${API_URL}/orders/guest`, {
        guestInfo: {
          email: 'test2@example.com',
          firstName: 'Test',
          lastName: 'User'
        },
        items: [{
          productId: productId,
          quantity: 2
        }],
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US'
        },
        billingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'US'
        }
      });
      
      const order = guestOrderUSD.data.data?.order || guestOrderUSD.data.order;
      console.log('✅ USD Order created:');
      console.log(`   Order Number: ${order.orderNumber}`);
      console.log(`   Currency: ${order.currency || 'Not captured'}`);
      console.log(`   Exchange Rate: ${order.exchangeRate || 'Not captured'}`);
      console.log(`   Total: ${order.total}`);
    } catch (error) {
      console.error('❌ USD order failed:', error.response?.data || error.message);
    }
    
    // Test 3: Authenticated checkout with JPY
    console.log('\n3. Testing authenticated checkout with JPY (Japanese locale)...');
    try {
      // First login
      const loginRes = await axios.post(`${API_URL}/auth/login`, {
        email: 'jane@example.com',
        password: 'Password123!'
      });
      
      const token = loginRes.data.token;
      
      const authOrderJPY = await axios.post(`${API_URL}/orders`, {
        items: [{
          productId: productId,
          quantity: 1
        }],
        shippingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'Tokyo',
          state: 'Tokyo',
          zipCode: '100-0001',
          country: 'JP'
        },
        billingAddress: {
          firstName: 'Test',
          lastName: 'User',
          street: '123 Test St',
          city: 'Tokyo',
          state: 'Tokyo',
          zipCode: '100-0001',
          country: 'JP'
        }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-locale': 'ja'
        }
      });
      
      const order = authOrderJPY.data.order;
      console.log('✅ JPY Order created:');
      console.log(`   Order Number: ${order.orderNumber}`);
      console.log(`   Currency: ${order.currency || 'Not captured'}`);
      console.log(`   Exchange Rate: ${order.exchangeRate || 'Not captured'}`);
      console.log(`   Total: ${order.total}`);
    } catch (error) {
      console.error('❌ JPY order failed:', error.response?.data || error.message);
    }
    
    console.log('\n✅ All currency tests completed!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testOrderCurrency();