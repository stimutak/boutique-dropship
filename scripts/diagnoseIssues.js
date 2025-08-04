const axios = require('axios');

const BASE_URL = 'http://localhost:5001';
const FRONTEND_URL = 'http://localhost:3006';

async function diagnoseIssues() {
  console.log('🔍 Diagnosing Boutique Store Issues...\n');

  // 1. Test Backend API
  console.log('1. Testing Backend API:');
  try {
    const healthRes = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Backend health check:', healthRes.data);
  } catch (err) {
    console.log('❌ Backend health check failed:', err.message);
  }

  // 2. Test Products API
  console.log('\n2. Testing Products API:');
  try {
    const productsRes = await axios.get(`${BASE_URL}/api/products`);
    const products = productsRes.data.data.products;
    console.log(`✅ Found ${products.length} products`);
    
    // Check image URLs
    let validImages = 0;
    let missingImages = 0;
    products.forEach(product => {
      if (product.images && product.images.length > 0) {
        product.images.forEach(img => {
          if (img.url) {validImages++;}
          else {missingImages++;}
        });
      } else {
        missingImages++;
      }
    });
    console.log(`   - Valid images: ${validImages}`);
    console.log(`   - Missing images: ${missingImages}`);
    
    // Show first product details
    if (products.length > 0) {
      console.log('\n   First product:');
      console.log(`   - Name: ${products[0].name}`);
      console.log(`   - Slug: ${products[0].slug}`);
      console.log(`   - Price: $${products[0].price}`);
      console.log(`   - Images: ${products[0].images?.length || 0}`);
      if (products[0].images?.[0]) {
        console.log(`   - First image URL: ${products[0].images[0].url}`);
      }
    }
  } catch (err) {
    console.log('❌ Products API failed:', err.message);
  }

  // 3. Test Product Detail
  console.log('\n3. Testing Product Detail API:');
  try {
    const slug = 'amethyst-crystal-cluster';
    const detailRes = await axios.get(`${BASE_URL}/api/products/${slug}`);
    console.log(`✅ Product detail for '${slug}' loaded`);
    console.log(`   - Product: ${detailRes.data.data.product.name}`);
    console.log(`   - Related products: ${detailRes.data.data.related.length}`);
  } catch (err) {
    console.log('❌ Product detail API failed:', err.message);
  }

  // 4. Test Auth Registration
  console.log('\n4. Testing Registration API:');
  try {
    const testUser = {
      firstName: 'Test',
      lastName: 'User',
      email: `test${Date.now()}@example.com`,
      password: 'Test123!',
      phone: '+33 6 12 34 56 78'  // French mobile format
    };
    
    const regRes = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
    console.log('✅ Registration successful');
    console.log(`   - User ID: ${regRes.data.user._id}`);
    console.log(`   - Token received: ${regRes.data.token ? 'Yes' : 'No'}`);
  } catch (err) {
    console.log('❌ Registration failed:', err.response?.data || err.message);
    if (err.response?.data?.error?.details) {
      console.log('   Validation errors:', JSON.stringify(err.response.data.error.details, null, 2));
    }
  }

  // 5. Test Cart API (Guest)
  console.log('\n5. Testing Cart API (Guest):');
  try {
    // Get a real product ID first
    const productsRes = await axios.get(`${BASE_URL}/api/products`);
    const firstProductId = productsRes.data.data.products[0]._id;
    
    // First get CSRF token
    const csrfRes = await axios.get(`${BASE_URL}/api/csrf-token`);
    const csrfToken = csrfRes.data.csrfToken;
    const cookies = csrfRes.headers['set-cookie'];
    
    console.log(`   - CSRF token obtained: ${csrfToken ? 'Yes' : 'No'}`);
    console.log(`   - Using product ID: ${firstProductId}`);
    
    // Try to add to cart
    const cartRes = await axios.post(`${BASE_URL}/api/cart/add`, {
      productId: firstProductId,
      quantity: 1
    }, {
      headers: {
        'X-CSRF-Token': csrfToken,
        'Cookie': cookies?.join('; ')
      }
    });
    console.log('✅ Add to cart successful');
  } catch (err) {
    console.log('❌ Cart API failed:', err.response?.data || err.message);
  }

  // 6. Test Frontend Proxy
  console.log('\n6. Testing Frontend Proxy:');
  try {
    const proxyRes = await axios.get(`${FRONTEND_URL}/api/products`, {
      headers: { 'Origin': FRONTEND_URL }
    });
    console.log('✅ Frontend proxy working');
    console.log(`   - Products returned: ${proxyRes.data.data.products.length}`);
  } catch (err) {
    console.log('❌ Frontend proxy failed:', err.message);
    if (err.code === 'ECONNREFUSED') {
      console.log('   (Frontend server may not be running on port 3006)');
    }
  }

  console.log('\n✨ Diagnosis complete!');
}

diagnoseIssues().catch(err => {
  console.error('Fatal error:', err);
});