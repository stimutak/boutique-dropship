const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const _path = require('path');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Review = require('../models/Review');
const { requireAdmin } = require('../middleware/auth');
// processOrderNotifications removed - not used in this route
const { csvValidator, imageValidator, cleanupTempFiles } = require('../middleware/uploadSecurity');
const { logger } = require('../utils/logger');
const { sanitizeInputMiddleware, validateObjectIdParam, sanitizeQuery } = require('../utils/inputSanitizer');

// Configure secure multer for CSV uploads
const upload = multer({
  dest: 'uploads/temp/',
  limits: csvValidator.limits,
  fileFilter: csvValidator.fileFilter,
  filename: csvValidator.generateFilename
});

// All admin routes require admin authentication and input sanitization
router.use(requireAdmin);
router.use(sanitizeInputMiddleware);

// ===== WHOLESALER MANAGEMENT =====

// GET /api/admin/wholesalers - Get all unique wholesalers
router.get('/wholesalers', async (req, res) => {
  try {
    // Get all unique wholesalers from products
    const products = await Product.find({ 'wholesaler.name': { $exists: true } })
      .select('wholesaler')
      .lean();
    
    const wholesalerMap = new Map();
    
    products.forEach(product => {
      if (product.wholesaler && product.wholesaler.name) {
        const key = product.wholesaler.email || product.wholesaler.name;
        if (!wholesalerMap.has(key)) {
          wholesalerMap.set(key, {
            name: product.wholesaler.name,
            email: product.wholesaler.email || '',
            productCodes: []
          });
        }
        if (product.wholesaler.productCode) {
          wholesalerMap.get(key).productCodes.push(product.wholesaler.productCode);
        }
      }
    });
    
    const wholesalers = Array.from(wholesalerMap.values())
      .map(w => ({
        ...w,
        productCount: w.productCodes.length
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    res.json({
      success: true,
      data: wholesalers
    });
  } catch (error) {
    logger.error('Error fetching wholesalers:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wholesalers'
    });
  }
});

// POST /api/admin/wholesalers - Add a new wholesaler
router.post('/wholesalers', [
  body('name').notEmpty().withMessage('Wholesaler name is required'),
  body('email').isEmail().withMessage('Valid email is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }
  
  try {
    const { name, email, phone, website, notes } = req.body;
    
    // Check if wholesaler already exists
    const existing = await Product.findOne({
      'wholesaler.email': email
    });
    
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Wholesaler with this email already exists'
      });
    }
    
    // For now, we just return the new wholesaler data
    // In a real app, you might want to store this in a separate Wholesaler collection
    const newWholesaler = {
      name,
      email,
      phone: phone || '',
      website: website || '',
      notes: notes || '',
      createdAt: new Date()
    };
    
    res.json({
      success: true,
      data: newWholesaler
    });
  } catch (error) {
    logger.error('Error creating wholesaler:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Failed to create wholesaler'
    });
  }
});

// ===== PRODUCT MANAGEMENT =====

// GET /api/admin/products - Get all products with admin data
router.get('/products', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      status = 'all',
      sort = 'newest',
      locale
    } = req.query;

    const query = { isDeleted: { $ne: true } }; // Exclude soft-deleted products by default
    
    // Status filter
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    
    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { 'wholesaler.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    let sortOptions = {};
    switch (sort) {
      case 'name':
        sortOptions = { name: 1 };
        break;
      case 'price-low':
        sortOptions = { price: 1 };
        break;
      case 'price-high':
        sortOptions = { price: -1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get products with full admin data (including wholesaler info)
    const products = await Product.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limitNum);

    // Add localized content if locale parameter is provided
    let processedProducts = products;
    if (locale && locale !== 'en') {
      processedProducts = products.map(product => {
        const productObj = product.toObject();
        const localizedContent = product.getLocalizedContent(locale);
        return {
          ...productObj,
          ...localizedContent
        };
      });
    }

    res.json({
      success: true,
      data: {
        products: processedProducts,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalProducts,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        },
        filters: { search, category, status, sort, locale }
      }
    });

  } catch (error) {
    logger.error('Admin products fetch error:', { error: error.message, stack: error.stack });
    res.error(500, 'ADMIN_PRODUCTS_ERROR', 'Failed to fetch products');
  }
});

// POST /api/admin/products - Create new product
router.post('/products', async (req, res) => {
  try {
    const productData = req.body;
    
    
    // Generate slug if not provided
    if (!productData.slug && productData.name) {
      productData.slug = productData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
    
    // BUGFIX: Ensure images array is properly handled
    // If images is an empty array, make sure it stays empty and doesn't create invalid documents
    if (Array.isArray(productData.images)) {
      // Filter out any invalid image objects (missing url or alt)
      productData.images = productData.images.filter(img => 
        img && typeof img === 'object' && img.url && img.alt
      );
    } else if (!productData.images) {
      // If images is undefined or null, set it to empty array
      productData.images = [];
    }
    
    const product = await Product.create(productData);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        product: product
      }
    });
    
  } catch (error) {
    logger.error('Error creating product:', { error: error.message, stack: error.stack });
    
    if (error.code === 11000) {
      return res.error(400, 'DUPLICATE_SLUG', 'Product with this slug already exists');
    }
    
    res.error(500, 'PRODUCT_CREATION_ERROR', 'Failed to create product');
  }
});

// POST /api/admin/products/bulk-import - Import products from CSV
router.post('/products/bulk-import', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.error(400, 'NO_FILE', 'CSV file is required');
    }

    // Validate uploaded file content
    try {
      await csvValidator.validateUploadedFile(req.file.path, 'csv');
    } catch (validationError) {
      return res.error(400, 'INVALID_FILE', validationError.message);
    }

    const results = [];
    const errors = [];
    let processedCount = 0;
    let successCount = 0;

    // Read and parse CSV file
    const csvData = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => csvData.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    // Process each row
    for (const [index, row] of csvData.entries()) {
      processedCount++;
      
      try {
        // Validate required fields
        if (!row.name || !row.price || !row.category || !row.wholesaler_name || !row.wholesaler_email) {
          errors.push({
            row: index + 1,
            error: 'Missing required fields: name, price, category, wholesaler_name, wholesaler_email'
          });
          continue;
        }

        // Generate slug
        const slug = row.slug || row.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        // Check for duplicate slug
        let finalSlug = slug;
        const existingProduct = await Product.findOne({ slug: finalSlug });
        if (existingProduct) {
          finalSlug = `${slug}-${Date.now()}`;
        }

        // Parse arrays from CSV
        const parseArray = (str) => str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];

        // Create product data
        const productData = {
          name: row.name.trim(),
          slug: finalSlug,
          description: row.description || row.name,
          shortDescription: row.short_description || row.description?.substring(0, 200) || row.name,
          price: parseFloat(row.price),
          compareAtPrice: row.compare_at_price ? parseFloat(row.compare_at_price) : undefined,
          category: row.category.toLowerCase(),
          tags: parseArray(row.tags),
          properties: {
            chakra: parseArray(row.chakra),
            element: parseArray(row.element),
            zodiac: parseArray(row.zodiac),
            healing: parseArray(row.healing),
            origin: row.origin,
            size: row.size,
            weight: row.weight
          },
          wholesaler: {
            name: row.wholesaler_name.trim(),
            email: row.wholesaler_email.trim(),
            productCode: row.wholesaler_product_code || row.name,
            cost: row.wholesaler_cost ? parseFloat(row.wholesaler_cost) : parseFloat(row.price) * 0.6,
            minOrderQty: row.min_order_qty ? parseInt(row.min_order_qty) : 1
          },
          seo: {
            title: row.seo_title,
            description: row.seo_description,
            keywords: parseArray(row.seo_keywords)
          },
          isActive: row.is_active !== 'false' && row.is_active !== '0',
          isFeatured: row.is_featured === 'true' || row.is_featured === '1'
        };

        // Handle images
        if (row.images) {
          productData.images = parseArray(row.images).map((url, idx) => ({
            url: url.trim(),
            alt: `${row.name} image ${idx + 1}`,
            isPrimary: idx === 0
          }));
        }

        const product = await Product.create(productData);
        results.push({
          row: index + 1,
          success: true,
          productId: product._id,
          name: product.name,
          slug: product.slug
        });
        successCount++;

      } catch (error) {
        errors.push({
          row: index + 1,
          error: error.message
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: `Bulk import completed. ${successCount}/${processedCount} products imported successfully.`,
      summary: {
        totalRows: processedCount,
        successCount,
        errorCount: errors.length
      },
      results,
      errors
    });

  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    logger.error('Bulk import error:', { error: error.message, stack: error.stack });
    res.error(500, 'BULK_IMPORT_ERROR', 'Failed to import products');
  }
});

// GET /api/admin/products/export - Export products to CSV
router.get('/products/export', async (req, res) => {
  try {
    const { category, status = 'all' } = req.query;
    
    const query = {};
    if (category && category !== 'all') {
      query.category = category;
    }
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const products = await Product.find(query).sort({ createdAt: -1 });

    // Convert to CSV format
    const csvHeaders = [
      'name', 'slug', 'description', 'short_description', 'price', 'compare_at_price',
      'category', 'tags', 'chakra', 'element', 'zodiac', 'healing', 'origin', 'size', 'weight',
      'wholesaler_name', 'wholesaler_email', 'wholesaler_product_code', 'wholesaler_cost', 'min_order_qty',
      'seo_title', 'seo_description', 'seo_keywords', 'images', 'is_active', 'is_featured',
      'created_at', 'updated_at'
    ];

    const csvRows = products.map(product => [
      product.name,
      product.slug,
      product.description,
      product.shortDescription,
      product.price,
      product.compareAtPrice || '',
      product.category,
      product.tags.join(','),
      product.properties.chakra.join(','),
      product.properties.element.join(','),
      product.properties.zodiac.join(','),
      product.properties.healing.join(','),
      product.properties.origin || '',
      product.properties.size || '',
      product.properties.weight || '',
      product.wholesaler.name,
      product.wholesaler.email,
      product.wholesaler.productCode,
      product.wholesaler.cost,
      product.wholesaler.minOrderQty,
      product.seo.title || '',
      product.seo.description || '',
      product.seo.keywords.join(','),
      product.images.map(img => img.url).join(','),
      product.isActive,
      product.isFeatured,
      product.createdAt.toISOString(),
      product.updatedAt.toISOString()
    ]);

    // Create CSV content
    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="products-export-${Date.now()}.csv"`);
    res.send(csvContent);

  } catch (error) {
    logger.error('Product export error:', { error: error.message, stack: error.stack });
    res.error(500, 'EXPORT_ERROR', 'Failed to export products');
  }
});

// GET /api/admin/products/:id - Get single product for editing
router.get('/products/:id', validateObjectIdParam('id'), async (req, res) => {
  try {
    const productId = req.params.id;
    
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.error(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }
    
    res.json({
      success: true,
      product: product
    });
    
  } catch (error) {
    logger.error('Error fetching product:', { error: error.message, stack: error.stack });
    res.error(500, 'PRODUCT_FETCH_ERROR', 'Failed to fetch product');
  }
});

// PUT /api/admin/products/:id - Update existing product
router.put('/products/:id', async (req, res) => {
  try {
    const productData = req.body;
    const productId = req.params.id;
    
    const product = await Product.findByIdAndUpdate(
      productId,
      productData,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.error(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: {
        product: product
      }
    });
    
  } catch (error) {
    logger.error('Error updating product:', { error: error.message, stack: error.stack });
    
    if (error.code === 11000) {
      return res.error(400, 'DUPLICATE_SLUG', 'Product with this slug already exists');
    }
    
    res.error(500, 'PRODUCT_UPDATE_ERROR', 'Failed to update product');
  }
});

// DELETE /api/admin/products/:id - Soft delete product
router.delete('/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.error(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }
    
    // Use soft delete method from the model
    await product.softDelete();
    
    res.json({
      success: true,
      message: 'Product archived successfully',
      data: {
        archivedProductId: productId
      }
    });
    
  } catch (error) {
    logger.error('Error archiving product:', { error: error.message, stack: error.stack });
    res.error(500, 'PRODUCT_DELETE_ERROR', 'Failed to archive product');
  }
});

// PUT /api/admin/products/:id/restore - Restore soft-deleted product
router.put('/products/:id/restore', async (req, res) => {
  try {
    const productId = req.params.id;
    
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.error(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }
    
    if (!product.isDeleted) {
      return res.error(400, 'PRODUCT_NOT_DELETED', 'Product is not archived');
    }
    
    // Use restore method from the model
    await product.restore();
    
    res.json({
      success: true,
      message: 'Product restored successfully',
      data: {
        restoredProductId: productId
      }
    });
    
  } catch (error) {
    logger.error('Error restoring product:', { error: error.message, stack: error.stack });
    res.error(500, 'PRODUCT_RESTORE_ERROR', 'Failed to restore product');
  }
});

// Configure secure multer for image uploads
const imageUpload = multer({
  dest: 'public/images/products/',
  limits: imageValidator.limits,
  fileFilter: imageValidator.fileFilter,
  filename: imageValidator.generateFilename
});

// POST /api/admin/products/images - Upload product images (generic)
router.post('/products/images', (req, res) => {
  // Custom multer error handling middleware
  imageUpload.array('images', 10)(req, res, async (err) => {
    if (err) {
      logger.error('Multer upload error:', err);
      
      // Handle specific multer errors
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.error(413, 'FILE_TOO_LARGE', 'File size exceeds the 10MB limit. Please use smaller images or compress them before uploading.');
      }
      
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.error(400, 'TOO_MANY_FILES', 'Maximum 10 files allowed');
      }
      
      if (err.message === 'Only image files are allowed') {
        return res.error(400, 'INVALID_FILE_TYPE', 'Only image files are allowed');
      }
      
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.error(400, 'UNEXPECTED_FILE', 'Unexpected file field');
      }
      
      // Generic multer error
      return res.error(400, 'UPLOAD_ERROR', err.message || 'File upload failed');
    }

    // No multer errors, proceed with the route handler
    try {
      if (!req.files || req.files.length === 0) {
        return res.error(400, 'NO_FILES', 'No image files provided');
      }

      // Validate each uploaded file
      const validatedImages = [];
      for (const file of req.files) {
        try {
          await imageValidator.validateUploadedFile(file.path, 'image');
          validatedImages.push(file);
        } catch (validationError) {
          // Clean up all files if any validation fails
          cleanupTempFiles(req.files);
          return res.error(400, 'INVALID_IMAGE', `Invalid image file: ${validationError.message}`);
        }
      }

      const images = validatedImages.map(file => ({
        url: `/images/products/${file.filename}`,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      }));

      res.json({
        success: true,
        message: `${images.length} image(s) uploaded successfully`,
        images
      });

    } catch (error) {
      logger.error('Image upload processing error:', { error: error.message, stack: error.stack });
      res.error(500, 'IMAGE_UPLOAD_ERROR', 'Failed to process uploaded images');
    }
  });
});

// POST /api/admin/products/:id/images - Upload images to specific product
router.post('/products/:id/images', async (req, res) => {
  imageUpload.array('images', 10)(req, res, async (err) => {
    if (err) {
      logger.error('Multer upload error:', err);
      
      // Handle specific multer errors (same as above)
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.error(413, 'FILE_TOO_LARGE', 'File size exceeds the 10MB limit. Please use smaller images or compress them before uploading.');
      }
      
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.error(400, 'TOO_MANY_FILES', 'Maximum 10 files allowed');
      }
      
      if (err.message === 'Only image files are allowed') {
        return res.error(400, 'INVALID_FILE_TYPE', 'Only image files are allowed');
      }
      
      return res.error(400, 'UPLOAD_ERROR', err.message || 'File upload failed');
    }

    try {
      const productId = req.params.id;
      
      // Check if product exists
      const product = await Product.findById(productId);
      if (!product) {
        return res.error(404, 'PRODUCT_NOT_FOUND', 'Product not found');
      }

      if (!req.files || req.files.length === 0) {
        return res.error(400, 'NO_FILES', 'No image files provided');
      }

      // Create image objects
      const newImages = req.files.map((file, index) => ({
        url: `/images/products/${file.filename}`,
        alt: `${product.name} image ${product.images.length + index + 1}`,
        isPrimary: product.images.length === 0 && index === 0, // First image becomes primary if no images exist
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype
      }));

      // Add images to product
      product.images.push(...newImages);
      await product.save();

      const images = newImages.map(img => ({
        url: img.url,
        alt: img.alt,
        isPrimary: img.isPrimary,
        filename: img.filename,
        originalName: img.originalName,
        size: img.size,
        mimeType: img.mimeType
      }));

      res.json({
        success: true,
        message: `${images.length} image(s) uploaded successfully to product`,
        images
      });

    } catch (error) {
      logger.error('Product image upload error:', { error: error.message, stack: error.stack });
      res.error(500, 'IMAGE_UPLOAD_ERROR', 'Failed to upload images to product');
    }
  });
});

// DELETE /api/admin/products/:id/images/:imageId - Remove specific image from product
router.delete('/products/:id/images/:imageId', async (req, res) => {
  try {
    const { id: productId, imageId } = req.params;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.error(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }

    // Find and remove the image
    const imageIndex = product.images.findIndex(img => img._id.toString() === imageId);
    if (imageIndex === -1) {
      return res.error(404, 'IMAGE_NOT_FOUND', 'Image not found');
    }

    // Remove image from product
    product.images.splice(imageIndex, 1);
    await product.save();

    res.json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    logger.error('Product image deletion error:', { error: error.message, stack: error.stack });
    res.error(500, 'IMAGE_DELETE_ERROR', 'Failed to delete image');
  }
});

// GET /api/admin/categories - Get all product categories
router.get('/categories', async (req, res) => {
  try {
    // Get categories from products with count
    const categories = await Product.aggregate([
      { $match: { isActive: true, isDeleted: { $ne: true } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    // Transform to expected format
    const categoryList = categories.map(cat => ({
      name: cat._id,
      slug: cat._id,
      count: cat.count,
      isActive: true
    }));

    res.json({
      success: true,
      categories: categoryList
    });

  } catch (error) {
    logger.error('Categories fetch error:', { error: error.message, stack: error.stack });
    res.error(500, 'CATEGORIES_ERROR', 'Failed to fetch categories');
  }
});

// POST /api/admin/categories - Create new category with i18n support
router.post('/categories', [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('slug').optional().trim(),
  body('description').optional().trim(),
  body('translations').optional().isObject(),
  body('isActive').optional().isBoolean(),
  body('sortOrder').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }

    const categoryData = req.body;
    
    // Generate slug if not provided
    if (!categoryData.slug) {
      categoryData.slug = categoryData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    // For now, we'll just return the category data as if it was saved
    // In a real implementation, you'd save this to a Category model
    const category = {
      _id: new mongoose.Types.ObjectId(),
      ...categoryData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category
    });

  } catch (error) {
    logger.error('Category creation error:', { error: error.message, stack: error.stack });
    res.error(500, 'CATEGORY_CREATION_ERROR', 'Failed to create category');
  }
});

// PUT /api/admin/products/:id/inventory - Update product inventory
router.put('/products/:id/inventory', [
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
  body('lowStockThreshold').optional().isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer'),
  body('trackInventory').optional().isBoolean().withMessage('Track inventory must be a boolean'),
  body('allowBackorder').optional().isBoolean().withMessage('Allow backorder must be a boolean'),
  body('sku').optional().trim().notEmpty().withMessage('SKU must not be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }

    const productId = req.params.id;
    const inventoryData = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.error(404, 'PRODUCT_NOT_FOUND', 'Product not found');
    }

    // Initialize inventory object if it doesn't exist
    if (!product.inventory) {
      product.inventory = {};
    }

    // Update inventory fields
    Object.keys(inventoryData).forEach(key => {
      product.inventory[key] = inventoryData[key];
    });

    await product.save();

    res.json({
      success: true,
      message: 'Inventory updated successfully',
      product: {
        _id: product._id,
        name: product.name,
        inventory: product.inventory
      }
    });

  } catch (error) {
    logger.error('Inventory update error:', { error: error.message, stack: error.stack });
    res.error(500, 'INVENTORY_UPDATE_ERROR', 'Failed to update inventory');
  }
});

// ===== ORDER MANAGEMENT =====

// GET /api/admin/orders - Get all orders with admin data
router.get('/orders', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = 'all',
      paymentStatus = 'all',
      search,
      dateFrom,
      dateTo,
      sort = 'newest',
      currency
    } = req.query;

    const query = {};
    
    // Status filters
    if (status !== 'all') {
      query.status = status;
    }
    if (paymentStatus !== 'all') {
      query['payment.status'] = paymentStatus;
    }
    
    // Currency filter
    if (currency) {
      query.currency = currency;
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {query.createdAt.$gte = new Date(dateFrom);}
      if (dateTo) {query.createdAt.$lte = new Date(dateTo);}
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'guestInfo.email': { $regex: search, $options: 'i' } },
        { 'guestInfo.firstName': { $regex: search, $options: 'i' } },
        { 'guestInfo.lastName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.firstName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    let sortOptions = {};
    switch (sort) {
      case 'order-number':
        sortOptions = { orderNumber: 1 };
        break;
      case 'total-high':
        sortOptions = { total: -1 };
        break;
      case 'total-low':
        sortOptions = { total: 1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const orders = await Order.find(query)
      .populate('customer', 'firstName lastName email')
      .populate('items.product', 'name slug price')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const totalOrders = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalOrders / limitNum);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalOrders,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        },
        filters: { status, paymentStatus, search, dateFrom, dateTo, sort, currency }
      }
    });

  } catch (error) {
    logger.error('Admin orders fetch error:', { error: error.message, stack: error.stack });
    res.error(500, 'ADMIN_ORDERS_ERROR', 'Failed to fetch orders');
  }
});

// GET /api/admin/orders/:id - Get single order with full admin data
router.get('/orders/:id', validateObjectIdParam('id'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone addresses')
      .populate('items.product', 'name slug price images category');

    if (!order) {
      return res.error(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    // Add currency conversion info
    const orderObj = order.toObject();
    
    // Add currency info with conversion details
    orderObj.currencyInfo = {
      displayTotal: orderObj.total,
      baseCurrency: orderObj.currency || 'USD',
      baseTotal: orderObj.currency === 'USD' ? orderObj.total : (orderObj.total / (orderObj.exchangeRate || 1))
    };
    
    // Ensure currency and exchangeRate are set for the test
    if (!orderObj.currency) {
      orderObj.currency = 'USD';
    }
    if (!orderObj.exchangeRate) {
      orderObj.exchangeRate = 1.0;
    }

    res.json({
      success: true,
      order: orderObj
    });

  } catch (error) {
    logger.error('Admin order fetch error:', { error: error.message, stack: error.stack });
    res.error(500, 'ADMIN_ORDER_ERROR', 'Failed to fetch order');
  }
});

// PUT /api/admin/orders/:id/status - Update order status
router.put('/orders/:id/status', [
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Invalid order status'),
  body('notes').optional().trim().isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }

    const { status, notes } = req.body;
    const updateData = { status };
    
    if (notes) {
      updateData.notes = notes;
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('customer', 'firstName lastName email preferences');

    if (!order) {
      return res.error(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    // Send shipping notification email if status changed to shipped
    if (status === 'shipped') {
      try {
        const { sendOrderStatusUpdate } = require('../utils/emailService');
        
        let customerEmail, customerName, shouldSendEmail = true, userLocale = 'en';
        
        if (order.customer) {
          // Registered user
          customerEmail = order.customer.email;
          customerName = `${order.customer.firstName} ${order.customer.lastName}`;
          shouldSendEmail = order.customer.preferences?.emailPreferences?.orderUpdates !== false;
          userLocale = order.customer.preferences?.locale || 'en';
        } else {
          // Guest user
          customerEmail = order.guestInfo?.email;
          customerName = `${order.guestInfo?.firstName} ${order.guestInfo?.lastName}`;
          userLocale = 'en'; // Default for guest users
        }
        
        if (shouldSendEmail && customerEmail) {
          const statusData = {
            orderNumber: order.orderNumber,
            customerName,
            status: 'shipped',
            trackingNumber: order.shipping?.trackingNumber
          };
          
          const emailResult = await sendOrderStatusUpdate(customerEmail, statusData, userLocale);
          if (!emailResult.success) {
            logger.error('Failed to send shipping notification:', emailResult.error);
          }
        }
      } catch (emailError) {
        logger.error('Error sending shipping notification:', emailError);
      }
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        notes: order.notes,
        updatedAt: order.updatedAt
      }
    });

  } catch (error) {
    logger.error('Order status update error:', { error: error.message, stack: error.stack });
    res.error(500, 'ORDER_UPDATE_ERROR', 'Failed to update order status');
  }
});

// POST /api/admin/orders/:id/refund - Process refund via Mollie
router.post('/orders/:id/refund', [
  body('amount').isFloat({ min: 0.01 }).withMessage('Refund amount must be greater than 0'),
  body('reason').trim().notEmpty().withMessage('Refund reason is required'),
  body('notifyCustomer').optional().isBoolean(),
  body('items').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }

    const orderId = req.params.id;
    const { amount, reason, notifyCustomer = true, items } = req.body;

    const order = await Order.findById(orderId).populate('customer', 'firstName lastName email');
    if (!order) {
      return res.error(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    // Validate refund amount doesn't exceed order total
    const existingRefunds = order.refunds || [];
    const totalRefunded = existingRefunds.reduce((sum, refund) => sum + refund.amount, 0);
    const availableForRefund = order.total - totalRefunded;

    if (amount > availableForRefund) {
      return res.error(400, 'REFUND_AMOUNT_EXCEEDS_TOTAL', 
        `Refund amount exceeds available refund amount of ${availableForRefund.toFixed(2)}`);
    }

    // Mock Mollie refund (in real app, you'd call Mollie API)
    const mollieRefundId = `re_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    const refund = {
      _id: new mongoose.Types.ObjectId(),
      amount,
      reason,
      status: 'pending',
      mollieRefundId,
      processedAt: new Date(),
      processedBy: req.user.userId,
      type: items ? 'partial' : 'full',
      items: items || [],
      notifyCustomer
    };

    // Add refund to order
    if (!order.refunds) {
      order.refunds = [];
    }
    order.refunds.push(refund);

    // Update order status if fully refunded
    if (totalRefunded + amount >= order.total) {
      order.status = 'refunded';
    }

    await order.save();

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund: {
        amount: refund.amount,
        reason: refund.reason,
        status: refund.status,
        mollieRefundId: refund.mollieRefundId,
        type: refund.type,
        processedAt: refund.processedAt
      }
    });

  } catch (error) {
    logger.error('Refund processing error:', { error: error.message, stack: error.stack });
    res.error(500, 'REFUND_ERROR', 'Failed to process refund');
  }
});

// GET /api/admin/orders/:id/shipping-label - Generate shipping label
router.get('/orders/:id/shipping-label', async (req, res) => {
  try {
    const orderId = req.params.id;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.error(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    // Mock shipping label generation (in real app, you'd integrate with shipping provider)
    const trackingNumber = `TN${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const labelUrl = `/shipping-labels/${orderId}-${trackingNumber}.pdf`;
    const carrier = 'FedEx'; // Default carrier

    // Update order with shipping info
    if (!order.shipping) {
      order.shipping = {};
    }
    order.shipping.trackingNumber = trackingNumber;
    order.shipping.labelUrl = labelUrl;
    order.shipping.carrier = carrier;
    order.shipping.labelGeneratedAt = new Date();
    
    // Update status to shipped if not already
    if (order.status === 'processing') {
      order.status = 'shipped';
    }

    await order.save();

    res.json({
      success: true,
      message: 'Shipping label generated successfully',
      shippingLabel: {
        trackingNumber,
        labelUrl,
        carrier,
        generatedAt: order.shipping.labelGeneratedAt
      }
    });

  } catch (error) {
    logger.error('Shipping label generation error:', { error: error.message, stack: error.stack });
    res.error(500, 'SHIPPING_LABEL_ERROR', 'Failed to generate shipping label');
  }
});

// ===== ANALYTICS ENDPOINTS =====

// GET /api/admin/analytics/dashboard - Get dashboard analytics
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const dateFrom = new Date();
    switch (period) {
      case '7d':
        dateFrom.setDate(dateFrom.getDate() - 7);
        break;
      case '30d':
        dateFrom.setDate(dateFrom.getDate() - 30);
        break;
      case '90d':
        dateFrom.setDate(dateFrom.getDate() - 90);
        break;
      case '1y':
        dateFrom.setFullYear(dateFrom.getFullYear() - 1);
        break;
      default:
        dateFrom.setDate(dateFrom.getDate() - 30);
    }

    const dateQuery = { createdAt: { $gte: dateFrom } };

    // Get sales metrics
    const salesMetrics = await Order.aggregate([
      { $match: { ...dateQuery, 'payment.status': 'paid' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$total' },
          totalItems: { $sum: { $size: '$items' } }
        }
      }
    ]);

    const sales = salesMetrics[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      totalItems: 0
    };

    // Get product metrics
    const productMetrics = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: { $sum: { $cond: ['$isActive', 1, 0] } },
          featuredProducts: { $sum: { $cond: ['$isFeatured', 1, 0] } }
        }
      }
    ]);

    const products = productMetrics[0] || {
      totalProducts: 0,
      activeProducts: 0,
      featuredProducts: 0
    };

    // Get user metrics
    const userMetrics = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
          adminUsers: { $sum: { $cond: ['$isAdmin', 1, 0] } },
          recentUsers: {
            $sum: { $cond: [{ $gte: ['$createdAt', dateFrom] }, 1, 0] }
          }
        }
      }
    ]);

    const users = userMetrics[0] || {
      totalUsers: 0,
      activeUsers: 0,
      adminUsers: 0,
      recentUsers: 0
    };

    res.json({
      success: true,
      analytics: {
        period,
        dateRange: {
          from: dateFrom.toISOString(),
          to: new Date().toISOString()
        },
        metrics: {
          sales: {
            ...sales,
            totalRevenue: Math.round(sales.totalRevenue * 100) / 100,
            avgOrderValue: Math.round(sales.avgOrderValue * 100) / 100
          },
          products,
          users
        }
      }
    });

  } catch (error) {
    logger.error('Analytics dashboard error:', { error: error.message, stack: error.stack });
    res.error(500, 'ANALYTICS_ERROR', 'Failed to fetch analytics data');
  }
});

// ===== EXTENDED USER MANAGEMENT =====

// GET /api/admin/users/:id - Get user details with order history
router.get('/users/:id', validateObjectIdParam('id'), async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.error(404, 'USER_NOT_FOUND', 'User not found');
    }

    // Get user's order history
    const orders = await Order.find({ customer: userId })
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 })
      .limit(10); // Last 10 orders

    // Calculate order statistics
    const allUserOrders = await Order.find({ customer: userId, 'payment.status': 'paid' });
    const totalOrders = allUserOrders.length;
    const totalSpent = allUserOrders.reduce((sum, order) => sum + order.total, 0);
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    const userObj = user.toObject();
    userObj.orderHistory = {
      orders,
      totalOrders,
      totalSpent: Math.round(totalSpent * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      firstOrderDate: allUserOrders.length > 0 ? allUserOrders[allUserOrders.length - 1].createdAt : null,
      lastOrderDate: allUserOrders.length > 0 ? allUserOrders[0].createdAt : null
    };

    res.json({
      success: true,
      user: userObj
    });

  } catch (error) {
    logger.error('User details fetch error:', { error: error.message, stack: error.stack });
    res.error(500, 'USER_DETAILS_ERROR', 'Failed to fetch user details');
  }
});

// PUT /api/admin/users/:id - Update user information
router.put('/users/:id', [
  body('firstName').optional().trim().notEmpty().withMessage('First name must not be empty'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name must not be empty'),
  body('email').optional().isEmail().withMessage('Must be a valid email'),
  body('phone').optional().trim(),
  body('preferences').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }

    const userId = req.params.id;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.password;
    delete updateData.isAdmin;
    delete updateData.isActive;

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.error(404, 'USER_NOT_FOUND', 'User not found');
    }

    res.json({
      success: true,
      message: 'User information updated successfully',
      user
    });

  } catch (error) {
    logger.error('User update error:', { error: error.message, stack: error.stack });
    
    if (error.code === 11000 && error.keyPattern?.email) {
      return res.error(400, 'EMAIL_EXISTS', 'Email address already exists');
    }
    
    res.error(500, 'USER_UPDATE_ERROR', 'Failed to update user information');
  }
});

// PUT /api/admin/users/:id/role - Change user role
router.put('/users/:id/role', [
  body('role').isIn(['admin', 'customer']).withMessage('Role must be admin or customer'),
  body('permissions').optional().isArray().withMessage('Permissions must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }

    const userId = req.params.id;
    const { role, permissions = [] } = req.body;

    const updateData = {
      isAdmin: role === 'admin',
      permissions
    };

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.error(404, 'USER_NOT_FOUND', 'User not found');
    }

    res.json({
      success: true,
      message: `User role changed to ${role} successfully`,
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        permissions: user.permissions,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    logger.error('User role update error:', { error: error.message, stack: error.stack });
    res.error(500, 'USER_ROLE_UPDATE_ERROR', 'Failed to update user role');
  }
});

// GET /api/admin/users/:id/activity - Get user activity logs
router.get('/users/:id/activity', async (req, res) => {
  try {
    const userId = req.params.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.error(404, 'USER_NOT_FOUND', 'User not found');
    }

    // Mock activity logs (in real app, you'd have an ActivityLog model)
    const mockActivityLogs = [
      {
        _id: new mongoose.Types.ObjectId(),
        action: 'login',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        _id: new mongoose.Types.ObjectId(),
        action: 'order_placed',
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        details: { orderId: 'ORD-12345', total: 64.78 }
      },
      {
        _id: new mongoose.Types.ObjectId(),
        action: 'profile_updated',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        details: { fields: ['firstName', 'preferences'] }
      }
    ];

    const activitySummary = {
      lastLogin: user.lastLogin || new Date(Date.now() - 3600000),
      totalSessions: 15,
      avgSessionDuration: '12m 34s',
      lastActivity: new Date(Date.now() - 1800000), // 30 minutes ago
      accountCreated: user.createdAt
    };

    res.json({
      success: true,
      activity: {
        logs: mockActivityLogs,
        summary: activitySummary
      }
    });

  } catch (error) {
    logger.error('User activity fetch error:', { error: error.message, stack: error.stack });
    res.error(500, 'USER_ACTIVITY_ERROR', 'Failed to fetch user activity');
  }
});

// ===== EXTENDED ANALYTICS ENDPOINTS =====

// GET /api/admin/analytics/sales - Sales analytics with multi-currency support
router.get('/analytics/sales', async (req, res) => {
  try {
    const {
      period = '30d',
      groupBy = 'day',
      currency = 'all',
      category
    } = req.query;

    // Calculate date range
    const dateFrom = new Date();
    switch (period) {
      case '7d':
        dateFrom.setDate(dateFrom.getDate() - 7);
        break;
      case '30d':
        dateFrom.setDate(dateFrom.getDate() - 30);
        break;
      case '90d':
        dateFrom.setDate(dateFrom.getDate() - 90);
        break;
      case '1y':
        dateFrom.setFullYear(dateFrom.getFullYear() - 1);
        break;
      default:
        dateFrom.setDate(dateFrom.getDate() - 30);
    }

    const dateQuery = { 
      createdAt: { $gte: dateFrom },
      'payment.status': 'paid'
    };

    // Add currency filter if specified
    if (currency !== 'all') {
      dateQuery.currency = currency;
    }

    // Get sales data
    const salesData = await Order.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: groupBy === 'day' ? '%Y-%m-%d' : '%Y-%m',
                date: '$createdAt'
              }
            },
            currency: '$currency'
          },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
          avgOrderValue: { $avg: '$total' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Group by currency
    const byCurrency = {};
    let totalRevenue = 0;
    let totalOrders = 0;

    salesData.forEach(item => {
      const curr = item._id.currency || 'USD';
      if (!byCurrency[curr]) {
        byCurrency[curr] = {
          revenue: 0,
          orders: 0,
          data: []
        };
      }
      byCurrency[curr].revenue += item.revenue;
      byCurrency[curr].orders += item.orders;
      byCurrency[curr].data.push({
        date: item._id.date,
        revenue: Math.round(item.revenue * 100) / 100,
        orders: item.orders,
        avgOrderValue: Math.round(item.avgOrderValue * 100) / 100
      });

      totalRevenue += item.revenue;
      totalOrders += item.orders;
    });

    res.json({
      success: true,
      salesAnalytics: {
        period,
        groupBy,
        filters: { currency, category },
        summary: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalOrders,
          averageOrderValue: totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0
        },
        byCurrency,
        data: salesData.map(item => ({
          date: item._id.date,
          currency: item._id.currency || 'USD',
          revenue: Math.round(item.revenue * 100) / 100,
          orders: item.orders,
          avgOrderValue: Math.round(item.avgOrderValue * 100) / 100
        }))
      }
    });

  } catch (error) {
    logger.error('Sales analytics error:', { error: error.message, stack: error.stack });
    res.error(500, 'SALES_ANALYTICS_ERROR', 'Failed to fetch sales analytics');
  }
});

// GET /api/admin/analytics/products - Product performance metrics
router.get('/analytics/products', async (req, res) => {
  try {
    const {
      period = '30d',
      sort = 'revenue',
      limit = 10
    } = req.query;

    // Calculate date range
    const dateFrom = new Date();
    switch (period) {
      case '7d':
        dateFrom.setDate(dateFrom.getDate() - 7);
        break;
      case '30d':
        dateFrom.setDate(dateFrom.getDate() - 30);
        break;
      case '90d':
        dateFrom.setDate(dateFrom.getDate() - 90);
        break;
      default:
        dateFrom.setDate(dateFrom.getDate() - 30);
    }

    // Get product performance data
    const productPerformance = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: dateFrom },
          'payment.status': 'paid'
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$productInfo.name' },
          category: { $first: '$productInfo.category' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          quantitySold: { $sum: '$items.quantity' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: sort === 'quantity' ? { quantitySold: -1 } : { revenue: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Get category performance
    const categoryPerformance = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: dateFrom },
          'payment.status': 'paid'
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $group: {
          _id: '$productInfo.category',
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          quantitySold: { $sum: '$items.quantity' },
          productCount: { $addToSet: '$items.product' }
        }
      },
      {
        $project: {
          category: '$_id',
          revenue: 1,
          quantitySold: 1,
          productCount: { $size: '$productCount' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Get product stats
    const productStats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          activeProducts: { $sum: { $cond: ['$isActive', 1, 0] } },
          lowStock: { 
            $sum: { 
              $cond: [
                { $and: [
                  { $lt: ['$inventory.stock', '$inventory.lowStockThreshold'] },
                  { $eq: ['$inventory.trackInventory', true] }
                ] }, 
                1, 
                0
              ] 
            } 
          }
        }
      }
    ]);

    const summary = productStats[0] || {
      totalProducts: 0,
      activeProducts: 0,
      lowStock: 0
    };

    // Mock low stock alerts
    const lowStockAlerts = await Product.find({
      'inventory.trackInventory': true,
      $expr: { $lt: ['$inventory.stock', '$inventory.lowStockThreshold'] }
    }).select('name inventory.stock inventory.lowStockThreshold').limit(5);

    res.json({
      success: true,
      productAnalytics: {
        period,
        sort,
        topProducts: productPerformance.map(p => ({
          _id: p._id,
          name: p.name,
          category: p.category,
          revenue: Math.round(p.revenue * 100) / 100,
          quantitySold: p.quantitySold,
          orderCount: p.orderCount
        })),
        categoryPerformance: categoryPerformance.map(c => ({
          category: c.category,
          revenue: Math.round(c.revenue * 100) / 100,
          quantitySold: c.quantitySold,
          productCount: c.productCount
        })),
        summary,
        lowStockAlerts
      }
    });

  } catch (error) {
    logger.error('Product analytics error:', { error: error.message, stack: error.stack });
    res.error(500, 'PRODUCT_ANALYTICS_ERROR', 'Failed to fetch product analytics');
  }
});

// GET /api/admin/analytics/customers - Customer insights by country
router.get('/analytics/customers', async (req, res) => {
  try {
    const {
      period = '30d',
      groupBy = 'country'
    } = req.query;

    // Calculate date range
    const dateFrom = new Date();
    switch (period) {
      case '7d':
        dateFrom.setDate(dateFrom.getDate() - 7);
        break;
      case '30d':
        dateFrom.setDate(dateFrom.getDate() - 30);
        break;
      case '90d':
        dateFrom.setDate(dateFrom.getDate() - 90);
        break;
      default:
        dateFrom.setDate(dateFrom.getDate() - 30);
    }

    let groupField;
    switch (groupBy) {
      case 'country':
        groupField = '$shippingAddress.country';
        break;
      case 'language':
        groupField = '$guestInfo.language';
        break;
      default:
        groupField = '$shippingAddress.country';
    }

    // Get customer data grouped by specified field
    const customerData = await Order.aggregate([
      { $match: { createdAt: { $gte: dateFrom } } },
      {
        $group: {
          _id: groupField,
          customers: { $addToSet: '$customer' },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      {
        $project: {
          [groupBy]: '$_id',
          customerCount: { $size: '$customers' },
          orders: 1,
          revenue: 1,
          avgOrderValue: { $divide: ['$revenue', '$orders'] }
        }
      },
      { $sort: { customerCount: -1 } }
    ]);

    // Get overall customer stats
    const totalCustomers = await User.countDocuments();
    const newCustomers = await User.countDocuments({ createdAt: { $gte: dateFrom } });
    
    // Get returning customers (customers with more than 1 order)
    const returningCustomersData = await Order.aggregate([
      { $match: { customer: { $exists: true } } },
      { $group: { _id: '$customer', orderCount: { $sum: 1 } } },
      { $match: { orderCount: { $gt: 1 } } },
      { $count: 'returningCustomers' }
    ]);
    const returningCustomers = returningCustomersData[0]?.returningCustomers || 0;

    const result = {
      period,
      groupBy,
      summary: {
        totalCustomers,
        newCustomers,
        returningCustomers,
        customerRetentionRate: totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 100) : 0
      }
    };

    // Add grouped data
    if (groupBy === 'country') {
      result.byCountry = customerData.map(item => ({
        country: item.country || 'Unknown',
        customerCount: item.customerCount,
        orders: item.orders,
        revenue: Math.round(item.revenue * 100) / 100,
        avgOrderValue: Math.round(item.avgOrderValue * 100) / 100
      }));
      result.topCountries = result.byCountry.slice(0, 5);
    } else if (groupBy === 'language') {
      result.byLanguage = customerData.map(item => ({
        language: item.language || 'en',
        customerCount: item.customerCount,
        orders: item.orders,
        revenue: Math.round(item.revenue * 100) / 100
      }));
    }

    res.json({
      success: true,
      customerAnalytics: result
    });

  } catch (error) {
    logger.error('Customer analytics error:', { error: error.message, stack: error.stack });
    res.error(500, 'CUSTOMER_ANALYTICS_ERROR', 'Failed to fetch customer analytics');
  }
});

// GET /api/admin/analytics/revenue - Revenue analytics by currency
router.get('/analytics/revenue', async (req, res) => {
  try {
    const {
      period = '30d',
      groupBy = 'currency'
    } = req.query;

    // Calculate date range
    const dateFrom = new Date();
    switch (period) {
      case '7d':
        dateFrom.setDate(dateFrom.getDate() - 7);
        break;
      case '30d':
        dateFrom.setDate(dateFrom.getDate() - 30);
        break;
      case '90d':
        dateFrom.setDate(dateFrom.getDate() - 90);
        break;
      case '1y':
        dateFrom.setFullYear(dateFrom.getFullYear() - 1);
        break;
      default:
        dateFrom.setDate(dateFrom.getDate() - 30);
    }

    // Get revenue data by currency
    const revenueData = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: dateFrom },
          'payment.status': 'paid'
        }
      },
      {
        $group: {
          _id: '$currency',
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
          avgOrderValue: { $avg: '$total' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // Calculate trends (mock data for growth rates)
    const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
    
    // Mock previous period data for trend calculation
    const previousPeriodRevenue = totalRevenue * 0.85; // Simulate 15% growth
    const growthRate = ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100;

    // Calculate projected revenue (simple linear projection)
    const daysInPeriod = Math.ceil((new Date() - dateFrom) / (1000 * 60 * 60 * 24));
    const dailyRevenue = totalRevenue / daysInPeriod;
    const projectedMonthlyRevenue = dailyRevenue * 30;

    const byCurrency = {};
    revenueData.forEach(item => {
      const currency = item._id || 'USD';
      byCurrency[currency] = {
        revenue: Math.round(item.revenue * 100) / 100,
        orders: item.orders,
        avgOrderValue: Math.round(item.avgOrderValue * 100) / 100,
        percentage: Math.round((item.revenue / totalRevenue) * 100)
      };
    });

    res.json({
      success: true,
      revenueAnalytics: {
        period,
        groupBy,
        summary: {
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          growthRate: Math.round(growthRate * 100) / 100,
          projectedRevenue: Math.round(projectedMonthlyRevenue * 100) / 100
        },
        byCurrency,
        trends: {
          growthRate: Math.round(growthRate * 100) / 100,
          trending: growthRate > 0 ? 'up' : 'down',
          projectedMonthlyRevenue: Math.round(projectedMonthlyRevenue * 100) / 100
        }
      }
    });

  } catch (error) {
    logger.error('Revenue analytics error:', { error: error.message, stack: error.stack });
    res.error(500, 'REVENUE_ANALYTICS_ERROR', 'Failed to fetch revenue analytics');
  }
});

// GET /api/admin/analytics/export - Export analytics data
router.get('/analytics/export', async (req, res) => {
  try {
    const {
      type = 'sales',
      format = 'csv',
      period = '30d'
    } = req.query;

    // Calculate date range
    const dateFrom = new Date();
    switch (period) {
      case '7d':
        dateFrom.setDate(dateFrom.getDate() - 7);
        break;
      case '30d':
        dateFrom.setDate(dateFrom.getDate() - 30);
        break;
      case '90d':
        dateFrom.setDate(dateFrom.getDate() - 90);
        break;
      default:
        dateFrom.setDate(dateFrom.getDate() - 30);
    }

    let exportData = [];
    let filename = '';

    if (type === 'sales') {
      // Export sales data
      const salesData = await Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: dateFrom },
            'payment.status': 'paid'
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
            avgOrderValue: { $avg: '$total' }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      exportData = salesData.map(item => ({
        Date: item._id,
        Revenue: Math.round(item.revenue * 100) / 100,
        Orders: item.orders,
        'Average Order Value': Math.round(item.avgOrderValue * 100) / 100
      }));

      filename = `sales-export-${period}-${Date.now()}`;

    } else if (type === 'products') {
      // Export product performance data
      const productData = await Order.aggregate([
        { 
          $match: { 
            createdAt: { $gte: dateFrom },
            'payment.status': 'paid'
          }
        },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        { $unwind: '$productInfo' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$productInfo.name' },
            category: { $first: '$productInfo.category' },
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
            quantitySold: { $sum: '$items.quantity' },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { revenue: -1 } }
      ]);

      exportData = productData.map(item => ({
        'Product Name': item.name,
        Category: item.category,
        Revenue: Math.round(item.revenue * 100) / 100,
        'Quantity Sold': item.quantitySold,
        'Order Count': item.orderCount
      }));

      filename = `products-export-${period}-${Date.now()}`;
    }

    if (format === 'csv') {
      // Generate CSV
      if (exportData.length === 0) {
        return res.error(400, 'NO_DATA', 'No data available for export');
      }

      const headers = Object.keys(exportData[0]);
      const csvRows = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => `"${String(row[header]).replace(/"/g, '""')}"`).join(',')
        )
      ];

      const csvContent = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csvContent);

    } else if (format === 'json') {
      // Generate JSON
      const jsonData = {
        exportType: type,
        period,
        generatedAt: new Date().toISOString(),
        recordCount: exportData.length,
        exportData
      };

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
      res.json(jsonData);
    } else {
      return res.error(400, 'INVALID_FORMAT', 'Format must be csv or json');
    }

  } catch (error) {
    logger.error('Analytics export error:', { error: error.message, stack: error.stack });
    res.error(500, 'EXPORT_ERROR', 'Failed to export analytics data');
  }
});

// ===== USER MANAGEMENT =====

// GET /api/admin/users - Get all users
router.get('/users', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status = 'all',
      role = 'all',
      sort = 'newest'
    } = req.query;

    const query = {};
    
    // Status filter
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    
    // Role filter
    if (role === 'admin') {
      query.isAdmin = true;
    } else if (role === 'customer') {
      query.isAdmin = false;
    }
    
    // Search filter
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    let sortOptions = {};
    switch (sort) {
      case 'name':
        sortOptions = { firstName: 1, lastName: 1 };
        break;
      case 'email':
        sortOptions = { email: 1 };
        break;
      case 'last-login':
        sortOptions = { lastLogin: -1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const users = await User.find(query)
      .select('-password')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limitNum);

    res.json({
      success: true,
      users,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalUsers,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      filters: { search, status, role, sort }
    });

  } catch (error) {
    logger.error('Admin users fetch error:', { error: error.message, stack: error.stack });
    res.error(500, 'ADMIN_USERS_ERROR', 'Failed to fetch users');
  }
});

// PUT /api/admin/users/:id/status - Update user status
router.put('/users/:id/status', [
  body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  body('isAdmin').optional().isBoolean().withMessage('isAdmin must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.validationError(errors);
    }

    const { isActive, isAdmin } = req.body;
    const updateData = { isActive };
    
    if (typeof isAdmin === 'boolean') {
      updateData.isAdmin = isAdmin;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.error(404, 'USER_NOT_FOUND', 'User not found');
    }

    res.json({
      success: true,
      message: 'User status updated successfully',
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
        isAdmin: user.isAdmin,
        updatedAt: user.updatedAt
      }
    });

  } catch (error) {
    logger.error('User status update error:', { error: error.message, stack: error.stack });
    res.error(500, 'USER_UPDATE_ERROR', 'Failed to update user status');
  }
});

// ===== REVIEW MANAGEMENT =====

// GET /api/admin/reviews - Get all reviews with filtering and pagination
router.get('/reviews', async (req, res) => {
  try {
    const {
      status,
      productId,
      userId,
      rating,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    // Build filter query
    const filter = {};
    if (status) {filter.status = status;}
    if (productId) {filter.product = productId;}
    if (userId) {filter.user = userId;}
    if (rating) {filter.rating = parseInt(rating);}

    // Parse pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get reviews with populated user and product info
    const reviews = await Review.find(filter)
      .populate('user', 'firstName lastName email')
      .populate('product', 'name slug images price')
      .populate('approvedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const totalReviews = await Review.countDocuments(filter);

    res.json({
      success: true,
      reviews: reviews.map(review => ({
        _id: review._id,
        product: {
          _id: review.product._id,
          name: review.product.name,
          slug: review.product.slug,
          images: review.product.images,
          price: review.product.price
        },
        user: {
          _id: review.user._id,
          firstName: review.user.firstName,
          lastName: review.user.lastName,
          email: review.user.email
        },
        rating: review.rating,
        comment: review.comment,
        status: review.status,
        adminNotes: review.adminNotes,
        helpful: review.helpful,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        approvedBy: review.approvedBy ? {
          _id: review.approvedBy._id,
          firstName: review.approvedBy.firstName,
          lastName: review.approvedBy.lastName
        } : null,
        approvedAt: review.approvedAt,
        rejectedBy: review.rejectedBy ? {
          _id: review.rejectedBy._id,
          firstName: review.rejectedBy.firstName,
          lastName: review.rejectedBy.lastName
        } : null,
        rejectedAt: review.rejectedAt
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalReviews,
        pages: Math.ceil(totalReviews / limitNum)
      }
    });

  } catch (error) {
    logger.error('Admin reviews fetch error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: {
        code: 'REVIEWS_FETCH_ERROR',
        message: 'Failed to fetch reviews'
      }
    });
  }
});

// PUT /api/admin/reviews/:id/approve - Approve a review
router.put('/reviews/:id/approve', [
  body('adminNotes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Admin notes must be less than 1000 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed'
        },
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { adminNotes } = req.body;
    const adminId = req.user._id;

    // Find the review
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REVIEW_NOT_FOUND',
          message: 'Review not found'
        }
      });
    }

    // Check if already approved
    if (review.status === 'approved') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_APPROVED',
          message: 'Review is already approved'
        }
      });
    }

    // Approve the review
    await review.approve(adminId, adminNotes);

    // Populate for response
    await review.populate('user', 'firstName lastName email');
    await review.populate('product', 'name slug');
    await review.populate('approvedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Review approved successfully',
      review: {
        _id: review._id,
        product: review.product,
        user: review.user,
        rating: review.rating,
        comment: review.comment,
        status: review.status,
        adminNotes: review.adminNotes,
        approvedBy: review.approvedBy._id,
        approvedAt: review.approvedAt,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt
      }
    });

  } catch (error) {
    logger.error('Review approval error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: {
        code: 'REVIEW_APPROVAL_ERROR',
        message: 'Failed to approve review'
      }
    });
  }
});

// PUT /api/admin/reviews/:id/reject - Reject a review
router.put('/reviews/:id/reject', [
  body('adminNotes')
    .notEmpty()
    .withMessage('Admin notes are required for rejection')
    .isLength({ max: 1000 })
    .withMessage('Admin notes must be less than 1000 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed'
        },
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { adminNotes } = req.body;
    const adminId = req.user._id;

    // Find the review
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REVIEW_NOT_FOUND',
          message: 'Review not found'
        }
      });
    }

    // Check if already rejected
    if (review.status === 'rejected') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_REJECTED',
          message: 'Review is already rejected'
        }
      });
    }

    // Reject the review
    await review.reject(adminId, adminNotes);

    // Populate for response
    await review.populate('user', 'firstName lastName email');
    await review.populate('product', 'name slug');
    await review.populate('rejectedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Review rejected successfully',
      review: {
        _id: review._id,
        product: review.product,
        user: review.user,
        rating: review.rating,
        comment: review.comment,
        status: review.status,
        adminNotes: review.adminNotes,
        rejectedBy: review.rejectedBy._id,
        rejectedAt: review.rejectedAt,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt
      }
    });

  } catch (error) {
    logger.error('Review rejection error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: {
        code: 'REVIEW_REJECTION_ERROR',
        message: 'Failed to reject review'
      }
    });
  }
});

// DELETE /api/admin/reviews/:id - Delete a review
router.delete('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete the review
    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REVIEW_NOT_FOUND',
          message: 'Review not found'
        }
      });
    }

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    logger.error('Review deletion error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: {
        code: 'REVIEW_DELETION_ERROR',
        message: 'Failed to delete review'
      }
    });
  }
});

// GET /api/admin/reviews/stats - Get review statistics
router.get('/reviews/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {dateFilter.createdAt.$gte = new Date(startDate);}
      if (endDate) {dateFilter.createdAt.$lte = new Date(endDate);}
    }

    // Get basic counts
    const [total, pending, approved, rejected] = await Promise.all([
      Review.countDocuments(dateFilter),
      Review.countDocuments({ ...dateFilter, status: 'pending' }),
      Review.countDocuments({ ...dateFilter, status: 'approved' }),
      Review.countDocuments({ ...dateFilter, status: 'rejected' })
    ]);

    // Get average rating for approved reviews
    const ratingStats = await Review.aggregate([
      { $match: { ...dateFilter, status: 'approved' } },
      { $group: { _id: null, averageRating: { $avg: '$rating' } } }
    ]);

    const averageRating = ratingStats.length > 0 ? 
      Math.round(ratingStats[0].averageRating * 10) / 10 : 0;

    res.json({
      success: true,
      stats: {
        total,
        pending,
        approved,
        rejected,
        averageRating
      }
    });

  } catch (error) {
    logger.error('Review stats error:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: {
        code: 'REVIEW_STATS_ERROR',
        message: 'Failed to fetch review statistics'
      }
    });
  }
});

module.exports = router;