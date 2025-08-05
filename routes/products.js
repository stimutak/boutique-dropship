const express = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');
const { _requireAuth, requireAdmin } = require('../middleware/auth');
const { getCurrencyForLocale, formatPrice } = require('../utils/currency');
const { ErrorCodes } = require('../utils/errorHandler');
const router = express.Router();

// Helper function to get user's currency from request
function getUserCurrency(req) {
  // Check for explicit currency in query or header
  if (req.query.currency) {return req.query.currency;}
  if (req.headers['x-currency']) {return req.headers['x-currency'];}
  
  // Get from locale header (set by frontend based on i18n)
  const locale = req.headers['x-locale'] || 'en';
  return getCurrencyForLocale(locale);
}

// Helper to enhance product with currency info
function enhanceProductWithCurrency(product, currency, locale = 'en') {
  const productObj = product.toObject ? product.toObject() : product;
  
  // Get price in user's currency
  const priceInCurrency = productObj.prices && productObj.prices[currency] 
    ? productObj.prices[currency] 
    : productObj.price; // Fallback to USD price
    
  return {
    ...productObj,
    displayPrice: formatPrice(priceInCurrency, currency, locale),
    displayCurrency: currency,
    priceInCurrency: priceInCurrency
  };
}

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
    const query = { isActive: true };
    
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
      if (minPrice) {query.price.$gte = parseFloat(minPrice);}
      if (maxPrice) {query.price.$lte = parseFloat(maxPrice);}
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
    
    // Get user's currency
    const userCurrency = getUserCurrency(req);
    const locale = req.headers['x-locale'] || 'en';
    
    // Convert to public JSON format with currency info
    const publicProducts = products.map(product => {
      const publicProduct = product.toPublicJSON();
      return enhanceProductWithCurrency(publicProduct, userCurrency, locale);
    });
    
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
    res.error(500, ErrorCodes.PRODUCTS_FETCH_ERROR, 'Failed to fetch products');
  }
});

// GET /api/products/tags - Get all unique tags
router.get('/tags', async (req, res) => {
  try {
    // Get all unique tags from products
    const products = await Product.find({ isActive: true }).select('tags');
    
    const tagSet = new Set();
    products.forEach(product => {
      if (product.tags && Array.isArray(product.tags)) {
        product.tags.forEach(tag => {
          if (tag) {tagSet.add(tag.toLowerCase());}
        });
      }
    });
    
    const uniqueTags = Array.from(tagSet).sort();
    
    res.json({
      success: true,
      data: uniqueTags
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tags',
      data: []
    });
  }
});

// GET /api/products/autocomplete - Fast autocomplete for search
router.get('/autocomplete', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ 
        success: true, 
        data: [] 
      });
    }
    
    const searchRegex = new RegExp(q, 'i');
    const results = [];
    const seen = new Set();
    
    // Search in product names
    const nameMatches = await Product.find({
      name: searchRegex,
      isActive: true
    })
      .select('name slug category')
      .limit(5);
    
    nameMatches.forEach(product => {
      const key = `product-${product.slug}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          type: 'product',
          label: product.name,
          value: product.slug,
          category: product.category
        });
      }
    });
    
    // Search in tags
    const tagMatches = await Product.find({
      tags: searchRegex,
      isActive: true
    })
      .select('tags')
      .limit(10);
    
    const matchedTags = new Set();
    tagMatches.forEach(product => {
      product.tags.forEach(tag => {
        if (searchRegex.test(tag) && !matchedTags.has(tag)) {
          matchedTags.add(tag);
          results.push({
            type: 'tag',
            label: tag,
            value: tag
          });
        }
      });
    });
    
    // Search in descriptions
    const descMatches = await Product.find({
      description: searchRegex,
      isActive: true
    })
      .select('name slug description')
      .limit(3);
    
    descMatches.forEach(product => {
      const key = `desc-${product.slug}`;
      if (!seen.has(key)) {
        seen.add(key);
        // Extract matching snippet from description
        const match = product.description.match(new RegExp(`.{0,30}${q}.{0,30}`, 'i'));
        results.push({
          type: 'description',
          label: product.name,
          value: product.slug,
          snippet: match ? match[0] : product.description.substring(0, 60)
        });
      }
    });
    
    // Search in spiritual properties
    const propMatches = await Product.find({
      $or: [
        { 'properties.chakra': searchRegex },
        { 'properties.element': searchRegex },
        { 'properties.zodiac': searchRegex }
      ],
      isActive: true
    })
      .select('name slug properties')
      .limit(3);
    
    propMatches.forEach(product => {
      const key = `prop-${product.slug}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          type: 'property',
          label: product.name,
          value: product.slug,
          properties: product.properties
        });
      }
    });
    
    // Limit total results to 10 for performance
    res.json({ 
      success: true, 
      data: results.slice(0, 10) 
    });
    
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.json({ 
      success: true, 
      data: [] 
    }); // Return empty array on error for better UX
  }
});

// GET /api/products/search - Advanced search with suggestions
router.get('/search', async (req, res) => {
  try {
    const { q, suggest = false } = req.query;
    
    if (!q) {
      return res.error(400, ErrorCodes.MISSING_QUERY, 'Search query is required');
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
    res.error(500, ErrorCodes.SEARCH_ERROR, 'Search failed');
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
    res.error(500, ErrorCodes.CATEGORIES_ERROR, 'Failed to fetch categories');
  }
});

// GET /api/products/filters - Get available filter options
router.get('/filters', async (req, res) => {
  try {
    const { category } = req.query;
    
    const matchQuery = { isActive: true };
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
    res.error(500, ErrorCodes.FILTERS_ERROR, 'Failed to fetch filter options');
  }
});

// GET /api/products/recommendations/:productId - Get product recommendations
router.get('/recommendations/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 6 } = req.query;
    
    const product = await Product.findById(productId);
    if (!product) {
      return res.error(404, ErrorCodes.PRODUCT_NOT_FOUND, 'Product not found');
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
    res.error(500, ErrorCodes.RECOMMENDATIONS_ERROR, 'Failed to fetch recommendations');
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
    
    // Get user's currency
    const userCurrency = getUserCurrency(req);
    const locale = req.headers['x-locale'] || 'en';
    
    res.json({
      success: true,
      data: {
        product: enhanceProductWithCurrency(product.toPublicJSON(), userCurrency, locale),
        related: relatedProducts.map(p => enhanceProductWithCurrency(p.toPublicJSON(), userCurrency, locale)),
        meta: {
          slug,
          category: product.category,
          relatedCount: relatedProducts.length
        }
      }
    });
    
  } catch (error) {
    console.error('Product fetch error:', error);
    res.error(500, ErrorCodes.PRODUCTS_FETCH_ERROR, 'Failed to fetch product');
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
      return res.validationError(errors);
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
    res.error(500, ErrorCodes.PRODUCT_CREATION_ERROR, 'Failed to create product');
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
    res.error(500, ErrorCodes.PRODUCT_UPDATE_ERROR, 'Failed to update product');
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
    res.error(500, ErrorCodes.PRODUCT_DELETE_ERROR, 'Failed to delete product');
  }
});

module.exports = router;