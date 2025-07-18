const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const authRoutes = require('../../routes/auth');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
};

describe('Auth Routes', () => {
  let app;
  let testUser;
  let authToken;
  
  const validUserData = {
    email: 'test@example.com',
    password: 'password123',
    firstName: 'John',
    lastName: 'Doe',
    phone: '555-123-4567'
  };
  
  beforeAll(async () => {
    // Set JWT secret for testing
    process.env.JWT_SECRET = 'test-secret';
    
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/holistic-store-test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    app = createTestApp();
  });
  
  beforeEach(async () => {
    // Clear database
    await User.deleteMany({});
    
    // Create test user for login tests
    testUser = await User.create(validUserData);
    authToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  });
  
  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  describe('POST /api/auth/register', () => {
    it('should register new user successfully', async () => {
      const newUserData = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '555-987-6543'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(newUserData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.user.firstName).toBe('Jane');
      expect(response.body.user.lastName).toBe('Smith');
      expect(response.body.user.password).toBeUndefined(); // Should not expose password
      
      // Verify user was saved to database
      const savedUser = await User.findOne({ email: 'newuser@example.com' });
      expect(savedUser).toBeTruthy();
      expect(savedUser.lastLogin).toBeDefined();
    });
    
    it('should reject registration with existing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(409);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_EXISTS');
    });
    
    it('should validate required fields', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123', // Too short
        firstName: '',
        lastName: 'Doe'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Valid email is required' }),
          expect.objectContaining({ msg: 'Password must be at least 6 characters long' }),
          expect.objectContaining({ msg: 'First name is required and must be less than 50 characters' })
        ])
      );
    });
    
    it('should handle optional phone number', async () => {
      const userWithoutPhone = {
        email: 'nophone@example.com',
        password: 'password123',
        firstName: 'No',
        lastName: 'Phone'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userWithoutPhone)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user.phone).toBeUndefined();
    });
  });
  
  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: validUserData.email,
        password: validUserData.password
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(validUserData.email);
      expect(response.body.user.password).toBeUndefined();
      
      // Verify last login was updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.lastLogin).toBeDefined();
    });
    
    it('should reject invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: validUserData.password
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
    
    it('should reject invalid password', async () => {
      const loginData = {
        email: validUserData.email,
        password: 'wrongpassword'
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
    
    it('should reject inactive user', async () => {
      testUser.isActive = false;
      await testUser.save();
      
      const loginData = {
        email: validUserData.email,
        password: validUserData.password
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
    
    it('should validate login input', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: ''
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
  
  describe('GET /api/auth/profile', () => {
    it('should return user profile for authenticated user', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(validUserData.email);
      expect(response.body.user.firstName).toBe(validUserData.firstName);
      expect(response.body.user.password).toBeUndefined();
    });
    
    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });
    
    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });
  
  describe('PUT /api/auth/profile', () => {
    it('should update user profile', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '555-999-8888',
        preferences: {
          newsletter: true,
          notifications: false
        }
      };
      
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile updated successfully');
      expect(response.body.user.firstName).toBe('Updated');
      expect(response.body.user.lastName).toBe('Name');
      expect(response.body.user.phone).toBe('555-999-8888');
      expect(response.body.user.preferences.newsletter).toBe(true);
      
      // Verify in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.preferences.newsletter).toBe(true);
    });
    
    it('should require authentication', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .send({ firstName: 'Test' })
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });

    it('should update profile with new address', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        addresses: [{
          street: '123 New Street',
          city: 'New City',
          state: 'NY',
          zipCode: '10001',
          country: 'US'
        }]
      };
      
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user.addresses).toHaveLength(1);
      expect(response.body.user.addresses[0].street).toBe('123 New Street');
      expect(response.body.user.addresses[0].city).toBe('New City');
      expect(response.body.user.addresses[0].type).toBe('shipping');
      expect(response.body.user.addresses[0].isDefault).toBe(true);
      
      // Verify in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.addresses).toHaveLength(1);
      expect(updatedUser.addresses[0].street).toBe('123 New Street');
    });

    it('should update existing address when user already has one', async () => {
      // First add an address
      await testUser.addAddress({
        type: 'shipping',
        firstName: 'John',
        lastName: 'Doe',
        street: '456 Old Street',
        city: 'Old City',
        state: 'CA',
        zipCode: '90210',
        country: 'US',
        isDefault: true
      });
      
      const updateData = {
        addresses: [{
          street: '789 Updated Street',
          city: 'Updated City',
          state: 'TX',
          zipCode: '75001',
          country: 'US'
        }]
      };
      
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user.addresses).toHaveLength(1);
      expect(response.body.user.addresses[0].street).toBe('789 Updated Street');
      expect(response.body.user.addresses[0].city).toBe('Updated City');
      expect(response.body.user.addresses[0].state).toBe('TX');
      
      // Verify in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.addresses).toHaveLength(1);
      expect(updatedUser.addresses[0].street).toBe('789 Updated Street');
    });

    it('should handle partial address updates', async () => {
      const updateData = {
        firstName: 'Updated',
        addresses: [{
          street: '123 Partial Street',
          city: 'Partial City'
          // Missing state, zipCode - should not create address
        }]
      };
      
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user.addresses).toHaveLength(0); // No address created due to missing required fields
      
      // Verify in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.addresses).toHaveLength(0);
    });

    it('should not create address when all fields are empty', async () => {
      const updateData = {
        firstName: 'Updated',
        addresses: [{
          street: '',
          city: '',
          state: '',
          zipCode: ''
        }]
      };
      
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user.addresses).toHaveLength(0);
      
      // Verify in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.addresses).toHaveLength(0);
    });

    it('should handle empty addresses array', async () => {
      const updateData = {
        firstName: 'Updated',
        addresses: []
      };
      
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user.firstName).toBe('Updated');
      // Should not affect existing addresses
    });

    it('should handle null addresses', async () => {
      const updateData = {
        firstName: 'Updated',
        addresses: null
      };
      
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user.firstName).toBe('Updated');
    });

    it('should use firstName and lastName from update for new address', async () => {
      const updateData = {
        firstName: 'NewFirst',
        lastName: 'NewLast',
        addresses: [{
          street: '123 Test Street',
          city: 'Test City',
          state: 'CA',
          zipCode: '90210'
        }]
      };
      
      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.user.addresses[0].firstName).toBe('NewFirst');
      expect(response.body.user.addresses[0].lastName).toBe('NewLast');
    });
  });
  
  describe('Address Management', () => {
    describe('POST /api/auth/addresses', () => {
      it('should add new address', async () => {
        const addressData = {
          type: 'shipping',
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US',
          phone: '555-123-4567',
          isDefault: true
        };
        
        const response = await request(app)
          .post('/api/auth/addresses')
          .set('Authorization', `Bearer ${authToken}`)
          .send(addressData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Address added successfully');
        expect(response.body.user.addresses).toHaveLength(1);
        expect(response.body.user.addresses[0].type).toBe('shipping');
        expect(response.body.user.addresses[0].isDefault).toBe(true);
      });
      
      it('should reject invalid address type', async () => {
        const addressData = {
          type: 'invalid',
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        };
        
        const response = await request(app)
          .post('/api/auth/addresses')
          .set('Authorization', `Bearer ${authToken}`)
          .send(addressData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_ADDRESS_TYPE');
      });
      
      it('should require authentication', async () => {
        const response = await request(app)
          .post('/api/auth/addresses')
          .send({ type: 'shipping' })
          .expect(401);
        
        expect(response.body.success).toBe(false);
      });
    });
    
    describe('PUT /api/auth/addresses/:addressId', () => {
      it('should update existing address', async () => {
        // Add address first
        const addressData = {
          type: 'shipping',
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        };
        
        await testUser.addAddress(addressData);
        const addressId = testUser.addresses[0]._id;
        
        const updateData = {
          street: '456 Oak Ave',
          city: 'Newtown'
        };
        
        const response = await request(app)
          .put(`/api/auth/addresses/${addressId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Address updated successfully');
        
        // Verify update
        const updatedUser = await User.findById(testUser._id);
        expect(updatedUser.addresses[0].street).toBe('456 Oak Ave');
        expect(updatedUser.addresses[0].city).toBe('Newtown');
      });
      
      it('should return 404 for non-existent address', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        
        const response = await request(app)
          .put(`/api/auth/addresses/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ street: 'Test' })
          .expect(404);
        
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('ADDRESS_NOT_FOUND');
      });
    });
    
    describe('DELETE /api/auth/addresses/:addressId', () => {
      it('should remove address', async () => {
        // Add address first
        const addressData = {
          type: 'shipping',
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        };
        
        await testUser.addAddress(addressData);
        const addressId = testUser.addresses[0]._id;
        
        const response = await request(app)
          .delete(`/api/auth/addresses/${addressId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Address removed successfully');
        
        // Verify removal
        const updatedUser = await User.findById(testUser._id);
        expect(updatedUser.addresses).toHaveLength(0);
      });
    });
  });
  
  describe('GET /api/auth/checkout-preferences', () => {
    it('should return checkout preferences with addresses', async () => {
      // Add addresses
      await testUser.addAddress({
        type: 'shipping',
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US',
        isDefault: true
      });
      
      await testUser.addAddress({
        type: 'billing',
        firstName: 'John',
        lastName: 'Doe',
        street: '456 Oak Ave',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US',
        isDefault: true
      });
      
      const response = await request(app)
        .get('/api/auth/checkout-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.preferences.hasAddresses).toBe(true);
      expect(response.body.preferences.hasDefaultShipping).toBe(true);
      expect(response.body.preferences.hasDefaultBilling).toBe(true);
      expect(response.body.preferences.defaultShippingAddress).toBeDefined();
      expect(response.body.preferences.defaultBillingAddress).toBeDefined();
      expect(response.body.preferences.allAddresses).toHaveLength(2);
    });
    
    it('should return empty preferences for user without addresses', async () => {
      const response = await request(app)
        .get('/api/auth/checkout-preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.preferences.hasAddresses).toBe(false);
      expect(response.body.preferences.hasDefaultShipping).toBe(false);
      expect(response.body.preferences.hasDefaultBilling).toBe(false);
      expect(response.body.preferences.allAddresses).toHaveLength(0);
    });
    
    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/auth/checkout-preferences')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });
    
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/auth/forgot-password', () => {
    it('should handle password reset request', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: validUserData.email })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');
    });
    
    it('should return same response for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');
    });
    
    it('should require email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_REQUIRED');
    });
  });
});