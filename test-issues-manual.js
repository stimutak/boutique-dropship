const axios = require('axios');

const API_URL = 'http://localhost:5001/api';

// Helper to create unique emails
const getUniqueEmail = () => `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`;

// Test data
const testUser = {
  email: getUniqueEmail(),
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  phone: '1234567890'
};

async function testIssue12_LoginSync() {
  console.log('\n=== Testing Issue #12: Login sync error ===');
  
  try {
    // Register
    const registerRes = await axios.post(`${API_URL}/auth/register`, testUser);
    console.log('✓ Registration successful');
    
    // Login
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    console.log('Login response structure:', {
      hasToken: !!loginRes.data.data?.token,
      hasUser: !!loginRes.data.data?.user,
      userFirstName: loginRes.data.data?.user?.firstName,
      userLastName: loginRes.data.data?.user?.lastName
    });
    
    if (!loginRes.data.data?.user?.firstName) {
      console.log('❌ ISSUE CONFIRMED: User data missing from login response');
    } else {
      console.log('✓ User data present in login response');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testIssue11_RegistrationState() {
  console.log('\n=== Testing Issue #11: Registration login state ===');
  
  const newUser = { ...testUser, email: getUniqueEmail() };
  
  try {
    // Register
    const registerRes = await axios.post(`${API_URL}/auth/register`, newUser);
    const token = registerRes.data.data?.token;
    
    console.log('Registration response:', {
      hasToken: !!token,
      hasUser: !!registerRes.data.data?.user
    });
    
    // Try to access protected route
    const profileRes = await axios.get(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✓ Can access protected routes after registration');
    
  } catch (error) {
    console.log('❌ ISSUE CONFIRMED: Cannot access protected routes after registration');
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testIssue10_BadLoginState() {
  console.log('\n=== Testing Issue #10: Bad login state ===');
  
  const newUser = { ...testUser, email: getUniqueEmail() };
  
  try {
    // Register first
    await axios.post(`${API_URL}/auth/register`, newUser);
    
    // Try bad login
    try {
      const badLoginRes = await axios.post(`${API_URL}/auth/login`, {
        email: newUser.email,
        password: 'wrongpassword'
      });
      
      if (badLoginRes.data.data?.token || badLoginRes.data.data?.user) {
        console.log('❌ ISSUE CONFIRMED: Bad login returns auth data');
      }
    } catch (loginError) {
      if (loginError.response?.status === 401) {
        console.log('✓ Bad login correctly returns 401');
        console.log('Response:', loginError.response.data);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testIssue9_ProfileUpdate() {
  console.log('\n=== Testing Issue #9: Profile update authentication ===');
  
  const newUser = { ...testUser, email: getUniqueEmail() };
  
  try {
    // Register
    const registerRes = await axios.post(`${API_URL}/auth/register`, newUser);
    const token = registerRes.data.data?.token;
    
    // Update profile
    const updateRes = await axios.put(`${API_URL}/auth/profile`, {
      firstName: 'Updated',
      lastName: 'Name'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Update response:', {
      success: updateRes.data.success,
      hasUser: !!updateRes.data.data?.user
    });
    
    // Check if still authenticated
    const profileRes = await axios.get(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (profileRes.data.data?.user?.firstName === 'Updated') {
      console.log('✓ Profile update successful and authentication maintained');
    } else {
      console.log('❌ ISSUE: Profile not updated or auth lost');
    }
    
  } catch (error) {
    console.log('❌ ISSUE CONFIRMED: Profile update failed');
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testIssue13_LoggedInOrderPlacement() {
  console.log('\n=== Testing Issue #13: Order placement as logged-in user ===');
  
  const newUser = { ...testUser, email: getUniqueEmail() };
  
  try {
    // Register
    const registerRes = await axios.post(`${API_URL}/auth/register`, newUser);
    const token = registerRes.data.data?.token;
    
    // Try to place order
    const orderData = {
      items: [{
        productId: '507f1f77bcf86cd799439011', // dummy ID
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
      const orderRes = await axios.post(`${API_URL}/orders/registered`, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✓ Order placed successfully as logged-in user');
    } catch (orderError) {
      if (orderError.response?.status === 401) {
        console.log('❌ ISSUE CONFIRMED: Authentication error when placing order');
        console.log('Error:', orderError.response.data);
      } else {
        console.log('Order error (may be due to invalid product):', orderError.response?.data);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testIssue8_7_GuestCheckout() {
  console.log('\n=== Testing Issues #8 & #7: Guest checkout ===');
  
  const guestOrderData = {
    guestInfo: {
      email: 'guest@example.com',
      firstName: 'Guest',
      lastName: 'User',
      phone: '9876543210'
    },
    items: [{
      productId: '507f1f77bcf86cd799439011', // dummy ID
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
    const orderRes = await axios.post(`${API_URL}/orders`, guestOrderData);
    console.log('✓ Guest checkout successful');
    console.log('Order response:', orderRes.data);
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error?.code === 'INVALID_PRODUCT') {
      console.log('✓ Guest checkout endpoint works (product validation failed as expected)');
    } else {
      console.log('❌ ISSUE CONFIRMED: Guest checkout failed');
      console.error('Error:', error.response?.data || error.message);
    }
  }
}

async function runAllTests() {
  console.log('Starting issue reproduction tests...');
  console.log('Make sure the server is running on port 5001');
  
  await testIssue12_LoginSync();
  await testIssue11_RegistrationState();
  await testIssue10_BadLoginState();
  await testIssue9_ProfileUpdate();
  await testIssue13_LoggedInOrderPlacement();
  await testIssue8_7_GuestCheckout();
  
  console.log('\n=== Test Summary ===');
  console.log('Check the output above for confirmed issues marked with ❌');
}

// Run tests
runAllTests().catch(console.error);