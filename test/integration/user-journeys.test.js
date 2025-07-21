const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const { createTestApp } = require('../helpers/testApp');

describe('Complete User Journey Integration Tests', () => {
  let app;
  let testProduct1, testProduct2;

  beforeAll(async () => {
    app = createTestApp();
  });

  beforeEach(async () => {
    // Clear all collections
    await User.deleteMany({});
    await Product.deleteMany({});
    await Order.deleteMany({});

    // Create test products
    testProduct1 = await Product.create({
      name: 'Amethyst Crystal',
      slug: 'amethyst-crystal',
      description: 'Beautiful purple amethyst for spiritual healing',
      shortDescription: 'Purple amethyst crystal',
      price: 24.99,
      category: 'crystals',
      properties: {
        chakra: ['crown', 'third-eye'],
        element: 'air',
        zodiac: ['pisces', 'aquarius']
      },
      wholesaler: {
        name: 'Crystal Wholesaler',
        email: 'crystals@wholesaler.com',
        productCode: 'AME001',
        cost: 12.50
      }
    });

    testProduct2 = await Product.create({
      name: 'White Sage Bundle',
      slug: 'white-sage-bundle',
      description: 'Premium white sage for cleansing rituals',
      shortDescription: 'White sage bundle',
      price: 15.99,
      category: 'herbs',
      properties: {
        element: 'fire',
        zodiac: ['sagittarius']
      },
      wholesaler: {
        name: 'Herb Wholesaler',
        email: 'herbs@wholesaler.com',
        productCode: 'WS001',
        cost: 8.00
      }
    });
  });

  describe('New User Registration and First Purchase Journey', () => {
    it('should complete full journey: register -> browse -> add to cart -> checkout -> payment', async () => {
      const agent = request.agent(app);
      
      // Step 1: User registers
      const registrationData = {
        email: 'newcustomer@example.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Smith'
      };

      const registerResponse = await agent
        .post('/api/auth/register')
        .send(registrationData)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe(registrationData.email);
      const userToken = registerResponse.body.data.token;

      // Step 2: Browse products
      const browseResponse = await agent
        .get('/api/products')
        .expect(200);

      expect(browseResponse.body.success).toBe(true);
      expect(browseResponse.body.products.length).toBeGreaterThan(0);

      // Step 3: View specific product
      const productResponse = await agent
        .get(`/api/products/${testProduct1.slug}`)
        .expect(200);

      expect(productResponse.body.success).toBe(true);
      expect(productResponse.body.product.name).toBe('Amethyst Crystal');
      // Ensure wholesaler info is not exposed
      expect(productResponse.body.product.wholesaler).toBeUndefined();

      // Step 4: Add items to cart
      const addToCart1 = await agent
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct1._id,
          quantity: 1
        })
        .expect(200);

      expect(addToCart1.body.success).toBe(true);

      const addToCart2 = await agent
        .post('/api/cart/add')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          productId: testProduct2._id,
          quantity: 2
        })
        .expect(200);

      expect(addToCart2.body.success).toBe(true);

      // Step 5: View cart
      const cartResponse = await agent
        .get('/api/cart')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(cartResponse.body.success).toBe(true);
      expect(cartResponse.body.data.cart.items.length).toBe(2);
      expect(cartResponse.body.data.cart.total).toBe(56.97); // 24.99 + (15.99 * 2)

      // Step 6: Create order (checkout)
      const orderData = {
        items: [
          {
            productId: testProduct1._id,
            quantity: 1,
            price: testProduct1.price
          },
          {
            productId: testProduct2._id,
            quantity: 2,
            price: testProduct2.price
          }
        ],
        shippingAddress: {
          firstName: 'Jane',
          lastName: 'Smith',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        },
        billingAddress: {
          firstName: 'Jane',
          lastName: 'Smith',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        }
      };

      const orderResponse = await agent
        .post('/api/orders/registered')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(201);

      expect(orderResponse.body.success).toBe(true);
      expect(orderResponse.body.order.total).toBe(61.53); // 56.97 + tax
      const orderId = orderResponse.body.order._id;

      // Step 7: Create payment
      const paymentResponse = await agent
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: 56.97,
          description: 'Order payment',
          orderId: orderId
        })
        .expect(200);

      expect(paymentResponse.body.success).toBe(true);
      expect(paymentResponse.body.data).toHaveProperty('paymentId');
      expect(paymentResponse.body.data).toHaveProperty('checkoutUrl');

      // Step 8: Verify order was created and user can access it
      const userOrdersResponse = await agent
        .get('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(userOrdersResponse.body.success).toBe(true);
      expect(userOrdersResponse.body.data.orders.length).toBe(1);
      expect(userOrdersResponse.body.data.orders[0]._id).toBe(orderId);
    });
  });

  describe('Guest Checkout Journey', () => {
    it('should complete guest checkout without registration', async () => {
      const agent = request.agent(app);

      // Step 1: Browse products as guest
      const browseResponse = await agent
        .get('/api/products')
        .expect(200);

      expect(browseResponse.body.success).toBe(true);

      // Step 2: Create guest order directly (simulating guest checkout)
      const guestOrderData = {
        guestInfo: {
          email: 'guest@example.com',
          firstName: 'Guest',
          lastName: 'User',
          phone: '555-123-4567'
        },
        items: [{
          product: testProduct1._id,
          quantity: 1,
          price: testProduct1.price
        }],
        shippingAddress: {
          firstName: 'Guest',
          lastName: 'User',
          street: '456 Guest Ave',
          city: 'Guest City',
          state: 'NY',
          zipCode: '54321',
          country: 'US'
        },
        billingAddress: {
          firstName: 'Guest',
          lastName: 'User',
          street: '456 Guest Ave',
          city: 'Guest City',
          state: 'NY',
          zipCode: '54321',
          country: 'US'
        },
        subtotal: testProduct1.price,
        total: testProduct1.price
      };

      const guestOrderResponse = await agent
        .post('/api/orders/guest')
        .send(guestOrderData)
        .expect(201);

      expect(guestOrderResponse.body.success).toBe(true);
      expect(guestOrderResponse.body.data.order.guestInfo.email).toBe('guest@example.com');
      expect(guestOrderResponse.body.data.order.customer).toBeUndefined();

      // Step 3: Create payment for guest order
      const orderId = guestOrderResponse.body.data.order._id;
      const paymentResponse = await agent
        .post('/api/payments/create')
        .send({
          amount: testProduct1.price,
          description: 'Guest order payment',
          orderId: orderId
        })
        .expect(200);

      expect(paymentResponse.body.success).toBe(true);
      expect(paymentResponse.body.data).toHaveProperty('paymentId');
    });
  });

  describe('Returning User Journey', () => {
    it('should handle returning user with saved preferences', async () => {
      const agent = request.agent(app);

      // Step 1: Create existing user with saved address
      const existingUser = await User.create({
        email: 'returning@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        addresses: [{
          type: 'shipping',
          firstName: 'John',
          lastName: 'Doe',
          street: '789 Return St',
          city: 'Return City',
          state: 'TX',
          zipCode: '78901',
          country: 'US',
          isDefault: true
        }]
      });

      // Step 2: Login
      const loginResponse = await agent
        .post('/api/auth/login')
        .send({
          email: 'returning@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      const userToken = loginResponse.body.token;

      // Step 3: Get profile (should include saved addresses)
      const profileResponse = await agent
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.user.addresses.length).toBe(1);
      expect(profileResponse.body.user.addresses[0].isDefault).toBe(true);

      // Step 4: Quick checkout with saved address
      const quickOrderData = {
        items: [{
          product: testProduct2._id,
          quantity: 1,
          price: testProduct2.price
        }],
        useDefaultAddress: true
      };

      const quickOrderResponse = await agent
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send(quickOrderData)
        .expect(201);

      expect(quickOrderResponse.body.success).toBe(true);
      expect(quickOrderResponse.body.data.order.shippingAddress.street).toBe('789 Return St');
    });
  });

  describe('Admin Management Journey', () => {
    it('should complete admin workflow: login -> manage products -> view orders -> process wholesaler notifications', async () => {
      const agent = request.agent(app);

      // Step 1: Create admin user
      const adminUser = await User.create({
        email: 'admin@store.com',
        password: 'adminpass123',
        firstName: 'Admin',
        lastName: 'User',
        isAdmin: true
      });

      const adminToken = jwt.sign(
        { userId: adminUser._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Step 2: Admin views all products (including wholesaler info)
      const adminProductsResponse = await agent
        .get('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(adminProductsResponse.body.success).toBe(true);
      expect(adminProductsResponse.body.data.products.length).toBeGreaterThan(0);
      // Should include wholesaler info for admin
      expect(adminProductsResponse.body.data.products[0]).toHaveProperty('wholesaler');

      // Step 3: Admin creates new product
      const newProductData = {
        name: 'Rose Quartz Heart',
        slug: 'rose-quartz-heart',
        description: 'Beautiful rose quartz carved into heart shape',
        shortDescription: 'Rose quartz heart',
        price: 18.99,
        category: 'crystals',
        properties: {
          chakra: ['heart'],
          element: 'water',
          zodiac: ['taurus', 'libra']
        },
        wholesaler: {
          name: 'Crystal Wholesaler',
          email: 'crystals@wholesaler.com',
          productCode: 'RQH001',
          cost: 9.50
        }
      };

      const createProductResponse = await agent
        .post('/api/admin/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProductData)
        .expect(201);

      expect(createProductResponse.body.success).toBe(true);
      expect(createProductResponse.body.data.product.name).toBe('Rose Quartz Heart');

      // Step 4: Create test order to manage
      const testOrder = await Order.create({
        guestInfo: {
          email: 'testorder@example.com',
          firstName: 'Test',
          lastName: 'Order'
        },
        items: [{
          product: testProduct1._id,
          quantity: 1,
          price: testProduct1.price
        }],
        shippingAddress: {
          firstName: 'Test',
          lastName: 'Order',
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        },
        billingAddress: {
          firstName: 'Test',
          lastName: 'Order',
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'US'
        },
        subtotal: testProduct1.price,
        total: testProduct1.price,
        payment: {
          method: 'card',
          status: 'paid'
        },
        status: 'processing'
      });

      // Step 5: Admin views all orders
      const adminOrdersResponse = await agent
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(adminOrdersResponse.body.success).toBe(true);
      expect(adminOrdersResponse.body.data.orders.length).toBeGreaterThan(0);

      // Step 6: Admin processes wholesaler notification
      const wholesalerNotifyResponse = await agent
        .post('/api/wholesalers/notify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          orderId: testOrder._id
        })
        .expect(200);

      expect(wholesalerNotifyResponse.body.success).toBe(true);

      // Step 7: Admin checks notification status
      const notificationStatusResponse = await agent
        .get(`/api/wholesalers/orders/${testOrder._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(notificationStatusResponse.body.success).toBe(true);
      expect(notificationStatusResponse.body.data).toHaveProperty('notifications');
    });
  });

  describe('Cross-Site Integration Journey', () => {
    it('should handle referral from sister site and track source', async () => {
      const agent = request.agent(app);

      // Step 1: Access product via cross-site integration endpoint
      const integrationResponse = await agent
        .get(`/api/integration/products/${testProduct1.slug}`)
        .set('Referer', 'https://holisticschool.com/crystal-healing-course')
        .expect(200);

      expect(integrationResponse.body.success).toBe(true);
      expect(integrationResponse.body.data.product.name).toBe('Amethyst Crystal');

      // Step 2: Create order with referral tracking
      const referralOrderData = {
        guestInfo: {
          email: 'referral@example.com',
          firstName: 'Referral',
          lastName: 'User'
        },
        items: [{
          product: testProduct1._id,
          quantity: 1,
          price: testProduct1.price
        }],
        shippingAddress: {
          firstName: 'Referral',
          lastName: 'User',
          street: '123 Referral St',
          city: 'Referral City',
          state: 'CA',
          zipCode: '90210',
          country: 'US'
        },
        billingAddress: {
          firstName: 'Referral',
          lastName: 'User',
          street: '123 Referral St',
          city: 'Referral City',
          state: 'CA',
          zipCode: '90210',
          country: 'US'
        },
        subtotal: testProduct1.price,
        total: testProduct1.price,
        referralSource: 'holistic-school'
      };

      const referralOrderResponse = await agent
        .post('/api/orders/guest')
        .send(referralOrderData)
        .expect(201);

      expect(referralOrderResponse.body.success).toBe(true);
      expect(referralOrderResponse.body.data.order.referralSource).toBe('holistic-school');
    });
  });

  describe('Error Recovery Journey', () => {
    it('should handle payment failures and allow retry', async () => {
      const agent = request.agent(app);

      // Step 1: Create user and order
      const user = await User.create({
        email: 'paymenttest@example.com',
        password: 'password123',
        firstName: 'Payment',
        lastName: 'Test'
      });

      const userToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const order = await Order.create({
        customer: user._id,
        items: [{
          product: testProduct1._id,
          quantity: 1,
          price: testProduct1.price
        }],
        shippingAddress: {
          firstName: 'Payment',
          lastName: 'Test',
          street: '123 Payment St',
          city: 'Payment City',
          state: 'NY',
          zipCode: '10001',
          country: 'US'
        },
        billingAddress: {
          firstName: 'Payment',
          lastName: 'Test',
          street: '123 Payment St',
          city: 'Payment City',
          state: 'NY',
          zipCode: '10001',
          country: 'US'
        },
        subtotal: testProduct1.price,
        total: testProduct1.price,
        payment: {
          method: 'card',
          status: 'pending'
        },
        status: 'pending'
      });

      // Step 2: Simulate payment failure
      const failedPaymentResponse = await agent
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: testProduct1.price,
          description: 'Test payment failure',
          orderId: order._id,
          simulateFailure: true // This would be handled by mock service
        })
        .expect(200); // Payment creation succeeds, but payment itself might fail

      expect(failedPaymentResponse.body.success).toBe(true);

      // Step 3: Check payment status
      const paymentId = failedPaymentResponse.body.data.paymentId;
      const statusResponse = await agent
        .get(`/api/payments/status/${paymentId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);

      // Step 4: Retry payment
      const retryPaymentResponse = await agent
        .post('/api/payments/create')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          amount: testProduct1.price,
          description: 'Retry payment',
          orderId: order._id
        })
        .expect(200);

      expect(retryPaymentResponse.body.success).toBe(true);
      expect(retryPaymentResponse.body.data).toHaveProperty('paymentId');
    });
  });

  describe('Performance and Load Scenarios', () => {
    it('should handle concurrent cart operations', async () => {
      // Create multiple users
      const users = await Promise.all([
        User.create({
          email: 'user1@concurrent.com',
          password: 'password123',
          firstName: 'User',
          lastName: 'One'
        }),
        User.create({
          email: 'user2@concurrent.com',
          password: 'password123',
          firstName: 'User',
          lastName: 'Two'
        }),
        User.create({
          email: 'user3@concurrent.com',
          password: 'password123',
          firstName: 'User',
          lastName: 'Three'
        })
      ]);

      const tokens = users.map(user => 
        jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' })
      );

      // Simulate concurrent cart operations
      const concurrentOperations = tokens.map((token, index) => 
        request(app)
          .post('/api/cart/add')
          .set('Authorization', `Bearer ${token}`)
          .send({
            productId: testProduct1._id,
            quantity: index + 1
          })
      );

      const results = await Promise.all(concurrentOperations);
      
      results.forEach((result, index) => {
        expect(result.status).toBe(200);
        expect(result.body.success).toBe(true);
      });
    });

    it('should handle bulk product queries efficiently', async () => {
      // Create additional products for bulk testing
      const bulkProducts = [];
      for (let i = 0; i < 50; i++) {
        bulkProducts.push({
          name: `Test Product ${i}`,
          slug: `test-product-${i}`,
          description: `Description for test product ${i}`,
          shortDescription: `Test product ${i}`,
          price: 10 + (i * 0.5),
          category: i % 2 === 0 ? 'crystals' : 'herbs',
          properties: {
            chakra: ['root'],
            element: 'earth'
          },
          wholesaler: {
            name: 'Bulk Wholesaler',
            email: 'bulk@wholesaler.com',
            productCode: `BP${i.toString().padStart(3, '0')}`,
            cost: 5 + (i * 0.25)
          }
        });
      }

      await Product.insertMany(bulkProducts);

      const startTime = Date.now();
      const bulkQueryResponse = await request(app)
        .get('/api/products?limit=50')
        .expect(200);
      const endTime = Date.now();

      expect(bulkQueryResponse.body.success).toBe(true);
      expect(bulkQueryResponse.body.products.length).toBeGreaterThan(40);
      
      // Should complete within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});