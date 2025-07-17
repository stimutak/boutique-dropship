const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/products - Get all products with advanced filtering and search
router.get('/', async (req, res) => {
  try {
    const {
      category,
      search,
      chakra,
      element,
      zodiac,
      healing,
      minPrice,
      maxPrice,
      featured,
      sort = 'newest',
      page = 1,
      limit = 20
    } = req.query;
    
    // Build base query for active products only
    let query = { isActive: true };
    
    // Category filter
    if (category) {
      query.category = category;
    }
    
    // Text search across name, description, and tags
    if (search) {
      query.$text = { $search: search };
    }
    
    // Spiritual properties filters
    if (chakra) {
      const chakras = Array.isArray(chakra) ? chakra : [chakra];
      query['properties.chakra'] = { $in: chakras };
    }
    
    if (element) {
      const elements = Array.isArray(element) ? element : [element];
      query['properties.element'] = { $in: elements };
    }
    
    if (zodiac) {
      const zodiacs = Array.isArray(zodiac) ? zodiac : [zodiac];
      query['properties.zodiac'] = { $in: zodiacs };
    }
    
    if (healing) {
      const healingProps = Array.isArray(healing) ? healing : [healing];
      query['properties.healing'] = { $in: healingProps };
    }
    
    // Price range filter
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    
    // Featured products filter
    if (featured === 'true') {
      query.isFeatured = true;
    }
    
    // Build sort options
    let sortOptions = {};
    switch (sort) {
      case 'price-low':
        sortOptions = { price: 1 };
        break;
      case 'price-high':
        sortOptions = { price: -1 };
        break;
      case 'name':
        sortOptions = { name: 1 };
        break;
      case 'featured':
        sortOptions = { isFeatured: -1, createdAt: -1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }
    
    // Add text search score sorting if search is used
    if (search) {
      sortOptions = { score: { $meta: 'textScore' }, ...sortOptions };
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Execute query with pagination
    const products = await Product.find(query)
      .select('-wholesaler') // Exclude wholesaler info from public API
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);
    
    // Get total count for pagination
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limitNum);
    
    // Convert to public JSON format
    const publicProducts = products.map(product => product.toPublicJSON());
    
    res.json({
      success: true,
      data: {
        products: publicProducts,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalProducts,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        },
        filters: {
          category,
          search,
          chakra,
          element,
          zodiac,
          healing,
          priceRange: { min: minPrice, max: maxPrice },
          featured,
          sort
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PRODUCTS_FETCH_ERROR',
        message: 'Failed to fetch products'
      }
    });
  }
});

// GET /api/products/search - Advanced search with suggestions
router.get('/search', async (req, res) => {
  try {
    const { q, suggest = false } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_QUERY',
          message: 'Search query is required'
        }
      });
    }
    
    // Full text search
    const searchResults = await Product.find({
      $text: { $search: q },
      isActive: true
    })
    .select('-wholesaler')
    .sort({ score: { $meta: 'textScore' } })
    .limit(20);
    
    let suggestions = [];
    
    // Generate search suggestions if requested
    if (suggest === 'true') {
      // Find similar products by partial name match
      const nameSuggestions = await Product.find({
        name: { $regex: q, $options: 'i' },
        isActive: true
      })
      .select('name slug')
      .limit(5);
      
      // Find products with matching tags
      const tagSuggestions = await Product.find({
        tags: { $regex: q, $options: 'i' },
        isActive: true
      })
      .select('name slug tags')
      .limit(5);
      
      suggestions = [
        ...nameSuggestions.map(p => ({ type: 'product', name: p.name, slug: p.slug })),
        ...tagSuggestions.map(p => ({ type: 'tag', name: p.name, slug: p.slug, matchedTags: p.tags.filter(tag => tag.toLowerCase().includes(q.toLowerCase())) }))
      ];
    }
    
    const publicResults = searchResults.map(product => product.toPublicJSON());
    
    res.json({
      success: true,
      query: q,
      results: publicResults,
      suggestions,
      meta: {
        resultCount: publicResults.length,
        searchTime: Date.now(),
        suggestionsEnabled: suggest === 'true'
      }
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SEARCH_ERROR',
        message: 'Search failed'
      }
    });
  }
});

// GET /api/products/categories - Get all categories with product counts
router.get('/categories', async (req, res) => {
  try {
    const categories = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      categories: categories.map(cat => ({
        name: cat._id,
        count: cat.count,
        priceRange: {
          min: Math.round(cat.minPrice * 100) / 100,
          max: Math.round(cat.maxPrice * 100) / 100,
          avg: Math.round(cat.avgPrice * 100) / 100
        }
      }))
    });
    
  } catch (error) {
    console.error('Categories fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'CATEGORIES_ERROR',
        message: 'Failed to fetch categories'
      }
    });
  }
});

// GET /api/products/filters - Get available filter options
router.get('/filters', async (req, res) => {
  try {
    const { category } = req.query;
    
    let matchQuery = { isActive: true };
    if (category) {
      matchQuery.category = category;
    }
    
    const filterOptions = await Product.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          chakras: { $addToSet: '$properties.chakra' },
          elements: { $addToSet: '$properties.element' },
          zodiacs: { $addToSet: '$properties.zodiac' },
          healingProperties: { $addToSet: '$properties.healing' },
          priceRange: {
            $push: {
              min: { $min: '$price' },
              max: { $max: '$price' }
            }
          }
        }
      },
      {
        $project: {
          chakras: {
            $reduce: {
              input: '$chakras',
              initialValue: [],
              in: { $setUnion: ['$$value', '$$this'] }
            }
          },
          elements: {
            $reduce: {
              input: '$elements',
              initialValue: [],
              in: { $setUnion: ['$$value', '$$this'] }
            }
          },
          zodiacs: {
            $reduce: {
              input: '$zodiacs',
              initialValue: [],
              in: { $setUnion: ['$$value', '$$this'] }
            }
          },
          healingProperties: {
            $reduce: {
              input: '$healingProperties',
              initialValue: [],
              in: { $setUnion: ['$$value', '$$this'] }
            }
          },
          priceRange: {
            min: { $min: '$priceRange.min' },
            max: { $max: '$priceRange.max' }
          }
        }
      }
    ]);
    
    const filters = filterOptions[0] || {
      chakras: [],
      elements: [],
      zodiacs: [],
      healingProperties: [],
      priceRange: { min: 0, max: 1000 }
    };
    
    res.json({
      success: true,
      filters: {
        chakras: filters.chakras.filter(Boolean).sort(),
        elements: filters.elements.filter(Boolean).sort(),
        zodiacs: filters.zodiacs.filter(Boolean).sort(),
        healingProperties: filters.healingProperties.filter(Boolean).sort(),
        priceRange: {
          min: Math.floor(filters.priceRange.min || 0),
          max: Math.ceil(filters.priceRange.max || 1000)
        }
      },
      appliedTo: category ? `category: ${category}` : 'all products'
    });
    
  } catch (error) {
    console.error('Filters fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'FILTERS_ERROR',
        message: 'Failed to fetch filter options'
      }
    });
  }
});

// GET /api/products/recommendations/:productId - Get product recommendations
router.get('/recommendations/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 6 } = req.query;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    }
    
    // Build recommendation query based on product properties
    const recommendationQuery = {
      _id: { $ne: productId },
      isActive: true,
      $or: [
        { category: product.category },
        { 'properties.chakra': { $in: product.properties.chakra || [] } },
        { 'properties.element': { $in: product.properties.element || [] } },
        { 'properties.healing': { $in: product.properties.healing || [] } }
      ]
    };
    
    const recommendations = await Product.find(recommendationQuery)
      .select('-wholesaler')
      .sort({ isFeatured: -1, createdAt: -1 })
      .limit(parseInt(limit));
    
    const publicRecommendations = recommendations.map(p => p.toPublicJSON());
    
    res.json({
      success: true,
      recommendations: publicRecommendations,
      basedOn: {
        productId,
        productName: product.name,
        category: product.category,
        properties: product.properties
      },
      meta: {
        count: publicRecommendations.length,
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RECOMMENDATIONS_ERROR',
        message: 'Failed to fetch recommendations'
      }
    });
  }
});

// GET /api/products/:slug - Get single product by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const product = await Product.findOne({ slug, isActive: true });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    }
    
    // Get related products
    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      $or: [
        { category: product.category },
        { 'properties.chakra': { $in: product.properties.chakra || [] } }
      ],
      isActive: true
    })
    .select('-wholesaler')
    .limit(4);
    
    res.json({
      success: true,
      data: {
        product: product.toPublicJSON(),
        related: relatedProducts.map(p => p.toPublicJSON()),
        meta: {
          slug,
          category: product.category,
          relatedCount: relatedProducts.length
        }
      }
    });
    
  } catch (error) {
    console.error('Product fetch error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PRODUCT_FETCH_ERROR',
        message: 'Failed to fetch product'
      }
    });
  }
});

// POST /api/products - Create new product (admin only)
router.post('/', requireAdmin, [
  body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Product name is required and must be less than 200 characters'),
  body('slug').optional().trim().isLength({ max: 200 }).withMessage('Slug must be less than 200 characters'),
  body('description').trim().isLength({ min: 1, max: 2000 }).withMessage('Description is required and must be less than 2000 characters'),
  body('shortDescription').optional().trim().isLength({ max: 500 }).withMessage('Short description must be less than 500 characters'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('compareAtPrice').optional().isFloat({ min: 0 }).withMessage('Compare at price must be a positive number'),
  body('category').isIn(['crystals', 'herbs', 'oils', 'supplements', 'books', 'accessories', 'other'])
    .withMessage('Invalid category'),
  body('properties.chakra').optional().isArray().withMessage('Chakra must be an array'),
  body('properties.element').optional().isArray().withMessage('Element must be an array'),
  body('properties.zodiac').optional().isArray().withMessage('Zodiac must be an array'),
  body('properties.healing').optional().isArray().withMessage('Healing properties must be an array'),
  body('wholesaler.name').trim().isLength({ min: 1 }).withMessage('Wholesaler name is required'),
  body('wholesaler.email').isEmail().withMessage('Valid wholesaler email is required'),
  body('wholesaler.productCode').trim().isLength({ min: 1 }).withMessage('Wholesaler product code is required'),
  body('wholesaler.cost').isFloat({ min: 0 }).withMessage('Wholesaler cost must be a positive number')
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
    
    const productData = req.body;
    
    // Generate slug if not provided
    if (!productData.slug) {
      productData.slug = productData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    
    // Check for duplicate slug
    const existingProduct = await Product.findOne({ slug: productData.slug });
    if (existingProduct) {
      productData.slug = `${productData.slug}-${Date.now()}`;
    }
    
    const product = await Product.create(productData);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product: product.toPublicJSON()
    });
    
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PRODUCT_CREATION_ERROR',
        message: 'Failed to create product'
      }
    });
  }
});

// PUT /api/products/:id - Update product (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      product: product.toPublicJSON()
    });
    
  } catch (error) {
    console.error('Product update error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PRODUCT_UPDATE_ERROR',
        message: 'Failed to update product'
      }
    });
  }
});

// DELETE /api/products/:id - Delete product (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Product deactivated successfully',
      product: {
        id: product._id,
        name: product.name,
        isActive: product.isActive
      }
    });
    
  } catch (error) {
    console.error('Product deletion error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PRODUCT_DELETION_ERROR',
        message: 'Failed to delete product'
      }
    });
  }
});

module.exports = router;