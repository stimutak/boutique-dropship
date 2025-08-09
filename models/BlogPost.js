const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  // Default language content (English fallback)
  title: { type: String, required: true, trim: true },
  excerpt: { type: String, default: '' },
  content: { type: String, required: true },
  // Internationalized fields per locale (mirrors Product.translations pattern)
  translations: {
    type: Map,
    of: {
      title: String,
      excerpt: String,
      content: String
    },
    default: new Map()
  },
  coverImage: {
    url: { type: String, default: '' },
    alt: { type: String, default: '' }
  },
  tags: [{ type: String }],
  author: { type: String, default: 'Staff' },
  published: { type: Boolean, default: false },
  publishedAt: { type: Date, default: null },
  readingTime: { type: Number, default: 0 } // minutes estimate
}, { timestamps: true });

// Indexes for typical queries
blogPostSchema.index({ published: 1, publishedAt: -1 });
blogPostSchema.index({ title: 'text', excerpt: 'text', content: 'text', tags: 'text' });

// Helper to get localized fields with fallback
blogPostSchema.methods.getLocalized = function(locale = 'en') {
  if (!locale || locale === 'en') {
    return {
      title: this.title,
      excerpt: this.excerpt,
      content: this.content
    };
  }
  const t = this.translations?.get(locale);
  return {
    title: t?.title || this.title,
    excerpt: t?.excerpt || this.excerpt,
    content: t?.content || this.content
  };
};

module.exports = mongoose.model('BlogPost', blogPostSchema);

