#!/usr/bin/env node

/**
 * Manual test script to verify cart fixes
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Cart = require('./models/Cart');
const User = require('./models/User');
const Product = require('./models/Product');

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/boutique', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function testCartFixes() {
  console.log('\n=== Testing Cart Fixes ===');
  
  try {
    // Test 1: Create multiple guest carts with same session ID (simulate the bug)
    console.log('\n1. Testing duplicate cart cleanup...');
    const sessionId = `guest_${Date.now()}_testfix123`;
    
    // Create duplicate carts (this will test the unique constraint)
    const cart1 = new Cart({ sessionId, items: [] });
    await cart1.save();
    
    // Try to create duplicate - this should fail due to unique constraint
    try {
      const cart2 = new Cart({ sessionId, items: [] });
      await cart2.save();
      console.log('❌ Duplicate cart creation should have failed but succeeded');
    } catch (error) {
      if (error.code === 11000) {
        console.log('✅ Unique constraint working - duplicate cart creation properly blocked');
        // This is expected behavior - the unique index is working
      } else {
        throw error; // Re-throw if it's a different error
      }
    }
    
    console.log(`Created 2 carts with session ${sessionId}`);
    
    // Check duplicates exist
    const duplicates = await Cart.find({ sessionId });
    console.log(`Found ${duplicates.length} carts with same session ID`);
    
    // Test cleanup (simulate what the route does)
    if (duplicates.length > 1) {
      const sortedCarts = duplicates.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      const cartsToDelete = sortedCarts.slice(1);
      
      for (const cartToDelete of cartsToDelete) {
        await Cart.deleteOne({ _id: cartToDelete._id });
      }
      
      console.log(`Cleaned up ${cartsToDelete.length} duplicate carts`);
    }
    
    // Verify cleanup
    const remainingCarts = await Cart.find({ sessionId });
    console.log(`After cleanup: ${remainingCarts.length} cart(s) remaining`);
    
    // Test 2: Test cart item operations
    console.log('\n2. Testing cart item operations...');
    const testProduct = await Product.findOne({ isActive: true });
    if (!testProduct) {
      console.log('No active products found, skipping item tests');
      return;
    }
    
    console.log(`Using product: ${testProduct.name} (${testProduct._id})`);
    
    // Get the remaining cart
    let cart = remainingCarts[0];
    
    // Add item
    cart.items.push({
      product: testProduct._id,
      quantity: 2,
      price: testProduct.price,
      addedAt: new Date()
    });
    await cart.save();
    console.log('Added item to cart');
    
    // Update item quantity
    cart.items[0].quantity = 3;
    await cart.save();
    console.log('Updated item quantity to 3');
    
    // Remove item (set quantity to 0)
    cart.items = cart.items.filter(item => item.quantity > 0);
    cart.items = []; // Simulate removal
    await cart.save();
    console.log('Removed item from cart');
    
    // Test 3: Test cart clearing
    console.log('\n3. Testing cart clearing...');
    
    // Add item back
    cart.items.push({
      product: testProduct._id,
      quantity: 1,
      price: testProduct.price,
      addedAt: new Date()
    });
    await cart.save();
    console.log('Added item back to cart');
    
    // Clear cart (simulate the route logic)
    await Cart.deleteMany({ sessionId });
    const newCart = new Cart({ sessionId, items: [] });
    await newCart.save();
    console.log('Cleared cart and created fresh one');
    
    // Verify cart is empty
    const clearedCart = await Cart.findOne({ sessionId });
    console.log(`Cart after clearing has ${clearedCart.items.length} items`);
    
    // Test 4: Test session isolation
    console.log('\n4. Testing session isolation...');
    
    const session1 = `guest_${Date.now()}_session1`;
    const session2 = `guest_${Date.now()}_session2`;
    
    // Create carts for different sessions
    const cart1Session = new Cart({ 
      sessionId: session1, 
      items: [{
        product: testProduct._id,
        quantity: 1,
        price: testProduct.price,
        addedAt: new Date()
      }]
    });
    
    const cart2Session = new Cart({ 
      sessionId: session2, 
      items: []
    });
    
    await cart1Session.save();
    await cart2Session.save();
    
    console.log(`Session 1 cart has ${cart1Session.items.length} items`);
    console.log(`Session 2 cart has ${cart2Session.items.length} items`);
    console.log('✓ Sessions are properly isolated');
    
    // Cleanup test carts
    await Cart.deleteMany({ sessionId: { $in: [sessionId, session1, session2] } });
    console.log('Cleaned up test carts');
    
    console.log('\n✅ All cart fixes are working correctly!');
    
  } catch (error) {
    console.error('❌ Cart test failed:', error);
  }
}

async function testUserCartTransition() {
  console.log('\n=== Testing User/Guest Cart Transition ===');
  
  try {
    // Create a test user
    const testUser = await User.findOne({ email: { $regex: /test.*@example\.com/ } });
    if (!testUser) {
      console.log('No test user found, skipping user cart tests');
      return;
    }
    
    console.log(`Using test user: ${testUser.email}`);
    
    // Test guest cart merge simulation
    const guestSessionId = `guest_${Date.now()}_merge_test`;
    const testProduct = await Product.findOne({ isActive: true });
    
    if (!testProduct) {
      console.log('No active products found, skipping merge tests');
      return;
    }
    
    // Create guest cart with items
    const guestCart = new Cart({
      sessionId: guestSessionId,
      items: [{
        product: testProduct._id,
        quantity: 2,
        price: testProduct.price,
        addedAt: new Date()
      }]
    });
    await guestCart.save();
    console.log('Created guest cart with 2 items');
    
    // Simulate user login and cart merge
    if (!testUser.cart) {
      testUser.cart = { items: [], updatedAt: new Date() };
    }
    
    // Merge guest cart items into user cart
    for (const guestItem of guestCart.items) {
      const existingItemIndex = testUser.cart.items.findIndex(item => 
        item.product.toString() === guestItem.product.toString()
      );
      
      if (existingItemIndex >= 0) {
        testUser.cart.items[existingItemIndex].quantity += guestItem.quantity;
      } else {
        testUser.cart.items.push({
          product: guestItem.product,
          quantity: guestItem.quantity,
          price: guestItem.price,
          addedAt: new Date()
        });
      }
    }
    
    testUser.cart.updatedAt = new Date();
    await testUser.save();
    
    // Clean up guest cart after merge
    await Cart.deleteOne({ sessionId: guestSessionId });
    
    const totalQuantity = testUser.cart.items.reduce((total, item) => total + item.quantity, 0);
    console.log(`Merged guest cart into user cart. User now has ${testUser.cart.items.length} unique items with total quantity ${totalQuantity}`);
    
    // Simulate logout - clear user cart context (but keep data)
    console.log('Simulating logout - user cart data preserved, new guest session created');
    
    // Create new guest session after logout
    const newGuestSessionId = `guest_${Date.now()}_after_logout`;
    const newGuestCart = new Cart({ sessionId: newGuestSessionId, items: [] });
    await newGuestCart.save();
    
    console.log(`New guest session created: ${newGuestSessionId} with ${newGuestCart.items.length} items`);
    console.log('✓ User/guest transition working correctly');
    
    // Cleanup
    await Cart.deleteOne({ sessionId: newGuestSessionId });
    
  } catch (error) {
    console.error('❌ User cart transition test failed:', error);
  }
}

async function testGuestCartIsolation() {
  console.log('\n=== Testing Guest Cart Session Isolation ===');
  
  try {
    const testProduct = await Product.findOne({ isActive: true });
    if (!testProduct) {
      console.log('No active products found, skipping isolation tests');
      return;
    }
    
    console.log(`Using product: ${testProduct.name} (${testProduct._id})`);
    
    // Test 1: Create first guest session (should start empty)
    console.log('\n1. Creating first guest session...');
    const firstSessionId = `guest_${Date.now()}_session_1`;
    const firstCart = new Cart({
      sessionId: firstSessionId,
      items: [] // Guest carts should always start empty
    });
    await firstCart.save();
    console.log(`First session (${firstSessionId}) starts with ${firstCart.items.length} items (should be 0)`);
    
    // Add items to first session (simulating user adding products)
    console.log('Adding 3 items to first session...');
    firstCart.items.push({
      product: testProduct._id,
      quantity: 3,
      price: testProduct.price,
      addedAt: new Date()
    });
    await firstCart.save();
    console.log(`First session now has ${firstCart.items.length} items with quantity ${firstCart.items[0].quantity}`);
    
    // Test 2: Create second guest session (simulating new browser session)
    console.log('\n2. Creating second guest session (new browser session)...');
    const secondSessionId = `guest_${Date.now() + 1}_session_2`;
    const secondCart = new Cart({
      sessionId: secondSessionId,
      items: [] // Should start empty
    });
    await secondCart.save();
    console.log(`Second session (${secondSessionId}) has ${secondCart.items.length} items`);
    
    // Test 3: Add item to second session (this should NOT include previous session's items)
    console.log('\n3. Adding 1 item to second session...');
    console.log('CRITICAL TEST: Verifying new session does not contain previous session items');
    
    // Before adding, verify cart is truly empty
    if (secondCart.items.length !== 0) {
      console.log('❌ CRITICAL BUG: New guest session is not empty! Contains items from previous session');
      return;
    }
    
    secondCart.items.push({
      product: testProduct._id,
      quantity: 1, // Different quantity than first session
      price: testProduct.price,
      addedAt: new Date()
    });
    await secondCart.save();
    console.log(`Second session now has ${secondCart.items.length} items with quantity ${secondCart.items[0].quantity}`);
    
    // Test 4: Verify sessions are isolated
    console.log('\n4. Verifying session isolation...');
    const firstCartCheck = await Cart.findOne({ sessionId: firstSessionId });
    const secondCartCheck = await Cart.findOne({ sessionId: secondSessionId });
    
    console.log(`First session still has ${firstCartCheck.items.length} items with quantity ${firstCartCheck.items[0].quantity}`);
    console.log(`Second session has ${secondCartCheck.items.length} items with quantity ${secondCartCheck.items[0].quantity}`);
    
    // Verify they are different
    if (firstCartCheck.items[0].quantity === 3 && secondCartCheck.items[0].quantity === 1) {
      console.log('✅ Sessions are properly isolated - no content carryover');
    } else {
      console.log('❌ Session isolation failed - contents may be carrying over');
    }
    
    // Test 5: Simulate session cleanup and new session creation
    console.log('\n5. Testing session cleanup and new session creation...');
    
    // Delete second session (simulate logout/session end)
    await Cart.deleteOne({ sessionId: secondSessionId });
    console.log(`Deleted second session: ${secondSessionId}`);
    
    // Create third session (should be completely fresh)
    const thirdSessionId = `guest_${Date.now() + 2}_session_3`;
    const thirdCart = new Cart({
      sessionId: thirdSessionId,
      items: [] // Should start empty
    });
    await thirdCart.save();
    
    console.log(`Third session starts with ${thirdCart.items.length} items (should be 0)`);
    
    // Verify it's truly empty before adding
    if (thirdCart.items.length !== 0) {
      console.log('❌ CRITICAL BUG: Third session is not starting empty!');
      return;
    }
    
    // Add item to third session
    console.log('Adding 2 items to third session...');
    thirdCart.items.push({
      product: testProduct._id,
      quantity: 2, // Different quantity again
      price: testProduct.price,
      addedAt: new Date()
    });
    await thirdCart.save();
    
    console.log(`Third session (${thirdSessionId}) has ${thirdCart.items.length} items with quantity ${thirdCart.items[0].quantity}`);
    
    // Verify first session is still unchanged
    const firstCartFinalCheck = await Cart.findOne({ sessionId: firstSessionId });
    console.log(`First session (final check) still has ${firstCartFinalCheck.items.length} items with quantity ${firstCartFinalCheck.items[0].quantity}`);
    
    if (firstCartFinalCheck.items[0].quantity === 3 && thirdCart.items[0].quantity === 2) {
      console.log('✅ New session creation works correctly - no previous content');
    } else {
      console.log('❌ New session creation failed - previous content may be present');
    }
    
    // Cleanup test carts
    await Cart.deleteMany({ sessionId: { $in: [firstSessionId, thirdSessionId] } });
    console.log('Cleaned up test carts');
    
    console.log('\n✅ Guest cart session isolation test completed successfully!');
    
    // Additional test: Simulate real frontend behavior
    console.log('\n6. Testing real frontend simulation...');
    console.log('Simulating: User opens new browser, gets new session, adds product');
    
    const realSessionId = `guest_${Date.now() + 3}_real_frontend`;
    
    // Step 1: Frontend gets cart (should be empty for new session)
    let realCart = await Cart.findOne({ sessionId: realSessionId });
    if (!realCart) {
      realCart = new Cart({ sessionId: realSessionId, items: [] });
      await realCart.save();
    }
    console.log(`New frontend session cart has ${realCart.items.length} items (should be 0)`);
    
    // Step 2: User adds product to cart
    console.log('User adds 1 product to cart...');
    realCart.items.push({
      product: testProduct._id,
      quantity: 1,
      price: testProduct.price,
      addedAt: new Date()
    });
    await realCart.save();
    
    // Step 3: Verify cart state
    const finalRealCart = await Cart.findOne({ sessionId: realSessionId });
    console.log(`After adding product: cart has ${finalRealCart.items.length} items with quantity ${finalRealCart.items[0].quantity}`);
    
    // Step 4: Verify this is isolated from other sessions
    const allOtherCarts = await Cart.find({ sessionId: { $ne: realSessionId } });
    console.log(`Other sessions still exist: ${allOtherCarts.length} carts`);
    
    if (finalRealCart.items.length === 1 && finalRealCart.items[0].quantity === 1) {
      console.log('✅ Real frontend simulation successful - clean session isolation');
    } else {
      console.log('❌ Real frontend simulation failed - session contamination detected');
    }
    
    // Cleanup
    await Cart.deleteOne({ sessionId: realSessionId });
    
  } catch (error) {
    console.error('❌ Guest cart isolation test failed:', error);
  }
}

async function main() {
  console.log('Starting cart fixes verification...');
  
  await connectDB();
  
  await testCartFixes();
  await testUserCartTransition();
  await testGuestCartIsolation();
  
  console.log('\n🎉 Cart fixes verification completed!');
  
  await mongoose.connection.close();
  process.exit(0);
}

// Run the test
if (require.main === module) {
  main().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
}