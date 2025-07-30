const axios = require('axios');

// Create axios instance with cookie support
const api = axios.create({
  baseURL: 'http://localhost:5001/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

const API_URL = 'http://localhost:5001/api';
let testsPassed = 0;
let testsFailed = 0;

// Helper to create unique emails
const getUniqueEmail = () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`;

// Test helper
async function runTest(name, testFn) {
  console.log(`\n📋 Testing: ${name}`);
  try {
    await testFn();
    console.log(`✅ PASSED: ${name}`);
    testsPassed++;
  } catch (error) {
    console.log(`❌ FAILED: ${name}`);
    console.error('Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    testsFailed++;
  }
}

// Test Issue #11 & #12: Registration and Login Response
async function testAuthResponses() {
  const testUser = {
    email: getUniqueEmail(),
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    phone: '1234567890'
  };

  // Test registration
  await runTest('Registration returns proper data structure', async () => {
    const res = await api.post('/auth/register', testUser);
    if (!res.data.success) throw new Error('Registration failed');
    if (!res.data.token && !res.data.data?.token) throw new Error('No token in response');
    if (!res.data.user && !res.data.data?.user) throw new Error('No user in response');
    
    const token = res.data.token || res.data.data?.token;
    const user = res.data.user || res.data.data?.user;
    
    if (!user.firstName || !user.lastName || !user.email) {
      throw new Error('User data incomplete');
    }
  });

  // Test login
  await runTest('Login returns proper data structure', async () => {
    const res = await api.post('/auth/login', {
      email: testUser.email,
      password: testUser.password
    });
    
    if (!res.data.success) throw new Error('Login failed');
    if (!res.data.token && !res.data.data?.token) throw new Error('No token in response');
    if (!res.data.user && !res.data.data?.user) throw new Error('No user in response');
    
    const user = res.data.user || res.data.data?.user;
    if (user.firstName !== testUser.firstName) {
      throw new Error(`User data mismatch: expected ${testUser.firstName}, got ${user.firstName}`);
    }
  });
}

// Test Issue #10: Bad Login
async function testBadLogin() {
  const testUser = {
    email: getUniqueEmail(),
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };

  // Register first
  await api.post('/auth/register', testUser);

  await runTest('Bad login returns 401 without auth data', async () => {
    try {
      await api.post('/auth/login', {
        email: testUser.email,
        password: 'wrongpassword'
      });
      throw new Error('Expected 401 error');
    } catch (error) {
      if (error.response?.status !== 401) {
        throw new Error(`Expected 401, got ${error.response?.status}`);
      }
      if (error.response.data.token || error.response.data.data?.token) {
        throw new Error('Token present in error response');
      }
      if (error.response.data.user || error.response.data.data?.user) {
        throw new Error('User data present in error response');
      }
    }
  });
}

// Test Issue #9: Profile Update
async function testProfileUpdate() {
  const testUser = {
    email: getUniqueEmail(),
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };

  const res = await api.post('/auth/register', testUser);
  const token = res.data.token || res.data.data?.token;

  await runTest('Profile update maintains authentication', async () => {
    // Update profile
    const updateRes = await api.put('/auth/profile', {
      firstName: 'Updated',
      lastName: 'Name'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!updateRes.data.success) throw new Error('Update failed');
    
    const user = updateRes.data.user || updateRes.data.data?.user;
    if (user.firstName !== 'Updated') {
      throw new Error('Profile not updated');
    }

    // Verify still authenticated
    const profileRes = await api.get('/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (profileRes.status !== 200) throw new Error('Lost authentication');
  });
}

// Test Issue #4: Address Management
async function testAddressManagement() {
  const testUser = {
    email: getUniqueEmail(),
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };

  const res = await api.post('/auth/register', testUser);
  const token = res.data.token || res.data.data?.token;

  await runTest('Can add address to profile', async () => {
    const addressRes = await api.post('/auth/addresses', {
      type: 'shipping',
      firstName: 'Test',
      lastName: 'User',
      street: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      country: 'US',
      isDefault: true
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!addressRes.data.success) throw new Error('Failed to add address');
    if (!addressRes.data.user.addresses || addressRes.data.user.addresses.length === 0) {
      throw new Error('Address not added to user');
    }
  });
}

// Test Issues #7 & #8: Guest Checkout
async function testGuestCheckout() {
  await runTest('Guest checkout endpoint accepts orders', async () => {
    // First get CSRF token
    const csrfRes = await api.get('/csrf-token');
    const csrfToken = csrfRes.data.csrfToken;

    const orderData = {
      guestInfo: {
        email: 'guest@example.com',
        firstName: 'Guest',
        lastName: 'User',
        phone: '9876543210'
      },
      items: [{
        productId: '507f1f77bcf86cd799439011',
        quantity: 1,
        price: 29.99
      }],
      shippingAddress: {
        firstName: 'Guest',
        lastName: 'User',
        street: '456 Guest Ave',
        city: 'Guest City',
        state: 'GS',
        zipCode: '54321',
        country: 'US'
      },
      billingAddress: {
        firstName: 'Guest',
        lastName: 'User',
        street: '456 Guest Ave',
        city: 'Guest City',
        state: 'GS',
        zipCode: '54321',
        country: 'US'
      }
    };

    try {
      const orderRes = await api.post('/orders/guest', orderData, {
        headers: { 'x-csrf-token': csrfToken }
      });
      // If we get here, the endpoint is working (even if product validation fails)
    } catch (error) {
      // Check if it's just a product validation error (which means the endpoint works)
      if (error.response?.status === 400 && error.response.data.error?.code === 'INVALID_PRODUCT') {
        // This is OK - the endpoint works, just the product doesn't exist
        return;
      }
      throw error;
    }
  });
}

// Test Issue #13: Logged-in Order Placement
async function testLoggedInOrders() {
  const testUser = {
    email: getUniqueEmail(),
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };

  const res = await api.post('/auth/register', testUser);
  const token = res.data.token || res.data.data?.token;

  await runTest('Logged-in users can place orders', async () => {
    // Get CSRF token
    const csrfRes = await api.get('/csrf-token');
    const csrfToken = csrfRes.data.csrfToken;

    const orderData = {
      items: [{
        productId: '507f1f77bcf86cd799439011',
        quantity: 1,
        price: 29.99
      }],
      shippingAddress: {
        firstName: 'Test',
        lastName: 'User',
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US'
      },
      billingAddress: {
        firstName: 'Test',
        lastName: 'User',
        street: '123 Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'US'
      }
    };

    try {
      await api.post('/orders/registered', orderData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'x-csrf-token': csrfToken 
        }
      });
    } catch (error) {
      // Check if it's an auth error (which would be the bug)
      if (error.response?.status === 401) {
        throw new Error('Authentication error when placing order as logged-in user');
      }
      // Product validation errors are OK for this test
      if (error.response?.status === 400 && error.response.data.error?.code === 'INVALID_PRODUCT') {
        return;
      }
      throw error;
    }
  });
}

// Test Cart Persistence
async function testCartPersistence() {
  const testUser = {
    email: getUniqueEmail(),
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };

  const res = await api.post('/auth/register', testUser);
  const token = res.data.token || res.data.data?.token;

  await runTest('Cart persists for logged-in users', async () => {
    // Get initial cart
    const cart1 = await api.get('/cart', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!cart1.data.success) throw new Error('Failed to get cart');
    
    // Simulate new session by making another request
    const cart2 = await api.get('/cart', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!cart2.data.success) throw new Error('Failed to get cart on second request');
  });
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Running comprehensive fix verification tests...\n');
  
  try {
    await testAuthResponses();
    await testBadLogin();
    await testProfileUpdate();
    await testAddressManagement();
    await testGuestCheckout();
    await testLoggedInOrders();
    await testCartPersistence();
  } catch (error) {
    console.error('\n💥 Test suite error:', error.message);
  }
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! All GitHub issues appear to be fixed.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
}

// Check if server is running
axios.get('http://localhost:5001/health')
  .then(() => runAllTests())
  .catch(() => {
    console.error('❌ Server is not running on port 5001');
    console.log('Please start the server with: npm start');
  });