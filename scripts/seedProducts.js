const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

// Sample holistic/wellness products
const sampleProducts = [
  // Crystals & Stones
  {
    name: 'Amethyst Crystal Cluster',
    slug: 'amethyst-crystal-cluster',
    description: 'Natural amethyst crystal cluster for healing and meditation. Known for its calming and protective properties.',
    shortDescription: 'Natural amethyst cluster for healing and meditation',
    price: 29.99,
    wholesalePrice: 15.00,
    category: 'other',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1540903920468-fa12ae5c3853?w=800',
        alt: 'Amethyst Crystal Cluster',
        isPrimary: true
      }
    ],
    stock: 50,
    lowStockThreshold: 10,
    tags: ['crystal', 'amethyst', 'healing', 'meditation'],
    features: [
      'Natural purple amethyst',
      'Approximately 3-4 inches',
      'Ethically sourced',
      'Includes information card'
    ],
    specifications: {
      weight: '200-300g',
      dimensions: '3-4 inches',
      origin: 'Brazil',
      type: 'Natural Crystal'
    }
  },
  {
    name: 'Rose Quartz Heart',
    slug: 'rose-quartz-heart',
    description: 'Polished rose quartz heart stone. The stone of unconditional love and healing.',
    shortDescription: 'Rose quartz heart for love and healing',
    price: 19.99,
    wholesalePrice: 10.00,
    category: 'other',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1567446537708-36cd97ff6bcd?w=800',
        alt: 'Rose Quartz Heart',
        isPrimary: true
      }
    ],
    stock: 75,
    lowStockThreshold: 15,
    tags: ['crystal', 'rose-quartz', 'love', 'healing'],
    features: [
      'Polished rose quartz',
      'Heart shape',
      'Palm-sized',
      'Perfect for meditation'
    ]
  },
  
  // Essential Oils
  {
    name: 'Lavender Essential Oil - 30ml',
    slug: 'lavender-essential-oil-30ml',
    description: 'Pure lavender essential oil for aromatherapy, relaxation, and better sleep. 100% organic.',
    shortDescription: 'Pure lavender oil for aromatherapy',
    price: 24.99,
    wholesalePrice: 12.00,
    category: 'oils',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800',
        alt: 'Lavender Essential Oil',
        isPrimary: true
      }
    ],
    stock: 100,
    lowStockThreshold: 20,
    tags: ['essential-oil', 'lavender', 'aromatherapy', 'organic'],
    features: [
      '100% pure lavender oil',
      'Organic certified',
      '30ml amber glass bottle',
      'Includes dropper'
    ],
    specifications: {
      volume: '30ml',
      purity: '100%',
      origin: 'France',
      extraction: 'Steam distilled'
    }
  },
  {
    name: 'Eucalyptus Essential Oil - 30ml',
    slug: 'eucalyptus-essential-oil-30ml',
    description: 'Pure eucalyptus essential oil for respiratory support and mental clarity.',
    shortDescription: 'Eucalyptus oil for clarity and breathing',
    price: 22.99,
    wholesalePrice: 11.00,
    category: 'oils',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1603126858623-79a6333d8054?w=800',
        alt: 'Eucalyptus Essential Oil',
        isPrimary: true
      }
    ],
    stock: 80,
    lowStockThreshold: 15,
    tags: ['essential-oil', 'eucalyptus', 'respiratory', 'clarity'],
    features: [
      '100% pure eucalyptus oil',
      'Therapeutic grade',
      '30ml bottle',
      'Child-resistant cap'
    ]
  },
  
  // Meditation & Yoga
  {
    name: 'Premium Cork Yoga Mat',
    slug: 'premium-cork-yoga-mat',
    description: 'Eco-friendly cork yoga mat with natural rubber base. Non-slip, antimicrobial, and sustainable.',
    shortDescription: 'Eco-friendly cork yoga mat',
    price: 89.99,
    wholesalePrice: 45.00,
    category: 'accessories',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800',
        alt: 'Premium Cork Yoga Mat',
        isPrimary: true
      }
    ],
    stock: 25,
    lowStockThreshold: 5,
    tags: ['yoga', 'mat', 'cork', 'eco-friendly'],
    features: [
      'Natural cork surface',
      'Natural rubber base',
      '4mm thickness',
      'Includes carrying strap'
    ],
    specifications: {
      dimensions: '183cm x 61cm',
      thickness: '4mm',
      weight: '2.5kg',
      material: 'Cork & Natural Rubber'
    }
  },
  {
    name: 'Meditation Cushion Set',
    slug: 'meditation-cushion-set',
    description: 'Comfortable meditation cushion (zafu) with matching mat (zabuton) for extended meditation sessions.',
    shortDescription: 'Complete meditation cushion set',
    price: 69.99,
    wholesalePrice: 35.00,
    category: 'accessories',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1593811167562-9cef47bfc4a7?w=800',
        alt: 'Meditation Cushion Set',
        isPrimary: true
      }
    ],
    stock: 30,
    lowStockThreshold: 8,
    tags: ['meditation', 'cushion', 'zafu', 'zabuton'],
    features: [
      'Buckwheat hull filling',
      'Removable cotton cover',
      'Includes mat',
      'Carrying handle'
    ]
  },
  
  // Incense & Sage
  {
    name: 'White Sage Smudge Bundle',
    slug: 'white-sage-smudge-bundle',
    description: 'Sustainably harvested white sage bundle for cleansing and purification rituals.',
    shortDescription: 'White sage for cleansing rituals',
    price: 12.99,
    wholesalePrice: 6.00,
    category: 'herbs',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1558618400-71898c1190d3?w=800',
        alt: 'White Sage Smudge Bundle',
        isPrimary: true
      }
    ],
    stock: 150,
    lowStockThreshold: 30,
    tags: ['sage', 'smudge', 'cleansing', 'ritual'],
    features: [
      '4-5 inch bundle',
      'Sustainably harvested',
      'California white sage',
      'Includes usage guide'
    ]
  },
  {
    name: 'Palo Santo Sticks - Pack of 5',
    slug: 'palo-santo-sticks-5-pack',
    description: 'Sacred palo santo wood sticks for aromatherapy and energy cleansing.',
    shortDescription: 'Sacred palo santo wood sticks',
    price: 15.99,
    wholesalePrice: 8.00,
    category: 'herbs',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1608404438076-8081e8d2f43e?w=800',
        alt: 'Palo Santo Sticks',
        isPrimary: true
      }
    ],
    stock: 120,
    lowStockThreshold: 25,
    tags: ['palo-santo', 'incense', 'cleansing', 'aromatherapy'],
    features: [
      '5 sticks per pack',
      'Sustainably sourced',
      'From Ecuador',
      'Natural fallen wood only'
    ]
  },
  
  // Healing Jewelry
  {
    name: 'Chakra Healing Bracelet',
    slug: 'chakra-healing-bracelet',
    description: '7 chakra stones bracelet for energy balancing and healing. Features genuine gemstones.',
    shortDescription: '7 chakra gemstone bracelet',
    price: 34.99,
    wholesalePrice: 17.00,
    category: 'accessories',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1611653977166-587cca2f5c09?w=800',
        alt: 'Chakra Healing Bracelet',
        isPrimary: true
      }
    ],
    stock: 60,
    lowStockThreshold: 12,
    tags: ['chakra', 'bracelet', 'healing', 'gemstone'],
    features: [
      '7 genuine gemstones',
      'Elastic band fits most',
      '8mm beads',
      'Includes chakra guide'
    ]
  },
  {
    name: 'Copper Healing Ring',
    slug: 'copper-healing-ring',
    description: 'Pure copper ring believed to help with arthritis and joint pain. Adjustable size.',
    shortDescription: 'Pure copper healing ring',
    price: 19.99,
    wholesalePrice: 10.00,
    category: 'accessories',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1603561596112-0a2ae757d8c7?w=800',
        alt: 'Copper Healing Ring',
        isPrimary: true
      }
    ],
    stock: 90,
    lowStockThreshold: 20,
    tags: ['copper', 'ring', 'healing', 'arthritis'],
    features: [
      'Pure copper',
      'Adjustable size',
      'Comfortable design',
      'Includes benefits card'
    ]
  }
];

// Sample wholesaler info (embedded in each product)
const wholesalerInfo = {
  name: 'Holistic Wellness Wholesale',
  email: 'wholesale@holisticwellness.com',
  productCode: '', // Will be set per product
  cost: 0, // Will be set per product
  minOrderQty: 10
};

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Clear existing data
    await Product.deleteMany({});
    console.log('Cleared existing data');
    
    // Create products
    for (const productData of sampleProducts) {
      // Add wholesaler info to each product
      productData.wholesaler = {
        ...wholesalerInfo,
        productCode: `HWW-${productData.slug.toUpperCase().substring(0, 10)}`,
        cost: productData.wholesalePrice || productData.price * 0.5
      };
      
      // Remove wholesalePrice as it's now in wholesaler.cost
      delete productData.wholesalePrice;
      
      const product = await Product.create(productData);
      console.log(`Created product: ${product.name}`);
    }
    
    console.log('\n✅ Database seeded successfully!');
    console.log(`Created ${sampleProducts.length} products with wholesaler info`);
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the seed function
seedDatabase();