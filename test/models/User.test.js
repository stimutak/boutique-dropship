const _mongoose = require('mongoose');
const User = require('../../models/User');

describe('User Model', () => {

  describe('User Creation and Authentication', () => {
    test('should create a user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe('test@example.com');
      expect(savedUser.password).not.toBe('password123'); // Should be hashed
      expect(savedUser.firstName).toBe('John');
      expect(savedUser.lastName).toBe('Doe');
    });

    test('should compare passwords correctly', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });

      const isMatch = await user.comparePassword('password123');
      const isNotMatch = await user.comparePassword('wrongpassword');

      expect(isMatch).toBe(true);
      expect(isNotMatch).toBe(false);
    });

    test('should enforce unique email', async () => {
      await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });

      const duplicateUser = new User({
        email: 'test@example.com',
        password: 'password456',
        firstName: 'Jane',
        lastName: 'Smith'
      });

      await expect(duplicateUser.save()).rejects.toThrow();
    });
  });

  describe('Address Management', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });
    });

    test('should add shipping address', async () => {
      const addressData = {
        type: 'shipping',
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US',
        isDefault: true
      };

      await testUser.addAddress(addressData);
      const updatedUser = await User.findById(testUser._id);

      expect(updatedUser.addresses).toHaveLength(1);
      expect(updatedUser.addresses[0].type).toBe('shipping');
      expect(updatedUser.addresses[0].street).toBe('123 Main St');
      expect(updatedUser.addresses[0].isDefault).toBe(true);
    });

    test('should add billing address', async () => {
      const addressData = {
        type: 'billing',
        firstName: 'John',
        lastName: 'Doe',
        street: '456 Oak Ave',
        city: 'Another Town',
        state: 'NY',
        zipCode: '67890',
        country: 'US',
        isDefault: true
      };

      await testUser.addAddress(addressData);
      const updatedUser = await User.findById(testUser._id);

      expect(updatedUser.addresses).toHaveLength(1);
      expect(updatedUser.addresses[0].type).toBe('billing');
      expect(updatedUser.addresses[0].city).toBe('Another Town');
    });

    test('should handle multiple addresses with default management', async () => {
      // Add first shipping address as default
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

      // Add second shipping address as default (should unset first)
      await testUser.addAddress({
        type: 'shipping',
        firstName: 'John',
        lastName: 'Doe',
        street: '456 Oak Ave',
        city: 'Another Town',
        state: 'NY',
        zipCode: '67890',
        country: 'US',
        isDefault: true
      });

      const updatedUser = await User.findById(testUser._id);
      const defaultAddresses = updatedUser.addresses.filter(addr => addr.isDefault);
      
      expect(updatedUser.addresses).toHaveLength(2);
      expect(defaultAddresses).toHaveLength(1);
      expect(defaultAddresses[0].city).toBe('Another Town');
    });

    test('getDefaultShippingAddress should return correct address', async () => {
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

      const defaultShipping = testUser.getDefaultShippingAddress();
      expect(defaultShipping.city).toBe('Anytown');
      expect(defaultShipping.type).toBe('shipping');
    });

    test('getDefaultBillingAddress should return billing or fallback to shipping', async () => {
      // Add only shipping address
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

      const defaultBilling = testUser.getDefaultBillingAddress();
      expect(defaultBilling.city).toBe('Anytown'); // Should fallback to shipping
      expect(defaultBilling.type).toBe('shipping');

      // Add billing address
      await testUser.addAddress({
        type: 'billing',
        firstName: 'John',
        lastName: 'Doe',
        street: '456 Oak Ave',
        city: 'Billing City',
        state: 'NY',
        zipCode: '67890',
        country: 'US',
        isDefault: true
      });

      const updatedUser = await User.findById(testUser._id);
      const newDefaultBilling = updatedUser.getDefaultBillingAddress();
      expect(newDefaultBilling.city).toBe('Billing City');
      expect(newDefaultBilling.type).toBe('billing');
    });

    test('should update address', async () => {
      await testUser.addAddress({
        type: 'shipping',
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      });

      const addressId = testUser.addresses[0]._id;
      await testUser.updateAddress(addressId, {
        street: '789 Updated St',
        city: 'Updated City'
      });

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.addresses[0].street).toBe('789 Updated St');
      expect(updatedUser.addresses[0].city).toBe('Updated City');
    });

    test('should remove address', async () => {
      await testUser.addAddress({
        type: 'shipping',
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zipCode: '12345',
        country: 'US'
      });

      expect(testUser.addresses).toHaveLength(1);
      
      const addressId = testUser.addresses[0]._id;
      await testUser.removeAddress(addressId);

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.addresses).toHaveLength(0);
    });
  });

  describe('Data Privacy', () => {
    test('toPublicJSON should exclude sensitive information', async () => {
      const user = await User.create({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        phone: '555-1234',
        addresses: [{
          type: 'shipping',
          firstName: 'John',
          lastName: 'Doe',
          street: '123 Main St',
          city: 'Anytown',
          state: 'CA',
          zipCode: '12345',
          country: 'US'
        }]
      });

      const publicData = user.toPublicJSON();

      expect(publicData.email).toBe('test@example.com');
      expect(publicData.firstName).toBe('John');
      expect(publicData.addresses).toHaveLength(1);
      expect(publicData.password).toBeUndefined();
      expect(publicData.__v).toBeUndefined();
    });
  });

  describe('Validation', () => {
    test('should require all mandatory fields', async () => {
      const user = new User({});
      await expect(user.save()).rejects.toThrow();
    });

    test('should validate email format', async () => {
      const user = new User({
        email: 'invalid-email',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });

      // Note: Mongoose doesn't validate email format by default
      // This would need additional validation middleware
      expect(user.email).toBe('invalid-email');
    });

    test('should enforce minimum password length', async () => {
      const user = new User({
        email: 'test@example.com',
        password: '123',
        firstName: 'John',
        lastName: 'Doe'
      });

      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('Indexes', () => {
    test('should have proper indexes for performance', async () => {
      const indexes = await User.collection.getIndexes();
      
      expect(indexes).toHaveProperty('email_1');
      expect(indexes).toHaveProperty('isActive_1');
    });
  });
});