const axios = require('axios');

const BASE_URL = 'http://localhost:5001';

async function testCheckout() {
  console.log('🛒 Testing Checkout Flow...\n');

  try {
    // 1. Get CSRF token and session
    const csrfRes = await axios.get(`${BASE_URL}/api/csrf-token`, {
      withCredentials: true
    });
    const csrfToken = csrfRes.data.csrfToken;
    const cookies = csrfRes.headers['set-cookie'];
    
    console.log('1. CSRF token obtained:', csrfToken ? '✅' : '❌');

    // 2. Add item to cart
    const productsRes = await axios.get(`${BASE_URL}/api/products`);
    const product = productsRes.data.data.products[0];
    
    await axios.post(`${BASE_URL}/api/cart/add`, {
      productId: product._id,
      quantity: 2
    }, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Cookie': cookies?.join('; ')
      },
      withCredentials: true
    });
    
    console.log('2. Added to cart:', product.name);

    // 3. Create order
    const orderData = {
      items: [{
        productId: product._id,
        quantity: 2,
        price: product.price
      }],
      guestInfo: {
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test@example.com',
        phone: '+33 6 12 34 56 78'
      },
      shippingAddress: {
        firstName: 'Test',
        lastName: 'Customer',
        street: '123 Test Street',
        city: 'Paris',
        state: 'IDF',
        zipCode: '75001',
        country: 'FR'
      },
      billingAddress: {
        firstName: 'Test',
        lastName: 'Customer',
        street: '123 Test Street',
        city: 'Paris',
        state: 'IDF',
        zipCode: '75001',
        country: 'FR'
      },
      referralSource: 'test'
    };

    console.log('\n3. Creating order...');
    const orderRes = await axios.post(`${BASE_URL}/api/orders`, orderData, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Cookie': cookies?.join('; ')
      },
      withCredentials: true
    });

    console.log('✅ Order created successfully!');
    console.log('Full response:', JSON.stringify(orderRes.data, null, 2));
    
    const order = orderRes.data.order || orderRes.data.data?.order;
    if (order) {
      console.log('   - Order ID:', order._id);
      console.log('   - Order Number:', order.orderNumber);
      console.log('   - Total:', `$${order.total.toFixed(2)}`);
      console.log('   - Status:', order.status);
    }

    // 4. Test payment endpoint
    const orderId = order?._id;
    if (!orderId) {
      console.log('❌ No order ID found in response');
      return;
    }
    console.log('\n4. Testing payment creation...');
    
    try {
      const paymentRes = await axios.post(`${BASE_URL}/api/payments/create`, {
        orderId: orderId,
        paymentMethod: 'ideal',
        returnUrl: `http://localhost:3000/payment-success?order=${orderId}`
      }, {
        headers: {
          'X-CSRF-Token': csrfToken,
          'Cookie': cookies?.join('; ')
        },
        withCredentials: true
      });

      console.log('✅ Payment created!');
      console.log('   - Payment ID:', paymentRes.data.data.payment.id);
      console.log('   - Status:', paymentRes.data.data.payment.status);
      if (paymentRes.data.data.payment._links?.checkout) {
        console.log('   - Checkout URL:', paymentRes.data.data.payment._links.checkout.href);
      }
    } catch (paymentError) {
      console.log('⚠️  Regular payment failed, trying demo payment...');
      
      // Try demo payment
      const demoRes = await axios.post(`${BASE_URL}/api/payments/demo-complete/${orderId}`, {}, {
        headers: {
          'X-CSRF-Token': csrfToken,
          'Cookie': cookies?.join('; ')
        },
        withCredentials: true
      });
      
      console.log('✅ Demo payment completed!');
      console.log('   - Message:', demoRes.data.message);
      console.log('   - Order status:', demoRes.data.order.status);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.error?.details) {
      console.error('Validation errors:', JSON.stringify(error.response.data.error.details, null, 2));
    }
  }
}

testCheckout();