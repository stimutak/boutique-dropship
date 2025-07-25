// Simple script to check if guest checkout is enabled in the frontend

const fs = require('fs');

console.log('Checking guest checkout configuration...\n');

// Check if checkout page requires authentication
const checkoutPath = './client/src/pages/Checkout.jsx';
const checkoutContent = fs.readFileSync(checkoutPath, 'utf8');

// Check for authentication requirements
const hasAuthCheck = checkoutContent.includes('!isAuthenticated') && checkoutContent.includes('navigate');
const hasAuthRequirement = checkoutContent.includes('requireAuth') || checkoutContent.includes('ProtectedRoute');

console.log('1. Checkout Page Analysis:');
console.log(`   - Has authentication check: ${hasAuthCheck ? 'YES' : 'NO'}`);
console.log(`   - Requires authentication: ${hasAuthRequirement ? 'YES' : 'NO'}`);

// Check App.jsx routing
const appPath = './client/src/App.jsx';
const appContent = fs.readFileSync(appPath, 'utf8');

const checkoutRouteMatch = appContent.match(/path="\/checkout"[^>]+element={([^}]+)}/);
console.log('\n2. Route Configuration:');
console.log(`   - Checkout route: ${checkoutRouteMatch ? checkoutRouteMatch[0] : 'Not found'}`);

// Check if it's wrapped in ProtectedRoute
const isProtected = appContent.includes('ProtectedRoute') && appContent.includes('Checkout');
console.log(`   - Is protected route: ${isProtected ? 'YES' : 'NO'}`);

// Check order creation logic
const ordersSlicePath = './client/src/store/slices/ordersSlice.js';
const ordersContent = fs.readFileSync(ordersSlicePath, 'utf8');

const hasGuestEndpoint = ordersContent.includes('/api/orders/guest') || ordersContent.includes('!isAuthenticated');
console.log('\n3. Order Creation Logic:');
console.log(`   - Supports guest orders: ${hasGuestEndpoint ? 'YES' : 'NO'}`);

// Check backend routes
const orderRoutesPath = './routes/orders.js';
const orderRoutesContent = fs.readFileSync(orderRoutesPath, 'utf8');

const hasGuestRoute = orderRoutesContent.includes('router.post(\'/guest\'') || orderRoutesContent.includes('router.post(\'/\'');
const hasGuestValidation = orderRoutesContent.includes('validateGuestCheckout');

console.log('\n4. Backend Routes:');
console.log(`   - Has guest order route: ${hasGuestRoute ? 'YES' : 'NO'}`);
console.log(`   - Has guest validation: ${hasGuestValidation ? 'YES' : 'NO'}`);

// Summary
console.log('\n=== SUMMARY ===');
if (!isProtected && hasGuestEndpoint && hasGuestRoute) {
  console.log('✅ Guest checkout appears to be enabled!');
} else {
  console.log('❌ Guest checkout may have issues:');
  if (isProtected) console.log('   - Checkout route is protected');
  if (!hasGuestEndpoint) console.log('   - Frontend not configured for guest orders');
  if (!hasGuestRoute) console.log('   - Backend missing guest order routes');
}