const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');

// Get product by reference key for cross-site linking
router.get('/products/link/:referenceKey', async (req, res) => {
  try {
    const { referenceKey } = req.params;
    const { source } = req.query; // Track referral source
    
    const product = await Product.findOne({
      $or: [
        { 'crossSiteIntegration.referenceKey': referenceKey },
        { slug: referenceKey }
      ],
      isActive: true,
      'crossSiteIntegration.enabled': true
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found or not available for cross-site integration'
        }
      });
    }
    
    // Track referral if source is provided
    if (source) {
      // Log referral for analytics (you might want to store this in a separate collection)
      console.log(`Cross-site referral: ${source} -> ${product.slug}`);
    }
    
    // Return cross-site optimized product data
    const crossSiteData = product.getCrossSiteData();
    
    res.json({
      success: true,
      product: crossSiteData,
      meta: {
        referralSource: source,
        crossSiteEnabled: true,
        directUrl: `/products/${product.slug}`,
        embedUrl: `/api/integration/products/embed/${product.slug}`
      }
    });
    
  } catch (error) {
    console.error('Cross-site product link error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTEGRATION_ERROR',
        message: 'Failed to fetch product for cross-site integration'
      }
    });
  }
});

// Get embeddable product widget data
router.get('/products/embed/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { format = 'json', theme = 'light' } = req.query;
    
    const product = await Product.findOne({
      slug,
      isActive: true,
      'crossSiteIntegration.enabled': true
    });
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found or not available for embedding'
        }
      });
    }
    
    const embedData = {
      id: product._id,
      name: product.name,
      slug: product.slug,
      shortDescription: product.shortDescription,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      primaryImage: product.images.find(img => img.isPrimary) || product.images[0],
      category: product.category,
      properties: {
        chakra: product.properties.chakra,
        element: product.properties.element,
        healing: product.properties.healing
      },
      seo: product.seo,
      urls: {
        product: `/products/${product.slug}`,
        addToCart: `/api/cart/add`,
        buyNow: `/checkout?product=${product._id}`
      }
    };
    
    if (format === 'html') {
      // Return HTML widget
      const htmlWidget = generateProductWidget(embedData, theme);
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlWidget);
    } else {
      // Return JSON data
      res.json({
        success: true,
        embed: embedData,
        meta: {
          format,
          theme,
          embedCode: `<iframe src="${req.protocol}://${req.get('host')}/api/integration/products/embed/${slug}?format=html&theme=${theme}" width="300" height="400" frameborder="0"></iframe>`
        }
      });
    }
    
  } catch (error) {
    console.error('Product embed error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'EMBED_ERROR',
        message: 'Failed to generate product embed'
      }
    });
  }
});

// Get products related to content ID (for content-based recommendations)
router.get('/products/related/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { limit = 6, category, properties } = req.query;
    
    // Build query based on content relationship
    let query = {
      isActive: true,
      'crossSiteIntegration.enabled': true
    };
    
    // Add content-specific filters
    if (contentId.includes('chakra')) {
      const chakraName = contentId.replace('chakra-', '');
      query['properties.chakra'] = { $in: [chakraName] };
    } else if (contentId.includes('element')) {
      const elementName = contentId.replace('element-', '');
      query['properties.element'] = { $in: [elementName] };
    } else if (contentId.includes('healing')) {
      const healingProperty = contentId.replace('healing-', '');
      query['properties.healing'] = { $in: [healingProperty] };
    }
    
    // Add additional filters
    if (category) {
      query.category = category;
    }
    
    if (properties) {
      try {
        const propertyFilters = JSON.parse(properties);
        Object.keys(propertyFilters).forEach(key => {
          if (propertyFilters[key]) {
            query[`properties.${key}`] = { $in: Array.isArray(propertyFilters[key]) ? propertyFilters[key] : [propertyFilters[key]] };
          }
        });
      } catch (e) {
        // Ignore invalid JSON in properties filter
      }
    }
    
    const products = await Product.find(query)
      .limit(parseInt(limit))
      .sort({ isFeatured: -1, createdAt: -1 });
    
    const relatedProducts = products.map(product => product.getCrossSiteData());
    
    res.json({
      success: true,
      products: relatedProducts,
      meta: {
        contentId,
        count: relatedProducts.length,
        filters: { category, properties },
        totalAvailable: await Product.countDocuments(query)
      }
    });
    
  } catch (error) {
    console.error('Related products error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'RELATED_PRODUCTS_ERROR',
        message: 'Failed to fetch related products'
      }
    });
  }
});

// Track referral analytics
router.post('/analytics/referral', async (req, res) => {
  try {
    const { source, productId, action, metadata } = req.body;
    
    if (!source || !action) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Source and action are required'
        }
      });
    }
    
    // Log referral analytics (in a real app, you'd store this in a dedicated analytics collection)
    const analyticsData = {
      timestamp: new Date(),
      source,
      productId,
      action, // 'view', 'click', 'add_to_cart', 'purchase'
      metadata,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };
    
    console.log('Cross-site analytics:', analyticsData);
    
    // TODO: Store in analytics collection
    // await Analytics.create(analyticsData);
    
    res.json({
      success: true,
      message: 'Referral tracked successfully'
    });
    
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Failed to track referral'
      }
    });
  }
});

// Get referral analytics summary (admin only)
router.get('/analytics/summary', async (req, res) => {
  try {
    const { startDate, endDate, source } = req.query;
    
    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }
    
    // Build source filter
    let sourceFilter = {};
    if (source) {
      sourceFilter.referralSource = source;
    }
    
    // Get order analytics with referral sources
    const orderAnalytics = await Order.aggregate([
      {
        $match: {
          ...dateFilter,
          ...sourceFilter,
          referralSource: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$referralSource',
          orderCount: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' }
        }
      },
      {
        $sort: { orderCount: -1 }
      }
    ]);
    
    // Get top referred products
    const topProducts = await Order.aggregate([
      {
        $match: {
          ...dateFilter,
          referralSource: { $exists: true, $ne: null }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          referralCount: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          productName: '$product.name',
          productSlug: '$product.slug',
          referralCount: 1,
          revenue: 1
        }
      },
      { $sort: { referralCount: -1 } },
      { $limit: 10 }
    ]);
    
    res.json({
      success: true,
      analytics: {
        summary: {
          totalReferralOrders: orderAnalytics.reduce((sum, item) => sum + item.orderCount, 0),
          totalReferralRevenue: orderAnalytics.reduce((sum, item) => sum + item.totalRevenue, 0),
          averageReferralOrderValue: orderAnalytics.length > 0 
            ? orderAnalytics.reduce((sum, item) => sum + item.averageOrderValue, 0) / orderAnalytics.length 
            : 0
        },
        bySource: orderAnalytics,
        topProducts
      },
      meta: {
        dateRange: { startDate, endDate },
        sourceFilter: source,
        generatedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ANALYTICS_SUMMARY_ERROR',
        message: 'Failed to generate analytics summary'
      }
    });
  }
});

// Generate HTML widget for product embedding
function generateProductWidget(product, theme = 'light') {
  const themeStyles = theme === 'dark' 
    ? 'background: #2d3748; color: #e2e8f0; border: 1px solid #4a5568;'
    : 'background: #ffffff; color: #2d3748; border: 1px solid #e2e8f0;';
    
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${product.name} - Holistic Store</title>
      <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        .product-widget {
          ${themeStyles}
          border-radius: 8px;
          padding: 16px;
          max-width: 300px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .product-image {
          width: 100%;
          height: 200px;
          object-fit: cover;
          border-radius: 4px;
          margin-bottom: 12px;
        }
        .product-name {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 8px;
          line-height: 1.3;
        }
        .product-description {
          font-size: 14px;
          margin-bottom: 12px;
          opacity: 0.8;
          line-height: 1.4;
        }
        .product-price {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 16px;
        }
        .product-properties {
          font-size: 12px;
          margin-bottom: 16px;
          opacity: 0.7;
        }
        .product-button {
          background: #4299e1;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          text-decoration: none;
          display: inline-block;
          text-align: center;
          transition: background 0.2s;
        }
        .product-button:hover {
          background: #3182ce;
        }
      </style>
    </head>
    <body>
      <div class="product-widget">
        ${product.primaryImage ? `<img src="${product.primaryImage.url}" alt="${product.primaryImage.alt || product.name}" class="product-image">` : ''}
        <div class="product-name">${product.name}</div>
        <div class="product-description">${product.shortDescription || ''}</div>
        <div class="product-price">
          $${product.price.toFixed(2)}
          ${product.compareAtPrice ? `<span style="text-decoration: line-through; opacity: 0.6; font-size: 16px; margin-left: 8px;">$${product.compareAtPrice.toFixed(2)}</span>` : ''}
        </div>
        ${product.properties.chakra || product.properties.element ? `
          <div class="product-properties">
            ${product.properties.chakra ? `Chakra: ${product.properties.chakra.join(', ')} ` : ''}
            ${product.properties.element ? `Element: ${product.properties.element.join(', ')}` : ''}
          </div>
        ` : ''}
        <a href="${product.urls.product}" target="_parent" class="product-button">
          View Product
        </a>
      </div>
    </body>
    </html>
  `;
}

module.exports = router;