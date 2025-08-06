const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Allowed file types for different upload contexts
const ALLOWED_FILE_TYPES = {
  csv: {
    mimeTypes: ['text/csv', 'application/vnd.ms-excel', 'text/plain'],
    extensions: ['.csv'],
    maxSize: 10 * 1024 * 1024 // 10MB
  },
  image: {
    mimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxSize: 10 * 1024 * 1024 // 10MB - increased for product images
  }
};

// Dangerous file extensions that should never be allowed
const DANGEROUS_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.scr', '.vbs', '.js', '.jar',
  '.app', '.dmg', '.pkg', '.deb', '.rpm', '.msi', '.sh', '.bash',
  '.ps1', '.psm1', '.reg', '.dll', '.so', '.dylib'
];

// Check if filename contains path traversal attempts
const containsPathTraversal = (filename) => {
  const normalizedPath = path.normalize(filename);
  const pathSegments = normalizedPath.split(path.sep);
  
  // Check for directory traversal patterns
  if (filename.includes('..') || filename.includes('./') || filename.includes('.\\')) {
    return true;
  }
  
  // Check for absolute paths
  if (path.isAbsolute(filename)) {
    return true;
  }
  
  // Check for hidden files
  if (pathSegments.some(segment => segment.startsWith('.'))) {
    return true;
  }
  
  return false;
};

// Validate file type based on magic numbers (file signatures)
const validateFileMagicNumber = (buffer, fileType) => {
  const magicNumbers = {
    image: {
      jpeg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47],
      gif: [0x47, 0x49, 0x46],
      webp: [0x52, 0x49, 0x46, 0x46] // RIFF header for WebP
    },
    csv: {
      // CSV files don't have magic numbers, but we can check for text patterns
      patterns: [
        Buffer.from('sep=', 'utf8'), // Excel CSV
        Buffer.from('"', 'utf8'), // Quoted CSV
        Buffer.from('\uFEFF', 'utf8') // BOM marker
      ]
    }
  };

  if (fileType === 'image') {
    // Check image magic numbers
    if (buffer.slice(0, 3).equals(Buffer.from(magicNumbers.image.jpeg))) {return true;}
    if (buffer.slice(0, 4).equals(Buffer.from(magicNumbers.image.png))) {return true;}
    if (buffer.slice(0, 3).equals(Buffer.from(magicNumbers.image.gif))) {return true;}
    if (buffer.slice(0, 4).equals(Buffer.from(magicNumbers.image.webp))) {return true;}
    return false;
  }

  if (fileType === 'csv') {
    // For CSV, check if it's text and contains common CSV patterns
    const text = buffer.toString('utf8', 0, Math.min(buffer.length, 1000));
    
    // Check for text content with CSV-like patterns
    if (text.includes(',') || text.includes('\t') || text.includes(';')) {
      // Check for common CSV headers or patterns
      const csvPatterns = [/^[a-zA-Z0-9_]+,/m, /^"[^"]+",/m, /^\w+;\w+/m];
      return csvPatterns.some(pattern => pattern.test(text));
    }
    
    return false;
  }

  return false;
};

// Generate secure filename
const generateSecureFilename = (originalFilename, fileType) => {
  const ext = path.extname(originalFilename).toLowerCase();
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  
  // Create secure filename with timestamp and random string
  const baseName = `${fileType}_${timestamp}_${randomBytes}`;
  return `${baseName}${ext}`;
};

// Main file validation middleware factory
const createFileValidator = (fileType) => {
  const config = ALLOWED_FILE_TYPES[fileType];
  
  if (!config) {
    throw new Error(`Invalid file type configuration: ${fileType}`);
  }

  return {
    fileFilter: (req, file, cb) => {
      try {
        // Check filename for path traversal
        if (containsPathTraversal(file.originalname)) {
          return cb(new Error('Invalid filename: potential security risk detected'));
        }

        // Check file extension
        const ext = path.extname(file.originalname).toLowerCase();
        if (!config.extensions.includes(ext)) {
          return cb(new Error(`Invalid file extension. Allowed: ${config.extensions.join(', ')}`));
        }

        // Check for dangerous extensions
        if (DANGEROUS_EXTENSIONS.includes(ext)) {
          return cb(new Error('File type not allowed for security reasons'));
        }

        // Check MIME type
        if (!config.mimeTypes.includes(file.mimetype)) {
          return cb(new Error(`Invalid file type. Allowed: ${config.mimeTypes.join(', ')}`));
        }

        // Additional security checks
        if (file.originalname.length > 255) {
          return cb(new Error('Filename too long'));
        }

        // Check for null bytes
        if (file.originalname.includes('\0')) {
          return cb(new Error('Invalid filename: contains null bytes'));
        }

        cb(null, true);
      } catch (error) {
        cb(error);
      }
    },
    
    limits: {
      fileSize: config.maxSize,
      files: fileType === 'image' ? 10 : 1, // Allow multiple images, single CSV
      fieldNameSize: 100,
      fieldSize: 100 * 1024 // 100KB for field data
    },

    // Post-upload validation
    validateUploadedFile: async (filePath, expectedType) => {
      try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
          throw new Error('Uploaded file not found');
        }

        // Read file header for magic number validation
        const buffer = Buffer.alloc(512);
        const fd = fs.openSync(filePath, 'r');
        fs.readSync(fd, buffer, 0, 512, 0);
        fs.closeSync(fd);

        // Validate magic numbers
        if (!validateFileMagicNumber(buffer, expectedType)) {
          // Clean up the file
          fs.unlinkSync(filePath);
          throw new Error('File content does not match expected type');
        }

        // Check file size again (in case of tampering)
        const stats = fs.statSync(filePath);
        if (stats.size > config.maxSize) {
          fs.unlinkSync(filePath);
          throw new Error('File size exceeds limit');
        }

        return true;
      } catch (error) {
        // Clean up on any error
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        throw error;
      }
    },

    // Generate secure filename
    generateFilename: (req, file, cb) => {
      try {
        const secureFilename = generateSecureFilename(file.originalname, fileType);
        cb(null, secureFilename);
      } catch (error) {
        cb(error);
      }
    }
  };
};

// Cleanup function for temporary files
const cleanupTempFiles = (files) => {
  if (!files) { return; }

  const fileArray = Array.isArray(files) ? files : [files];
  fileArray.forEach(file => {
    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error(`Failed to cleanup temp file: ${file.path}`, error);
      }
    }
  });
};

// Export validators for different file types
module.exports = {
  csvValidator: createFileValidator('csv'),
  imageValidator: createFileValidator('image'),
  cleanupTempFiles,
  generateSecureFilename,
  ALLOWED_FILE_TYPES
};