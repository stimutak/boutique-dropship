// MongoDB initialization script for production
// Creates application user with limited permissions

db = db.getSiblingDB('holistic-store');

// Create application user
db.createUser({
  user: process.env.MONGO_APP_USERNAME || 'boutique_app',
  pwd: process.env.MONGO_APP_PASSWORD || 'changeme',
  roles: [
    {
      role: 'readWrite',
      db: 'holistic-store'
    }
  ]
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });

db.products.createIndex({ price: 1, isActive: 1 });
db.products.createIndex({ category: 1, isActive: 1 });
db.products.createIndex({ createdAt: -1 });

db.orders.createIndex({ customer: 1, createdAt: -1 });
db.orders.createIndex({ status: 1, createdAt: -1 });
db.orders.createIndex({ createdAt: -1 });

db.carts.createIndex({ user: 1 }, { unique: true, sparse: true });
db.carts.createIndex({ sessionId: 1 });
db.carts.createIndex({ updatedAt: 1 });

// Create capped collection for logs if needed
db.createCollection('logs', {
  capped: true,
  size: 10485760, // 10MB
  max: 10000
});