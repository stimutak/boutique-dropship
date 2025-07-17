const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Product = require('./models/Product');

console.log('🚀 Starting database population...');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('✅ Connected to MongoDB');
  return populateData();
}).catch(error => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

const testProducts = [
  {
    name: 'Amethyst Crystal Cluster',
    slug: 'amethyst-crystal-cluster',
    description: 'Beautiful natural amethyst crystal cluster perfect for meditation and spiritual healing. Known for its calming properties and ability to enhance intuition. This stunning piece displays deep purple hues and natural crystal formations.',
    shortDescription: 'Natural amethyst crystal cluster for meditation and spiritual healing.',
    price: 45.99,
    category: 'crystals',
    tags: ['amethyst', 'crystal', 'healing', 'meditation', 'spiritual'],
    images: [{
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=400&fit=crop',
      alt: 'Amethyst Crystal Cluster',
      isPrimary: true
    }],
    properties: {
      chakra: ['third-eye', 'crown'],
      element: ['air'],
      zodiac: ['pisces', 'virgo', 'aquarius', 'capricorn'],
      healing: ['peace', 'intuition', 'protection', 'clarity'],
      origin: 'Brazil',
      size: '3-4 inches',
      weight: '200-300g'
    },
    wholesaler: {
      name: 'Crystal Harmony Wholesale',
      email: 'orders@crystalharmony.com',
      productCode: 'CH-AME-001',
      cost: 22.50,
      minOrderQty: 5
    },
    seo: {
      title: 'Natural Amethyst Crystal Cluster - Healing & Meditation',
      description: 'Premium amethyst crystal cluster for spiritual healing, meditation, and chakra balancing.',
      keywords: ['amethyst', 'crystal', 'healing', 'meditation', 'chakra']
    },
    isActive: true,
    isFeatured: true
  },
  {
    name: 'Rose Quartz Heart Stone',
    slug: 'rose-quartz-heart-stone',
    description: 'Hand-carved rose quartz heart stone, the ultimate symbol of love and compassion. Perfect for heart chakra healing and attracting love energy. Each piece is unique and radiates gentle, loving energy.',
    shortDescription: 'Hand-carved rose quartz heart stone for love and compassion.',
    price: 28.50,
    category: 'crystals',
    tags: ['rose-quartz', 'heart', 'love', 'healing', 'chakra'],
    images: [{
      url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
      alt: 'Rose Quartz Heart Stone',
      isPrimary: true
    }],
    properties: {
      chakra: ['heart'],
      element: ['water'],
      zodiac: ['taurus', 'libra'],
      healing: ['love', 'compassion', 'healing', 'self-love'],
      origin: 'Madagascar',
      size: '2 inches',
      weight: '50-70g'
    },
    wholesaler: {
      name: 'Love Stone Suppliers',
      email: 'wholesale@lovestones.com',
      productCode: 'LS-RQ-HEART-002',
      cost: 14.25,
      minOrderQty: 10
    },
    seo: {
      title: 'Rose Quartz Heart Stone - Love & Compassion Crystal',
      description: 'Beautiful hand-carved rose quartz heart stone for love, healing, and heart chakra balancing.',
      keywords: ['rose-quartz', 'heart', 'love', 'healing', 'chakra']
    },
    isActive: true,
    isFeatured: true
  },
  {
    name: 'White Sage Smudge Bundle',
    slug: 'white-sage-smudge-bundle',
    description: 'Premium white sage smudge bundle harvested sustainably from California. Perfect for cleansing negative energy and purifying spaces. Each bundle is hand-tied and ready for ceremonial use.',
    shortDescription: 'Premium white sage bundle for energy cleansing and purification.',
    price: 12.99,
    category: 'herbs',
    tags: ['sage', 'smudge', 'cleansing', 'purification', 'ritual'],
    images: [{
      url: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=400&fit=crop',
      alt: 'White Sage Smudge Bundle',
      isPrimary: true
    }],
    properties: {
      chakra: ['all'],
      element: ['air'],
      zodiac: ['all'],
      healing: ['cleansing', 'purification', 'protection', 'clarity'],
      origin: 'California, USA',
      size: '4 inches',
      weight: '15-20g'
    },
    wholesaler: {
      name: 'Sacred Herbs Co.',
      email: 'orders@sacredherbs.com',
      productCode: 'SH-SAGE-003',
      cost: 6.50,
      minOrderQty: 20
    },
    seo: {
      title: 'White Sage Smudge Bundle - Energy Cleansing & Purification',
      description: 'Premium California white sage smudge bundle for spiritual cleansing and energy purification.',
      keywords: ['sage', 'smudge', 'cleansing', 'purification', 'ritual']
    },
    isActive: true,
    isFeatured: false
  },
  {
    name: 'Lavender Essential Oil',
    slug: 'lavender-essential-oil',
    description: 'Pure therapeutic grade lavender essential oil, steam distilled from organic lavender flowers. Perfect for aromatherapy, relaxation, and promoting restful sleep. Known for its calming and soothing properties.',
    shortDescription: 'Pure therapeutic grade lavender essential oil for relaxation.',
    price: 24.99,
    category: 'oils',
    tags: ['lavender', 'essential-oil', 'aromatherapy', 'relaxation', 'sleep'],
    images: [{
      url: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&h=400&fit=crop',
      alt: 'Lavender Essential Oil',
      isPrimary: true
    }],
    properties: {
      chakra: ['crown', 'third-eye'],
      element: ['air'],
      zodiac: ['virgo', 'gemini'],
      healing: ['relaxation', 'sleep', 'stress-relief', 'emotional-balance'],
      origin: 'France',
      size: '10ml bottle',
      weight: '30g'
    },
    wholesaler: {
      name: 'Pure Essence Oils',
      email: 'wholesale@pureessence.com',
      productCode: 'PEO-LAV-004',
      cost: 12.50,
      minOrderQty: 12
    },
    seo: {
      title: 'Pure Lavender Essential Oil - Therapeutic Grade Aromatherapy',
      description: 'Organic therapeutic grade lavender essential oil for relaxation, sleep, and aromatherapy.',
      keywords: ['lavender', 'essential-oil', 'aromatherapy', 'organic', 'therapeutic']
    },
    isActive: true,
    isFeatured: true
  },
  {
    name: 'Chakra Balancing Stone Set',
    slug: 'chakra-balancing-stone-set',
    description: 'Complete set of seven chakra stones for energy balancing and alignment. Includes red jasper (root), carnelian (sacral), citrine (solar plexus), green aventurine (heart), sodalite (throat), amethyst (third eye), and clear quartz (crown).',
    shortDescription: 'Complete 7-stone chakra balancing set for energy alignment.',
    price: 89.99,
    compareAtPrice: 120.00,
    category: 'crystals',
    tags: ['chakra', 'crystal-set', 'energy', 'balancing', 'healing', 'meditation'],
    images: [{
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=400&fit=crop',
      alt: 'Chakra Balancing Stone Set',
      isPrimary: true
    }],
    properties: {
      chakra: ['root', 'sacral', 'solar-plexus', 'heart', 'throat', 'third-eye', 'crown'],
      element: ['earth', 'water', 'fire', 'air'],
      zodiac: ['all'],
      healing: ['energy-balance', 'chakra-alignment', 'spiritual-harmony', 'overall-wellness'],
      origin: 'Various',
      size: 'Set of 7 stones',
      weight: '150-200g total'
    },
    wholesaler: {
      name: 'Chakra Stones Wholesale',
      email: 'orders@chakrastones.com',
      productCode: 'CSW-SET-005',
      cost: 45.00,
      minOrderQty: 3
    },
    seo: {
      title: 'Complete Chakra Balancing Stone Set - 7 Healing Crystals',
      description: 'Professional chakra stone set with all 7 crystals for energy balancing and spiritual healing.',
      keywords: ['chakra', 'crystal-set', 'healing', 'energy', 'balancing', 'meditation']
    },
    isActive: true,
    isFeatured: true
  }
];

const testUsers = [
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'Password123!',
    isAdmin: true,
    addresses: [{
      type: 'shipping',
      firstName: 'John',
      lastName: 'Doe',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US',
      isDefault: true
    }],
    preferences: {
      newsletter: true,
      notifications: true,
      emailPreferences: {
        orderConfirmations: true,
        paymentReceipts: true,
        orderUpdates: true,
        promotionalEmails: false,
        welcomeEmails: true
      }
    }
  },
  {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    password: 'Password123!',
    isAdmin: false,
    addresses: [{
      type: 'shipping',
      firstName: 'Jane',
      lastName: 'Smith',
      street: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      country: 'US',
      isDefault: true
    }],
    preferences: {
      newsletter: false,
      notifications: true,
      emailPreferences: {
        orderConfirmations: true,
        paymentReceipts: true,
        orderUpdates: true,
        promotionalEmails: false,
        welcomeEmails: true
      }
    }
  }
];

async function populateData() {
  try {
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Product.deleteMany({});
    
    console.log('👥 Creating test users...');
    for (const userData of testUsers) {
      const user = new User(userData);
      await user.save();
      console.log(`✅ Created user: ${user.email}`);
    }
    
    console.log('🛍️ Creating test products...');
    for (const productData of testProducts) {
      const product = new Product(productData);
      await product.save();
      console.log(`✅ Created product: ${product.name}`);
    }
    
    // Final summary
    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    
    console.log('\n🎉 Database populated successfully!');
    console.log(`📊 Summary: ${userCount} users, ${productCount} products`);
    console.log('\n🔑 Test Accounts:');
    console.log('Admin: john@example.com / Password123!');
    console.log('User: jane@example.com / Password123!');
    
  } catch (error) {
    console.error('❌ Error populating database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}