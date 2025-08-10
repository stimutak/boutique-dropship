#!/usr/bin/env node

const mongoose = require('mongoose');
const BlogPost = require('../../models/BlogPost');
require('dotenv').config();

const samplePosts = [
  {
    slug: 'mindful-living-guide',
    title: 'The Art of Mindful Living: A Beginner\'s Guide',
    excerpt: 'Discover how incorporating mindfulness into your daily routine can transform your life. Learn simple techniques to reduce stress, increase focus, and find inner peace.',
    content: `
      <p>In our fast-paced world, finding moments of peace and clarity has become more important than ever. Mindful living isn't just a trend—it's a transformative practice that can enhance every aspect of your life.</p>
      
      <h2>What is Mindfulness?</h2>
      <p>Mindfulness is the practice of being fully present and engaged in the moment, aware of your thoughts and feelings without distraction or judgment. It's about appreciating the here and now, rather than dwelling on the past or worrying about the future.</p>
      
      <h2>Simple Techniques to Start Today</h2>
      <p><strong>1. Mindful Breathing:</strong> Take five minutes each morning to focus solely on your breath. Notice the sensation of air entering and leaving your body.</p>
      
      <p><strong>2. Gratitude Practice:</strong> Each evening, write down three things you're grateful for. This simple act can shift your entire perspective.</p>
      
      <p><strong>3. Mindful Walking:</strong> During your daily walk, pay attention to each step, the feeling of your feet touching the ground, and the world around you.</p>
      
      <h2>The Benefits of Mindful Living</h2>
      <p>Regular mindfulness practice has been scientifically proven to reduce stress, improve focus, enhance emotional regulation, and even boost immune function. By dedicating just a few minutes each day to mindfulness, you can experience profound changes in your overall well-being.</p>
      
      <p>Remember, mindfulness is a journey, not a destination. Be patient with yourself as you develop this practice, and celebrate the small moments of awareness throughout your day.</p>
    `,
    tags: ['Mindfulness', 'Wellness', 'Mental Health', 'Lifestyle'],
    author: 'Sarah Mitchell',
    published: true,
    publishedAt: new Date('2025-08-07'),
    readingTime: 5,
    coverImage: {
      url: '/images/products/amethyst-crystal.jpg',
      alt: 'Peaceful meditation scene'
    }
  },
  {
    slug: 'crystal-healing-energy',
    title: 'Crystal Healing: Harnessing Earth\'s Natural Energy',
    excerpt: 'Explore the ancient practice of crystal healing and learn how different stones can support your physical, emotional, and spiritual well-being.',
    content: `
      <p>For thousands of years, cultures around the world have recognized the unique properties of crystals and their potential to promote healing and balance. Today, crystal healing continues to gain popularity as people seek natural ways to enhance their well-being.</p>
      
      <h2>Understanding Crystal Energy</h2>
      <p>Crystals are believed to work through vibrational energy. Each crystal has its own unique frequency that can interact with our body's energy field, or chakras, to promote healing and balance.</p>
      
      <h2>Popular Healing Crystals and Their Properties</h2>
      <p><strong>Amethyst:</strong> Known for its calming properties, amethyst is excellent for meditation and promoting restful sleep. It's also believed to enhance intuition and spiritual growth.</p>
      
      <p><strong>Rose Quartz:</strong> The stone of unconditional love, rose quartz promotes self-love, compassion, and emotional healing. It's perfect for heart chakra work.</p>
      
      <p><strong>Clear Quartz:</strong> Often called the "master healer," clear quartz amplifies energy and thought. It's excellent for clarity and concentration.</p>
      
      <p><strong>Black Tourmaline:</strong> A powerful protective stone, black tourmaline is believed to shield against negative energy and electromagnetic radiation.</p>
      
      <h2>How to Use Healing Crystals</h2>
      <p>There are many ways to incorporate crystals into your daily life:</p>
      <ul>
        <li>Carry them in your pocket or purse</li>
        <li>Place them in your living or working space</li>
        <li>Use them during meditation</li>
        <li>Wear them as jewelry</li>
        <li>Create crystal grids for specific intentions</li>
      </ul>
      
      <p>Whether you're drawn to crystals for their beauty or their energetic properties, these natural treasures offer a tangible connection to the Earth's ancient wisdom.</p>
    `,
    tags: ['Crystals', 'Energy Healing', 'Spirituality', 'Wellness'],
    author: 'Michael Chen',
    published: true,
    publishedAt: new Date('2025-08-05'),
    readingTime: 6,
    coverImage: {
      url: '/images/products/chakra-stones.jpg',
      alt: 'Collection of healing crystals'
    }
  }
];

async function addSamplePosts() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store';
    console.log('Connecting to:', mongoUri);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if posts already exist
    const existingCount = await BlogPost.countDocuments();
    if (existingCount > 0) {
      console.log(`Database already has ${existingCount} blog posts. Skipping sample data.`);
      console.log('To add sample posts anyway, first delete existing posts.');
      process.exit(0);
    }

    // Add sample posts
    for (const post of samplePosts) {
      const newPost = await BlogPost.create(post);
      console.log(`✅ Created blog post: "${newPost.title}"`);
    }

    console.log('\n✨ Successfully added sample blog posts!');
    console.log('You can now view them at /blog');
    
  } catch (error) {
    console.error('Error adding sample posts:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
addSamplePosts();