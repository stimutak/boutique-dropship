const express = require('express');
const router = express.Router();
const BlogPost = require('../models/BlogPost');
const { logger } = require('../utils/logger');

// GET /api/blog - public list with pagination (default 2 per page)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.max(parseInt(req.query.limit || '2', 10), 1);
    const skip = (page - 1) * limit;
    const locale = (req.headers['x-locale'] || 'en').split(',')[0];

    const [total, posts] = await Promise.all([
      BlogPost.countDocuments({ published: true }),
      BlogPost.find({ published: true })
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    const data = posts.map(post => {
      const localized = post.getLocalized(locale);
      return {
        _id: post._id,
        slug: post.slug,
        title: localized.title,
        excerpt: localized.excerpt,
        coverImage: post.coverImage,
        tags: post.tags,
        author: post.author,
        publishedAt: post.publishedAt || post.createdAt,
        readingTime: post.readingTime
      };
    });

    const totalPages = Math.max(Math.ceil(total / limit), 1);
    res.json({
      success: true,
      data: {
        posts: data,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          perPage: limit
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching blog posts', { error: error.message });
    res.status(500).json({ success: false, error: { code: 'BLOG_LIST_ERROR', message: 'Failed to fetch blog posts' } });
  }
});

// GET /api/blog/:slug - public post by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const locale = (req.headers['x-locale'] || 'en').split(',')[0];
    const post = await BlogPost.findOne({ slug, published: true });
    if (!post) {
      return res.status(404).json({ success: false, error: { code: 'BLOG_NOT_FOUND', message: 'Blog post not found' } });
    }
    const localized = post.getLocalized(locale);
    res.json({
      success: true,
      data: {
        post: {
          _id: post._id,
          slug: post.slug,
          title: localized.title,
          excerpt: localized.excerpt,
          content: localized.content,
          coverImage: post.coverImage,
          tags: post.tags,
          author: post.author,
          publishedAt: post.publishedAt || post.createdAt,
          readingTime: post.readingTime
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'BLOG_FETCH_ERROR', message: 'Failed to fetch blog post' } });
  }
});

module.exports = router;

