const fs = require('fs');
const path = require('path');

// Create simple colored square images as base64 JPEG data
const createColoredImage = (color, filename) => {
  // This is a minimal 1x1 pixel JPEG in base64, but we'll create a simple colored square SVG and save it
  const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="grad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.8" />
        <stop offset="100%" style="stop-color:${color};stop-opacity:1" />
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#grad)"/>
    <circle cx="200" cy="200" r="80" fill="${color}" opacity="0.7"/>
    <circle cx="200" cy="200" r="50" fill="#ffffff" opacity="0.5"/>
  </svg>`;
  
  const filePath = path.join(__dirname, '..', 'public', 'images', 'products', filename);
  fs.writeFileSync(filePath, svg);
  console.log(`Created ${filename}`);
};

// Create product images with appropriate colors
const products = [
  { color: '#9966CC', filename: 'amethyst-crystal.svg' },
  { color: '#F7CAC9', filename: 'rose-quartz-heart.svg' },
  { color: '#8FBC8F', filename: 'white-sage-bundle.svg' },
  { color: '#E6E6FA', filename: 'lavender-oil.svg' },
  { color: '#FF6347', filename: 'chakra-stones.svg' }
];

// Ensure directory exists
const imagesDir = path.join(__dirname, '..', 'public', 'images', 'products');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Create all images
products.forEach(product => {
  createColoredImage(product.color, product.filename);
});

console.log('All product images created as SVG files!');