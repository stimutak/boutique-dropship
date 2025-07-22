const axios = require('axios');

async function debugFrontend() {
  console.log('🔍 Debugging Frontend Issues...\n');

  // Test backend API directly
  console.log('1. Testing Backend Products API:');
  try {
    const res = await axios.get('http://localhost:5001/api/products');
    const products = res.data.data.products;
    console.log(`   ✅ Found ${products.length} products`);
    
    products.forEach((p, i) => {
      console.log(`   Product ${i + 1}: ${p.name}`);
      console.log(`     - Images: ${p.images?.length || 0}`);
      if (p.images?.[0]) {
        console.log(`     - Image URL: ${p.images[0].url.substring(0, 50)}...`);
      }
    });
  } catch (err) {
    console.log('   ❌ Error:', err.message);
  }

  // Test frontend proxy
  console.log('\n2. Testing Frontend Proxy (port 3006):');
  try {
    const res = await axios.get('http://localhost:3006/api/products');
    console.log('   ✅ Proxy working');
  } catch (err) {
    console.log('   ❌ Proxy failed:', err.message);
  }

  // Check if frontend is running
  console.log('\n3. Testing Frontend Server:');
  try {
    const res = await axios.get('http://localhost:3006/');
    console.log('   ✅ Frontend server is running');
  } catch (err) {
    console.log('   ❌ Frontend not accessible:', err.message);
    console.log('   Try running: cd client && npm run dev');
  }

  // Check all running servers
  console.log('\n4. Active servers:');
  const { exec } = require('child_process');
  exec('lsof -i :3000-3010,5000-5001 | grep LISTEN', (error, stdout) => {
    if (stdout) {
      console.log(stdout);
    } else {
      console.log('   No servers found on expected ports');
    }
  });
}

debugFrontend();