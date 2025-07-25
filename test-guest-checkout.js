const axios = require('axios');
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');

const API_URL = 'http://localhost:5001/api';

async function testGuestCheckout() {
  try {
    console.log('Testing guest checkout flow...\n');
    
    // Create cookie jar for session management
    const cookieJar = new tough.CookieJar();
    
    // Create axios instance with cookie support
    const api = axios.create({
      baseURL: API_URL,
      withCredentials: true,
      jar: cookieJar
    });
    axiosCookieJarSupport(api);
    
    // Step 1: Get CSRF token
    console.log('1. Getting CSRF token...');
    const csrfResponse = await api.get('/csrf-token');
    const csrfToken = csrfResponse.data.csrfToken;
    console.log('   CSRF token obtained:', csrfToken.substring(0, 10) + '...');
    
    // Add CSRF token to headers
    api.defaults.headers.common['x-csrf-token'] = csrfToken;
    
    // Step 2: Create guest session
    const guestSessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('\n2. Guest session ID:', guestSessionId);
    
    // Add guest session ID to all requests
    api.defaults.headers.common['x-guest-session-id'] = guestSessionId;
    
    // Step 3: Add item to cart as guest
    console.log('\n3. Adding item to cart as guest...');
    const addToCartResponse = await api.post('/cart/add', {
      productId: '6762e9bb67bc436c8c7d2d3f', // Sample product ID
      quantity: 1
    });
    console.log('   Cart updated:', addToCartResponse.data);
    
    // Step 4: Create order as guest
    console.log('\n4. Creating order as guest...');
    const orderData = {
      items: [{
        productId: '6762e9bb67bc436c8c7d2d3f',
        quantity: 1,
        price: 45.00
      }],
      guestInfo: {
        firstName: 'Test',
        lastName: 'Guest',
        email: 'guest@test.com',
        phone: '1234567890'
      },
      shippingAddress: {
        firstName: 'Test',
        lastName: 'Guest',
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US'
      },
      billingAddress: {
        firstName: 'Test',
        lastName: 'Guest',
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US'
      }
    };
    
    const orderResponse = await api.post('/orders', orderData);
    console.log('   Order created:', orderResponse.data);
    const orderId = orderResponse.data.order._id;
    
    // Step 5: Fetch order as guest
    console.log('\n5. Fetching order as guest...');
    try {
      const fetchOrderResponse = await api.get(`/orders/${orderId}`);
      console.log('   Order fetched successfully:', fetchOrderResponse.data);
    } catch (error) {
      console.log('   Error fetching order:', error.response?.data || error.message);
    }
    
    // Step 6: Create payment as guest
    console.log('\n6. Creating payment as guest...');
    const paymentResponse = await api.post('/payments/create', {
      orderId: orderId,
      method: 'card',
      redirectUrl: `http://localhost:3001/payment/success/${orderId}`,
      webhookUrl: `http://localhost:5001/api/payments/webhook`
    });
    console.log('   Payment created:', paymentResponse.data);
    
    console.log('\n✅ Guest checkout flow completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error during guest checkout:', error.response?.data || error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testGuestCheckout();