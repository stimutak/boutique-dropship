const fs = require('fs');
const path = require('path');

// Create sample product images as HTML files that can be converted to images
const createProductImage = (filename, title, color, description) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            margin: 0;
            padding: 0;
            width: 400px;
            height: 400px;
            background: linear-gradient(135deg, ${color}22, ${color});
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: 'Arial', sans-serif;
            color: #333;
        }
        .product-container {
            text-align: center;
            padding: 40px;
            background: rgba(255,255,255,0.9);
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            max-width: 300px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
        }
        .description {
            font-size: 14px;
            color: #666;
            line-height: 1.4;
        }
        .icon {
            font-size: 60px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="product-container">
        <div class="icon">${getIcon(title)}</div>
        <div class="title">${title}</div>
        <div class="description">${description}</div>
    </div>
</body>
</html>`;

  fs.writeFileSync(path.join(__dirname, '..', 'public', 'images', 'products', filename + '.html'), html);
};

function getIcon(title) {
  if (title.includes('Amethyst')) {return '💎';}
  if (title.includes('Rose Quartz')) {return '💖';}
  if (title.includes('Sage')) {return '🌿';}
  if (title.includes('Lavender')) {return '🌸';}
  if (title.includes('Chakra')) {return '🔮';}
  return '✨';
}

// Create product images
const products = [
  {
    filename: 'amethyst-crystal',
    title: 'Amethyst Crystal',
    color: '#9966CC',
    description: 'Natural amethyst cluster for meditation and spiritual healing'
  },
  {
    filename: 'rose-quartz-heart',
    title: 'Rose Quartz Heart',
    color: '#F7CAC9',
    description: 'Hand-carved rose quartz heart stone for love and compassion'
  },
  {
    filename: 'white-sage-bundle',
    title: 'White Sage Bundle',
    color: '#8FBC8F',
    description: 'Premium white sage smudge bundle for cleansing and purification'
  },
  {
    filename: 'lavender-oil',
    title: 'Lavender Essential Oil',
    color: '#E6E6FA',
    description: 'Pure therapeutic grade lavender oil for relaxation and sleep'
  },
  {
    filename: 'chakra-stones',
    title: 'Chakra Stone Set',
    color: '#FF6347',
    description: 'Complete set of seven chakra stones for energy balancing'
  }
];

// Ensure directory exists
const imagesDir = path.join(__dirname, '..', 'public', 'images', 'products');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Create all product images
products.forEach(product => {
  createProductImage(product.filename, product.title, product.color, product.description);
  console.log(`Created ${product.filename}.html`);
});

console.log('All product image templates created!');