#!/usr/bin/env node

/**
 * Production Preparation Script
 * Prepares the application for deployment to DreamHost
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Preparing application for production deployment...\n');

// Check for required environment file
if (!fs.existsSync('.env.production')) {
  console.error('❌ Missing .env.production file!');
  console.log('Please copy .env.production.example and configure it with your values.');
  process.exit(1);
}

// Create required directories
const directories = [
  'logs',
  'public/uploads',
  'public/images/products',
  'tmp'
];

directories.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Create app.js for Passenger compatibility
const appJsContent = `// DreamHost Passenger entry point
const app = require('./server.production.js');
const PORT = process.env.PORT || 3000;

if (typeof(PhusionPassenger) !== 'undefined') {
    PhusionPassenger.configure({ autoInstall: false });
    app.listen('passenger');
    console.log('🚀 Application started with Passenger');
} else {
    app.listen(PORT, () => {
        console.log(\`🚀 Server running on port \${PORT}\`);
    });
}
`;

fs.writeFileSync('app.js', appJsContent);
console.log('✅ Created app.js for Passenger');

// Copy production server file
if (fs.existsSync('server.production.js')) {
  console.log('✅ Production server file found');
} else {
  console.error('❌ Missing server.production.js file!');
  process.exit(1);
}

// Verify client build exists
if (!fs.existsSync('client/dist')) {
  console.error('❌ Client build not found! Run "cd client && npm run build" first.');
  process.exit(1);
}

// Copy client build to public folder
const copyRecursiveSync = (src, dest) => {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
};

// Clear existing public folder (except uploads and images)
const publicPath = path.join(process.cwd(), 'public');
if (fs.existsSync(publicPath)) {
  fs.readdirSync(publicPath).forEach(file => {
    if (file !== 'uploads' && file !== 'images') {
      const filePath = path.join(publicPath, file);
      if (fs.lstatSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    }
  });
}

// Copy client build to public
copyRecursiveSync('client/dist', 'public');
console.log('✅ Copied client build to public folder');

// Create deployment info file
const deploymentInfo = {
  version: require('../package.json').version,
  buildDate: new Date().toISOString(),
  nodeVersion: process.version,
  environment: 'production'
};

fs.writeFileSync('deployment-info.json', JSON.stringify(deploymentInfo, null, 2));
console.log('✅ Created deployment info file');

// Security check - ensure no sensitive files are included
const sensitiveFiles = [
  '.env',
  '.env.local',
  '.env.development',
  'docker-compose.yml',
  'Dockerfile',
  '.git'
];

const foundSensitive = sensitiveFiles.filter(file => fs.existsSync(file));
if (foundSensitive.length > 0) {
  console.warn('\n⚠️  Warning: Found sensitive files that should not be deployed:');
  foundSensitive.forEach(file => console.warn(`   - ${file}`));
  console.warn('Make sure to exclude these from deployment!\n');
}

console.log('\n✨ Production preparation complete!');
console.log('\nNext steps:');
console.log('1. Review and update .env.production with your actual values');
console.log('2. Run "npm run deploy:dreamhost" to deploy to DreamHost');
console.log('3. Set up environment variables in DreamHost panel');
console.log('4. Configure MongoDB Atlas connection');
console.log('5. Test your deployment at https://your-domain.com\n');