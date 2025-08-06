const _mongoose = require('mongoose');
const Product = require('../../models/Product');
const { createAdminUserWithToken, createRegularUserWithToken } = require('../helpers/testSetup');

describe('Product Model', () => {

  describe('Basic Product Creation', () => {
    test('should create a product with all required fields', async () => {
      const productData = {
        name: 'Amethyst Crystal',
        slug: 'amethyst-crystal',
        description: 'Beautiful purple amethyst for spiritual healing',
        shortDescription: 'Purple amethyst crystal',
        price: 29.99,
        category: 'crystals',
        wholesaler: {
          name: 'Crystal Wholesale Co',
          email: 'orders@crystalwholesale.com',
          productCode: 'AME-001',
          cost: 15.00
        }
      };

      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct.name).toBe(productData.name);
      expect(savedProduct.slug).toBe(productData.slug);
      expect(savedProduct.wholesaler.name).toBe(productData.wholesaler.name);
      expect(savedProduct.crossSiteIntegration.enabled).toBe(true);
      expect(savedProduct.crossSiteIntegration.referenceKey).toBe(productData.slug);
    });

    test('should auto-generate referenceKey from slug when cross-site integration is enabled', async () => {
      const product = new Product({
        name: 'Rose Quartz',
        slug: 'rose-quartz',
        description: 'Pink crystal for love and healing',
        shortDescription: 'Pink rose quartz',
        price: 19.99,
        category: 'crystals',
        wholesaler: {
          name: 'Crystal Wholesale Co',
          email: 'orders@crystalwholesale.com',
          productCode: 'RQ-001',
          cost: 10.00
        }
      });

      const savedProduct = await product.save();
      expect(savedProduct.crossSiteIntegration.referenceKey).toBe('rose-quartz');
    });
  });

  describe('Data Privacy Methods', () => {
    let testProduct;

    beforeEach(async () => {
      testProduct = await Product.create({
        name: 'Test Crystal',
        slug: 'test-crystal',
        description: 'Test description',
        shortDescription: 'Test short description',
        price: 25.00,
        category: 'crystals',
        wholesaler: {
          name: 'Secret Wholesaler',
          email: 'secret@wholesaler.com',
          productCode: 'SECRET-001',
          cost: 12.50
        },
        properties: {
          chakra: ['crown'],
          element: ['spirit']
        }
      });
    });

    test('toPublicJSON should exclude wholesaler information', () => {
      const publicData = testProduct.toPublicJSON();
      
      expect(publicData.name).toBe('Test Crystal');
      expect(publicData.price).toBe(25.00);
      expect(publicData.properties).toBeDefined();
      expect(publicData.wholesaler).toBeUndefined();
    });

    test('findPublic should return products without wholesaler info', async () => {
      const publicProducts = await Product.findPublic();
      
      expect(publicProducts).toHaveLength(1);
      expect(publicProducts[0].name).toBe('Test Crystal');
      expect(publicProducts[0].toObject()).not.toHaveProperty('wholesaler');
    });

    test('getCrossSiteData should return only cross-site relevant fields', () => {
      const crossSiteData = testProduct.getCrossSiteData();
      
      expect(crossSiteData.name).toBe('Test Crystal');
      expect(crossSiteData.slug).toBe('test-crystal');
      expect(crossSiteData.price).toBe(25.00);
      expect(crossSiteData.properties).toBeDefined();
      expect(crossSiteData.crossSiteIntegration).toBeDefined();
      expect(crossSiteData.wholesaler).toBeUndefined();
    });
  });

  describe('Validation', () => {
    test('should require all mandatory fields', async () => {
      const product = new Product({});
      
      await expect(product.save()).rejects.toThrow();
    });

    test('should enforce unique slug', async () => {
      await Product.create({
        name: 'First Product',
        slug: 'unique-slug',
        description: 'First description',
        shortDescription: 'First short',
        price: 10.00,
        category: 'crystals',
        wholesaler: {
          name: 'Wholesaler',
          email: 'test@wholesaler.com',
          productCode: 'TEST-001',
          cost: 5.00
        }
      });

      const duplicateProduct = new Product({
        name: 'Second Product',
        slug: 'unique-slug',
        description: 'Second description',
        shortDescription: 'Second short',
        price: 15.00,
        category: 'crystals',
        wholesaler: {
          name: 'Wholesaler',
          email: 'test@wholesaler.com',
          productCode: 'TEST-002',
          cost: 7.50
        }
      });

      await expect(duplicateProduct.save()).rejects.toThrow();
    });

    test('should validate category enum', async () => {
      const product = new Product({
        name: 'Invalid Category Product',
        slug: 'invalid-category',
        description: 'Test description',
        shortDescription: 'Test short',
        price: 10.00,
        category: 'invalid-category',
        wholesaler: {
          name: 'Wholesaler',
          email: 'test@wholesaler.com',
          productCode: 'TEST-001',
          cost: 5.00
        }
      });

      await expect(product.save()).rejects.toThrow();
    });
  });

  describe('Indexes', () => {
    test('should have proper indexes for performance', async () => {
      const indexes = await Product.collection.getIndexes();
      
      expect(indexes).toHaveProperty('slug_1');
      expect(indexes).toHaveProperty('category_1_isActive_1');
      expect(Object.keys(indexes)).toContain('crossSiteIntegration.referenceKey_1');
    });
  });
});