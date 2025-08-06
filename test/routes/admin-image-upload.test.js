const request = require('supertest');
const _mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const User = require('../../models/User');
const Product = require('../../models/Product');
const { createAdminUserWithToken, createRegularUserWithToken } = require('../helpers/testSetup');

const { createTestApp } = require('../helpers/testApp');

let app;

describe('Admin Image Upload Integration Tests', () => {
  let adminToken;
  let adminUser;

  beforeAll(async () => {
    app = createTestApp();
  });

  beforeEach(async () => {
    // Create admin user
    adminUser = await User.create({
      email: 'admin@test.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true
    });

    // Generate admin token
    adminToken = jwt.sign(
      { userId: adminUser._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  afterEach(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Product.deleteMany({});
    
    // Clean up uploaded test images
    const uploadsDir = path.join(__dirname, '../../public/images/products');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      files.forEach(file => {
        if (file.startsWith('test-')) {
          try {
            fs.unlinkSync(path.join(uploadsDir, file));
          } catch (err) {
            // Ignore cleanup errors
          }
        }
      });
    }
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Product.deleteMany({});
  });

  describe('Image Upload Integration Tests', () => {
    test('Images should be saved with new products', async () => {
      // First, upload images to get their URLs
      const testImagePath = path.join(__dirname, '../helpers/test-image.jpg');
      
      // Create a simple test image file
      const testImageBuffer = Buffer.from('fake-image-data');
      fs.writeFileSync(testImagePath, testImageBuffer);

      try {
        // Upload the image first
        const uploadResponse = await request(app)
          .post('/api/admin/products/images')
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('images', testImagePath)
          .expect(200);

        expect(uploadResponse.body.success).toBe(true);
        expect(uploadResponse.body.images).toHaveLength(1);
        
        const uploadedImage = uploadResponse.body.images[0];
        // Debug: Uploaded image info available in uploadedImage

        // Now create a product with the uploaded image
        const productData = {
          name: 'Test Product with Image',
          slug: 'test-product-with-image',
          description: 'A test product with uploaded images',
          shortDescription: 'Test product',
          price: 29.99,
          category: 'crystals',
          wholesaler: {
            name: 'Test Wholesaler',
            email: 'test@wholesaler.com',
            productCode: 'TEST001',
            cost: 15.00
          },
          isActive: true,
          images: [
            {
              url: uploadedImage.url,
              alt: uploadedImage.originalName || 'Test image',
              isPrimary: true
            }
          ]
        };

        const createResponse = await request(app)
          .post('/api/admin/products')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(productData)
          .expect(201);

        expect(createResponse.body.success).toBe(true);
        
        // THIS IS WHERE THE BUG MANIFESTS:
        // The product is created but images array might be empty or invalid
        const createdProduct = createResponse.body.data.product;
        // Debug: Created product images available in createdProduct.images
        
        // These assertions should pass but currently fail due to the bug
        expect(createdProduct.images).toHaveLength(1);
        expect(createdProduct.images[0].url).toBe(uploadedImage.url);
        expect(createdProduct.images[0].alt).toBeDefined();
        expect(createdProduct.images[0].isPrimary).toBe(true);

        // Verify the product was saved correctly in the database
        const dbProduct = await Product.findById(createdProduct._id);
        expect(dbProduct.images).toHaveLength(1);
        expect(dbProduct.images[0].url).toBe(uploadedImage.url);

      } finally {
        // Clean up test image
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('Product update should work with new images', async () => {
      // Create a product first
      const originalProduct = await Product.create({
        name: 'Original Product',
        slug: 'original-product',
        description: 'Original description',
        shortDescription: 'Original short desc',
        price: 19.99,
        category: 'crystals',
        wholesaler: {
          name: 'Test Wholesaler',
          email: 'test@wholesaler.com',
          productCode: 'ORIG001',
          cost: 10.00
        },
        isActive: true,
        images: []
      });

      // Upload a new image
      const testImagePath = path.join(__dirname, '../helpers/test-update-image.jpg');
      fs.writeFileSync(testImagePath, Buffer.from('fake-update-image-data'));

      try {
        const uploadResponse = await request(app)
          .post('/api/admin/products/images')
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('images', testImagePath)
          .expect(200);

        expect(uploadResponse.body.success).toBe(true);
        const uploadedImage = uploadResponse.body.images[0];

        // Update the product with the new image
        const updateData = {
          name: 'Updated Product with Image',
          description: 'Updated description',
          shortDescription: 'Updated short desc',
          price: 24.99,
          category: 'crystals',
          wholesaler: {
            name: 'Test Wholesaler',
            email: 'test@wholesaler.com',
            productCode: 'ORIG001',
            cost: 12.00
          },
          isActive: true,
          images: [
            {
              url: uploadedImage.url,
              alt: uploadedImage.originalName || 'Updated image',
              isPrimary: true
            }
          ]
        };

        const updateResponse = await request(app)
          .put(`/api/admin/products/${originalProduct._id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(updateData)
          .expect(200);

        // THIS IS WHERE THE UPDATE BUG MANIFESTS:
        // The error message suggests "failed to update product" 
        expect(updateResponse.body.success).toBe(true);
        
        const updatedProduct = updateResponse.body.data.product;
        expect(updatedProduct.images).toHaveLength(1);
        expect(updatedProduct.images[0].url).toBe(uploadedImage.url);

        // Verify in database
        const dbProduct = await Product.findById(originalProduct._id);
        expect(dbProduct.images).toHaveLength(1);

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('Image upload should handle file size limits correctly', async () => {
      // Create a file that exceeds the 5MB limit
      const largeImagePath = path.join(__dirname, '../helpers/large-test-image.jpg');
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'x'); // 6MB file
      fs.writeFileSync(largeImagePath, largeBuffer);

      try {
        const response = await request(app)
          .post('/api/admin/products/images')
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('images', largeImagePath)
          .expect(413); // Should return 413 Payload Too Large

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('FILE_TOO_LARGE');

      } finally {
        if (fs.existsSync(largeImagePath)) {
          fs.unlinkSync(largeImagePath);
        }
      }
    });

    test('Image upload should reject non-image files', async () => {
      // Create a text file
      const textFilePath = path.join(__dirname, '../helpers/test-document.txt');
      fs.writeFileSync(textFilePath, 'This is not an image file');

      try {
        const response = await request(app)
          .post('/api/admin/products/images')
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('images', textFilePath)
          .expect(400); // Should return 400 Bad Request

        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('INVALID_FILE_TYPE');

      } finally {
        if (fs.existsSync(textFilePath)) {
          fs.unlinkSync(textFilePath);
        }
      }
    });

    test('Images should have proper metadata after upload', async () => {
      const testImagePath = path.join(__dirname, '../helpers/metadata-test.jpg');
      fs.writeFileSync(testImagePath, Buffer.from('fake-image-for-metadata'));

      try {
        const response = await request(app)
          .post('/api/admin/products/images')
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('images', testImagePath)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.images).toHaveLength(1);
        
        const image = response.body.images[0];
        
        // These properties should exist but might be missing due to the bug
        expect(image.url).toBeDefined();
        expect(image.url).toMatch(/^\/images\/products\/.+/);
        expect(image.filename).toBeDefined();
        expect(image.originalName).toBeDefined();
        expect(image.size).toBeDefined();
        expect(image.mimeType).toBeDefined();
        
        // The uploaded file should actually exist on disk
        const fullPath = path.join(__dirname, '../../public', image.url);
        expect(fs.existsSync(fullPath)).toBe(true);

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('Multiple image upload should work correctly', async () => {
      const testImage1Path = path.join(__dirname, '../helpers/multi-test-1.jpg');
      const testImage2Path = path.join(__dirname, '../helpers/multi-test-2.jpg');
      
      fs.writeFileSync(testImage1Path, Buffer.from('fake-image-1'));
      fs.writeFileSync(testImage2Path, Buffer.from('fake-image-2'));

      try {
        const response = await request(app)
          .post('/api/admin/products/images')
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('images', testImage1Path)
          .attach('images', testImage2Path)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.images).toHaveLength(2);
        
        // Each image should have proper metadata
        response.body.images.forEach((image, _index) => {
          expect(image.url).toBeDefined();
          expect(image.filename).toBeDefined();
          expect(image.originalName).toBeDefined();
          
          // Files should exist on disk
          const fullPath = path.join(__dirname, '../../public', image.url);
          expect(fs.existsSync(fullPath)).toBe(true);
        });

      } finally {
        [testImage1Path, testImage2Path].forEach(path => {
          if (fs.existsSync(path)) {
            fs.unlinkSync(path);
          }
        });
      }
    });
  });

  describe('Current Image Upload Flow Analysis', () => {
    test('Frontend image format transformation should work correctly', async () => {
      // This test verifies that the uploaded image format is correctly transformed
      // to match the Product schema requirements
      const testImagePath = path.join(__dirname, '../helpers/frontend-test.jpg');
      fs.writeFileSync(testImagePath, Buffer.from('frontend-transform-test'));

      try {
        const uploadResponse = await request(app)
          .post('/api/admin/products/images')
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('images', testImagePath)
          .expect(200);

        expect(uploadResponse.body.success).toBe(true);
        const uploadedImage = uploadResponse.body.images[0];

        // Simulate what the frontend form should do - transform to Product schema format
        const transformedImage = {
          url: uploadedImage.url,
          alt: uploadedImage.originalName || 'Product image',
          isPrimary: true
        };

        // Create product with the properly transformed image
        const productData = {
          name: 'Frontend Transform Test Product',
          slug: 'frontend-transform-test-product',
          description: 'Testing frontend image transformation',
          shortDescription: 'Transform test',
          price: 39.99,
          category: 'crystals',
          wholesaler: {
            name: 'Test Wholesaler',
            email: 'test@wholesaler.com',
            productCode: 'TRANSFORM001',
            cost: 20.00
          },
          isActive: true,
          images: [transformedImage]
        };

        const createResponse = await request(app)
          .post('/api/admin/products')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(productData)
          .expect(201);

        expect(createResponse.body.success).toBe(true);
        
        const createdProduct = createResponse.body.data.product;
        expect(createdProduct.images).toHaveLength(1);
        expect(createdProduct.images[0].url).toBe(uploadedImage.url);
        expect(createdProduct.images[0].alt).toBe(uploadedImage.originalName);
        expect(createdProduct.images[0].isPrimary).toBe(true);

        // Verify the product was saved correctly in database
        const dbProduct = await Product.findById(createdProduct._id);
        expect(dbProduct.images).toHaveLength(1);
        expect(dbProduct.images[0].url).toBe(uploadedImage.url);
        expect(dbProduct.images[0].alt).toBe(uploadedImage.originalName);
        expect(dbProduct.images[0].isPrimary).toBe(true);

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });

    test('Analyze what the current upload endpoint returns', async () => {
      const testImagePath = path.join(__dirname, '../helpers/analyze-test.jpg');
      fs.writeFileSync(testImagePath, Buffer.from('analyze-image-data'));

      try {
        const response = await request(app)
          .post('/api/admin/products/images')
          .set('Authorization', `Bearer ${adminToken}`)
          .attach('images', testImagePath)
          .expect(200);

        // Debug: Upload response structure can be inspected if needed
        
        // Document what we're actually getting vs what we expect
        expect(response.body.success).toBe(true);
        expect(response.body.images).toBeDefined();
        
        if (response.body.images.length > 0) {
          const _image = response.body.images[0];
          // Debug: Image object structure and URL format can be inspected if needed
        }

      } finally {
        if (fs.existsSync(testImagePath)) {
          fs.unlinkSync(testImagePath);
        }
      }
    });
  });
});