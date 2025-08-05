const mongoose = require('mongoose');
const Settings = require('../models/Settings');

// Default settings configuration
const defaultSettings = [
  // General Settings
  {
    key: 'app_name',
    category: 'general',
    label: 'Application Name',
    description: 'The name of your application displayed to users',
    value: 'International Boutique Store',
    defaultValue: 'International Boutique Store',
    dataType: 'string',
    inputType: 'text',
    validation: { required: true, minLength: 1, maxLength: 100 },
    isPublic: true,
    sortOrder: 1
  },
  {
    key: 'app_description',
    category: 'general',
    label: 'Application Description',
    description: 'Brief description of your store',
    value: 'Your premier destination for holistic wellness products',
    defaultValue: 'Your premier destination for holistic wellness products',
    dataType: 'string',
    inputType: 'textarea',
    validation: { maxLength: 500 },
    isPublic: true,
    sortOrder: 2
  },
  {
    key: 'maintenance_mode',
    category: 'general',
    label: 'Maintenance Mode',
    description: 'Enable to show maintenance page to customers',
    value: false,
    defaultValue: false,
    dataType: 'boolean',
    inputType: 'boolean',
    requiresRestart: true,
    sortOrder: 3
  },
  
  // Store Settings
  {
    key: 'store_address',
    category: 'store',
    label: 'Store Address',
    description: 'Physical address of your store',
    value: '',
    defaultValue: '',
    dataType: 'object',
    inputType: 'json',
    validation: { required: false },
    isPublic: true,
    sortOrder: 1
  },
  {
    key: 'store_phone',
    category: 'store',
    label: 'Store Phone Number',
    description: 'Customer service phone number',
    value: '',
    defaultValue: '',
    dataType: 'string',
    inputType: 'text',
    validation: { pattern: '^[+]?[0-9\\s\\-\\(\\)]+$' },
    isPublic: true,
    sortOrder: 2
  },
  {
    key: 'store_email',
    category: 'store',
    label: 'Store Contact Email',
    description: 'Main contact email for customer inquiries',
    value: '',
    defaultValue: '',
    dataType: 'string',
    inputType: 'email',
    validation: { pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
    isPublic: true,
    sortOrder: 3
  },
  {
    key: 'business_hours',
    category: 'store',
    label: 'Business Hours',
    description: 'Store operating hours',
    value: {
      monday: '9:00 AM - 6:00 PM',
      tuesday: '9:00 AM - 6:00 PM',
      wednesday: '9:00 AM - 6:00 PM',
      thursday: '9:00 AM - 6:00 PM',
      friday: '9:00 AM - 6:00 PM',
      saturday: '10:00 AM - 4:00 PM',
      sunday: 'Closed'
    },
    defaultValue: {
      monday: '9:00 AM - 6:00 PM',
      tuesday: '9:00 AM - 6:00 PM',
      wednesday: '9:00 AM - 6:00 PM',
      thursday: '9:00 AM - 6:00 PM',
      friday: '9:00 AM - 6:00 PM',
      saturday: '10:00 AM - 4:00 PM',
      sunday: 'Closed'
    },
    dataType: 'object',
    inputType: 'json',
    isPublic: true,
    sortOrder: 4
  },
  
  // Payment Settings
  {
    key: 'mollie_api_key',
    category: 'payment',
    label: 'Mollie API Key',
    description: 'Production Mollie API key for payment processing',
    value: '',
    defaultValue: '',
    dataType: 'string',
    inputType: 'password',
    validation: { required: true, pattern: '^(live|test)_' },
    requiresRestart: true,
    sortOrder: 1
  },
  {
    key: 'payment_methods',
    category: 'payment',
    label: 'Enabled Payment Methods',
    description: 'Payment methods available to customers',
    value: ['creditcard', 'paypal', 'banktransfer'],
    defaultValue: ['creditcard', 'paypal', 'banktransfer'],
    dataType: 'array',
    inputType: 'multiselect',
    options: [
      { label: 'Credit Card', value: 'creditcard' },
      { label: 'PayPal', value: 'paypal' },
      { label: 'Bank Transfer', value: 'banktransfer' },
      { label: 'Apple Pay', value: 'applepay' },
      { label: 'Google Pay', value: 'googlepay' }
    ],
    validation: { required: true, min: 1 },
    sortOrder: 2
  },
  {
    key: 'tax_rate',
    category: 'payment',
    label: 'Default Tax Rate (%)',
    description: 'Default tax rate applied to orders',
    value: 8.5,
    defaultValue: 8.5,
    dataType: 'number',
    inputType: 'number',
    validation: { required: true, min: 0, max: 50 },
    sortOrder: 3
  },
  
  // Shipping Settings
  {
    key: 'free_shipping_threshold',
    category: 'shipping',
    label: 'Free Shipping Threshold',
    description: 'Minimum order value for free shipping (USD)',
    value: 75,
    defaultValue: 75,
    dataType: 'number',
    inputType: 'currency',
    validation: { required: true, min: 0 },
    isPublic: true,
    sortOrder: 1
  },
  {
    key: 'shipping_rates',
    category: 'shipping',
    label: 'Shipping Rates',
    description: 'Shipping costs by region',
    value: {
      domestic: 5.99,
      international: 15.99
    },
    defaultValue: {
      domestic: 5.99,
      international: 15.99
    },
    dataType: 'object',
    inputType: 'json',
    validation: { required: true },
    isPublic: true,
    sortOrder: 2
  },
  {
    key: 'processing_time',
    category: 'shipping',
    label: 'Order Processing Time',
    description: 'Time required to process orders before shipping',
    value: '1-2 business days',
    defaultValue: '1-2 business days',
    dataType: 'string',
    inputType: 'text',
    validation: { required: true, maxLength: 100 },
    isPublic: true,
    sortOrder: 3
  },
  
  // Email Settings
  {
    key: 'smtp_host',
    category: 'email',
    label: 'SMTP Host',
    description: 'SMTP server hostname',
    value: 'smtp.gmail.com',
    defaultValue: 'smtp.gmail.com',
    dataType: 'string',
    inputType: 'text',
    validation: { required: true },
    requiresRestart: true,
    sortOrder: 1
  },
  {
    key: 'smtp_port',
    category: 'email',
    label: 'SMTP Port',
    description: 'SMTP server port',
    value: 587,
    defaultValue: 587,
    dataType: 'number',
    inputType: 'number',
    validation: { required: true, min: 1, max: 65535 },
    requiresRestart: true,
    sortOrder: 2
  },
  {
    key: 'smtp_user',
    category: 'email',
    label: 'SMTP Username',
    description: 'SMTP authentication username',
    value: '',
    defaultValue: '',
    dataType: 'string',
    inputType: 'email',
    validation: { required: true },
    requiresRestart: true,
    sortOrder: 3
  },
  {
    key: 'smtp_password',
    category: 'email',
    label: 'SMTP Password',
    description: 'SMTP authentication password',
    value: '',
    defaultValue: '',
    dataType: 'string',
    inputType: 'password',
    validation: { required: true },
    requiresRestart: true,
    sortOrder: 4
  },
  {
    key: 'from_email',
    category: 'email',
    label: 'From Email Address',
    description: 'Email address used as sender',
    value: '',
    defaultValue: '',
    dataType: 'string',
    inputType: 'email',
    validation: { required: true, pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
    isPublic: true,
    sortOrder: 5
  },
  {
    key: 'from_name',
    category: 'email',
    label: 'From Name',
    description: 'Name displayed as email sender',
    value: 'International Boutique Store',
    defaultValue: 'International Boutique Store',
    dataType: 'string',
    inputType: 'text',
    validation: { required: true, maxLength: 100 },
    isPublic: true,
    sortOrder: 6
  },
  
  // Security Settings
  {
    key: 'jwt_expiry',
    category: 'security',
    label: 'JWT Token Expiry',
    description: 'JWT token expiration time (e.g., "7d", "24h")',
    value: '7d',
    defaultValue: '7d',
    dataType: 'string',
    inputType: 'text',
    validation: { required: true, pattern: '^\\d+[dhm]$' },
    requiresRestart: true,
    sortOrder: 1
  },
  {
    key: 'session_timeout',
    category: 'security',
    label: 'Session Timeout (minutes)',
    description: 'User session timeout in minutes',
    value: 30,
    defaultValue: 30,
    dataType: 'number',
    inputType: 'number',
    validation: { required: true, min: 5, max: 1440 },
    requiresRestart: true,
    sortOrder: 2
  },
  {
    key: 'rate_limit_requests',
    category: 'security',
    label: 'Rate Limit - Max Requests',
    description: 'Maximum requests per time window',
    value: 100,
    defaultValue: 100,
    dataType: 'number',
    inputType: 'number',
    validation: { required: true, min: 10, max: 1000 },
    requiresRestart: true,
    sortOrder: 3
  },
  {
    key: 'rate_limit_window',
    category: 'security',
    label: 'Rate Limit - Time Window (minutes)',
    description: 'Time window for rate limiting in minutes',
    value: 15,
    defaultValue: 15,
    dataType: 'number',
    inputType: 'number',
    validation: { required: true, min: 1, max: 60 },
    requiresRestart: true,
    sortOrder: 4
  },
  
  // Internationalization Settings
  {
    key: 'default_language',
    category: 'internationalization',
    label: 'Default Language',
    description: 'Default language for the application',
    value: 'en',
    defaultValue: 'en',
    dataType: 'string',
    inputType: 'select',
    options: [
      { label: 'English', value: 'en' },
      { label: 'Spanish', value: 'es' },
      { label: 'French', value: 'fr' },
      { label: 'German', value: 'de' },
      { label: 'Italian', value: 'it' },
      { label: 'Portuguese', value: 'pt' },
      { label: 'Chinese', value: 'zh' },
      { label: 'Japanese', value: 'ja' },
      { label: 'Korean', value: 'ko' },
      { label: 'Arabic', value: 'ar' },
      { label: 'Hebrew', value: 'he' }
    ],
    validation: { required: true },
    isPublic: true,
    sortOrder: 1
  },
  {
    key: 'supported_languages',
    category: 'internationalization',
    label: 'Supported Languages',
    description: 'Languages available to users',
    value: ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar', 'he'],
    defaultValue: ['en', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko', 'ar', 'he'],
    dataType: 'array',
    inputType: 'multiselect',
    options: [
      { label: 'English', value: 'en' },
      { label: 'Spanish', value: 'es' },
      { label: 'French', value: 'fr' },
      { label: 'German', value: 'de' },
      { label: 'Italian', value: 'it' },
      { label: 'Portuguese', value: 'pt' },
      { label: 'Chinese', value: 'zh' },
      { label: 'Japanese', value: 'ja' },
      { label: 'Korean', value: 'ko' },
      { label: 'Arabic', value: 'ar' },
      { label: 'Hebrew', value: 'he' }
    ],
    validation: { required: true, min: 1 },
    isPublic: true,
    sortOrder: 2
  },
  {
    key: 'default_currency',
    category: 'internationalization',
    label: 'Default Currency',
    description: 'Default currency for the application',
    value: 'USD',
    defaultValue: 'USD',
    dataType: 'string',
    inputType: 'select',
    options: [
      { label: 'US Dollar (USD)', value: 'USD' },
      { label: 'Euro (EUR)', value: 'EUR' },
      { label: 'British Pound (GBP)', value: 'GBP' },
      { label: 'Japanese Yen (JPY)', value: 'JPY' },
      { label: 'Chinese Yuan (CNY)', value: 'CNY' },
      { label: 'Canadian Dollar (CAD)', value: 'CAD' },
      { label: 'Australian Dollar (AUD)', value: 'AUD' },
      { label: 'Swiss Franc (CHF)', value: 'CHF' },
      { label: 'Swedish Krona (SEK)', value: 'SEK' },
      { label: 'Norwegian Krone (NOK)', value: 'NOK' },
      { label: 'Indian Rupee (INR)', value: 'INR' },
      { label: 'Brazilian Real (BRL)', value: 'BRL' },
      { label: 'Mexican Peso (MXN)', value: 'MXN' }
    ],
    validation: { required: true },
    isPublic: true,
    sortOrder: 3
  },
  {
    key: 'supported_currencies',
    category: 'internationalization',
    label: 'Supported Currencies',
    description: 'Currencies available to users',
    value: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF', 'SEK', 'NOK', 'INR', 'BRL', 'MXN'],
    defaultValue: ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF', 'SEK', 'NOK', 'INR', 'BRL', 'MXN'],
    dataType: 'array',
    inputType: 'multiselect',
    options: [
      { label: 'US Dollar (USD)', value: 'USD' },
      { label: 'Euro (EUR)', value: 'EUR' },
      { label: 'British Pound (GBP)', value: 'GBP' },
      { label: 'Japanese Yen (JPY)', value: 'JPY' },
      { label: 'Chinese Yuan (CNY)', value: 'CNY' },
      { label: 'Canadian Dollar (CAD)', value: 'CAD' },
      { label: 'Australian Dollar (AUD)', value: 'AUD' },
      { label: 'Swiss Franc (CHF)', value: 'CHF' },
      { label: 'Swedish Krona (SEK)', value: 'SEK' },
      { label: 'Norwegian Krone (NOK)', value: 'NOK' },
      { label: 'Indian Rupee (INR)', value: 'INR' },
      { label: 'Brazilian Real (BRL)', value: 'BRL' },
      { label: 'Mexican Peso (MXN)', value: 'MXN' }
    ],
    validation: { required: true, min: 1 },
    isPublic: true,
    sortOrder: 4
  },
  
  // Analytics Settings
  {
    key: 'analytics_enabled',
    category: 'analytics',
    label: 'Enable Analytics',
    description: 'Enable collection of analytics data',
    value: true,
    defaultValue: true,
    dataType: 'boolean',
    inputType: 'boolean',
    sortOrder: 1
  },
  {
    key: 'google_analytics_id',
    category: 'analytics',
    label: 'Google Analytics ID',
    description: 'Google Analytics tracking ID',
    value: '',
    defaultValue: '',
    dataType: 'string',
    inputType: 'text',
    validation: { pattern: '^(GA|G)-[A-Z0-9-]+$' },
    isPublic: true,
    sortOrder: 2
  },
  
  // Maintenance Settings
  {
    key: 'backup_frequency',
    category: 'maintenance',
    label: 'Backup Frequency',
    description: 'How often to create database backups',
    value: 'daily',
    defaultValue: 'daily',
    dataType: 'string',
    inputType: 'select',
    options: [
      { label: 'Never', value: 'never' },
      { label: 'Daily', value: 'daily' },
      { label: 'Weekly', value: 'weekly' },
      { label: 'Monthly', value: 'monthly' }
    ],
    validation: { required: true },
    sortOrder: 1
  },
  {
    key: 'log_retention_days',
    category: 'maintenance',
    label: 'Log Retention (days)',
    description: 'How long to keep application logs',
    value: 30,
    defaultValue: 30,
    dataType: 'number',
    inputType: 'number',
    validation: { required: true, min: 1, max: 365 },
    sortOrder: 2
  }
];

async function populateSettings() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/holistic-store');
    console.log('Connected to MongoDB');
    
    // Clear existing settings
    await Settings.deleteMany({});
    console.log('Cleared existing settings');
    
    // Insert default settings
    const results = await Settings.insertMany(defaultSettings);
    console.log(`Inserted ${results.length} default settings`);
    
    // Log settings by category
    const categories = [...new Set(defaultSettings.map(s => s.category))];
    for (const category of categories) {
      const count = defaultSettings.filter(s => s.category === category).length;
      console.log(`  ${category}: ${count} settings`);
    }
    
    console.log('Settings population completed successfully');
    
  } catch (error) {
    console.error('Error populating settings:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

// Run if called directly
if (require.main === module) {
  populateSettings();
}

module.exports = { populateSettings, defaultSettings };