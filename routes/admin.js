const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { requireAdmin } = require('../middleware/auth');
const { processOrderNotifications } = require('../utils/wholesalerNotificationService');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

// All admin routes require admin authentication
router.use(requireAdmin);

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
      sort = 'newest'
    } = req.query;

    let query = {};
    
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

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalProducts,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        },
        filters: { search, category, status, sort }
      }
    });

  } catch (error) {
    console.error('Admin products fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADMIN_PRODUCTS_ERROR',
        message: 'Failed to fetch products'
      }
    });
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
    
    const product = await Product.create(productData);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: {
        product: product
      }
    });
    
  } catch (error) {
    console.error('Error creating product:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'DUPLICATE_SLUG',
          message: 'Product with this slug already exists'
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        code: 'PRODUCT_CREATION_ERROR',
        message: 'Failed to create product'
      }
    });
  }
});

// POST /api/admin/products/bulk-import - Import products from CSV
router.post('/products/bulk-import', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE',
          message: 'CSV file is required'
        }
      });
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
    
    console.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'BULK_IMPORT_ERROR',
        message: 'Failed to import products'
      }
    });
  }
});

// GET /api/admin/products/export - Export products to CSV
router.get('/products/export', async (req, res) => {
  try {
    const { category, status = 'all' } = req.query;
    
    let query = {};
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
    console.error('Product export error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EXPORT_ERROR',
        message: 'Failed to export products'
      }
    });
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
      sort = 'newest'
    } = req.query;

    let query = {};
    
    // Status filters
    if (status !== 'all') {
      query.status = status;
    }
    if (paymentStatus !== 'all') {
      query['payment.status'] = paymentStatus;
    }
    
    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
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
        filters: { status, paymentStatus, search, dateFrom, dateTo, sort }
      }
    });

  } catch (error) {
    console.error('Admin orders fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADMIN_ORDERS_ERROR',
        message: 'Failed to fetch orders'
      }
    });
  }
});

// GET /api/admin/orders/:id - Get single order with full admin data
router.get('/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone addresses')
      .populate('items.product', 'name slug price images category');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error('Admin order fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADMIN_ORDER_ERROR',
        message: 'Failed to fetch order'
      }
    });
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
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
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
    ).populate('customer', 'firstName lastName email');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
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
    console.error('Order status update error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORDER_UPDATE_ERROR',
        message: 'Failed to update order status'
      }
    });
  }
});

// ===== ANALYTICS ENDPOINTS =====

// GET /api/admin/analytics/dashboard - Get dashboard analytics
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    let dateFrom = new Date();
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
    console.error('Analytics dashboard error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to fetch analytics data'
      }
    });
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

    let query = {};
    
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
    console.error('Admin users fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ADMIN_USERS_ERROR',
        message: 'Failed to fetch users'
      }
    });
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
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: errors.array()
        }
      });
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
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
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
    console.error('User status update error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'USER_UPDATE_ERROR',
        message: 'Failed to update user status'
      }
    });
  }
});

module.exports = router;