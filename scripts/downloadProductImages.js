const https = require('https');
const fs = require('fs');
const path = require('path');

// Function to download image from URL
const downloadImage = (url, filename) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(__dirname, '..', 'public', 'images', 'products', filename));
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Downloaded ${filename}`);
          resolve();
        });
      } else {
        console.log(`Failed to download ${filename}: ${response.statusCode}`);
        reject(new Error(`HTTP ${response.statusCode}`));
      }
    }).on('error', (err) => {
      console.log(`Error downloading ${filename}:`, err.message);
      reject(err);
    });
  });
};

// Try to download from JSONPlaceholder's photo service (reliable)
const downloadProductImages = async () => {
  const images = [
    { url: 'https://jsonplaceholder.typicode.com/photos/1', filename: 'amethyst-crystal.jpg' },
    { url: 'https://jsonplaceholder.typicode.com/photos/2', filename: 'rose-quartz-heart.jpg' },
    { url: 'https://jsonplaceholder.typicode.com/photos/3', filename: 'white-sage-bundle.jpg' },
    { url: 'https://jsonplaceholder.typicode.com/photos/4', filename: 'lavender-oil.jpg' },
    { url: 'https://jsonplaceholder.typicode.com/photos/5', filename: 'chakra-stones.jpg' }
  ];

  for (const image of images) {
    try {
      // First get the photo data to get the actual image URL
      const photoData = await new Promise((resolve, reject) => {
        https.get(image.url, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(e);
            }
          });
        }).on('error', reject);
      });

      // Download the actual image
      await downloadImage(photoData.url, image.filename);
    } catch (error) {
      console.log(`Failed to download ${image.filename}:`, error.message);
    }
  }
};

downloadProductImages().then(() => {
  console.log('Image download process completed');
}).catch(err => {
  console.error('Download process failed:', err);
});