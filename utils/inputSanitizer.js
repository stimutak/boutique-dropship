const mongoose = require('mongoose');

/**
 * NoSQL Injection Prevention Utilities
 * 
 * This module provides comprehensive input sanitization to prevent NoSQL injection attacks
 * in MongoDB applications. It validates and sanitizes user input before it reaches the database.
 */

// MongoDB operators that should be removed from user input
const MONGODB_OPERATORS = [
  '$where', '$ne', '$in', '$nin', '$gt', '$gte', '$lt', '$lte', '$exists', '$type',
  '$mod', '$regex', '$text', '$search', '$all', '$elemMatch', '$size', '$slice',
  '$and', '$or', '$nor', '$not', '$expr', '$jsonSchema', '$geoIntersects',
  '$geoWithin', '$near', '$nearSphere', '$set', '$unset', '$inc', '$mul',
  '$rename', '$setOnInsert', '$min', '$max', '$currentDate', '$addToSet',
  '$pop', '$pullAll', '$pull', '$push', '$pushAll', '$each', '$position',
  '$sort', '$bit', '$isolated', '$atomic', '$comment', '$explain', '$hint',
  '$maxTimeMS', '$orderby', '$query', '$returnKey', '$showDiskLoc',
  '$snapshot', '$natural', '$eval', '$function', '$accumulator', '$addFields',
  '$bucket', '$bucketAuto', '$collStats', '$count', '$facet', '$geoNear',
  '$graphLookup', '$group', '$indexStats', '$limit', '$listSessions',
  '$lookup', '$match', '$merge', '$out', '$planCacheStats', '$project',
  '$redact', '$replaceRoot', '$replaceWith', '$sample', '$skip', '$sortByCount',
  '$unionWith', '$unwind'
];

/**
 * Validates if a string is a valid MongoDB ObjectId
 * @param {string} id - The ID to validate
 * @returns {boolean} - True if valid ObjectId, false otherwise
 */
function isValidObjectId(id) {
  if (typeof id !== 'string') {
    return false;
  }
  
  // Check if it's a valid ObjectId format (24 hex characters)
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return false;
  }
  
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Validates and sanitizes an ObjectId from user input
 * @param {any} id - The ID to validate
 * @returns {string|null} - Valid ObjectId string or null if invalid
 */
function sanitizeObjectId(id) {
  if (!id) {
    return null;
  }
  
  // Convert to string and trim
  const idString = String(id).trim();
  
  if (!isValidObjectId(idString)) {
    return null;
  }
  
  return idString;
}

/**
 * Sanitizes a single value by removing MongoDB operators
 * @param {any} value - The value to sanitize
 * @param {WeakSet} visited - Set to track circular references
 * @returns {any} - Sanitized value
 */
function sanitizeValue(value, visited = new WeakSet()) {
  if (value === null || value === undefined) {
    return value;
  }
  
  // Handle primitive types
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    // Check for circular references
    if (visited.has(value)) {
      return []; // Return empty array for circular references
    }
    visited.add(value);
    
    const result = value.map(item => sanitizeValue(item, visited));
    visited.delete(value);
    return result;
  }
  
  // Handle objects - this is where we remove MongoDB operators
  if (typeof value === 'object') {
    // Check for circular references
    if (visited.has(value)) {
      return {}; // Return empty object for circular references
    }
    visited.add(value);
    
    const sanitized = {};
    
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        // Skip MongoDB operators
        if (MONGODB_OPERATORS.includes(key)) {
          continue;
        }
        
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeValue(value[key], visited);
      }
    }
    
    visited.delete(value);
    return sanitized;
  }
  
  return value;
}

/**
 * Sanitizes query parameters from req.query
 * @param {object} query - The query object to sanitize
 * @returns {object} - Sanitized query object
 */
function sanitizeQuery(query) {
  if (!query || typeof query !== 'object') {
    return {};
  }
  
  const sanitized = {};
  
  for (const key in query) {
    if (Object.prototype.hasOwnProperty.call(query, key)) {
      const value = query[key];
      
      // Handle array values (e.g., ?category=crystals&category=herbs)
      if (Array.isArray(value)) {
        sanitized[key] = value.map(item => {
          // Convert to string and sanitize
          return typeof item === 'string' ? item : String(item);
        });
      } else {
        // Convert to string for safety (query params should be strings)
        sanitized[key] = typeof value === 'string' ? value : String(value);
      }
    }
  }
  
  return sanitized;
}

/**
 * Sanitizes request body to prevent NoSQL injection
 * @param {object} body - The request body to sanitize
 * @returns {object} - Sanitized request body
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }
  
  return sanitizeValue(body);
}

/**
 * Validates that a value contains only allowed query operators for specific use cases
 * @param {object} query - Query object to validate
 * @param {string[]} allowedOperators - Array of allowed MongoDB operators
 * @returns {boolean} - True if all operators are allowed
 */
function validateAllowedOperators(query, allowedOperators = []) {
  if (!query || typeof query !== 'object') {
    return true;
  }
  
  for (const key in query) {
    if (key.startsWith('$') && !allowedOperators.includes(key)) {
      return false;
    }
    
    if (typeof query[key] === 'object' && query[key] !== null) {
      if (!validateAllowedOperators(query[key], allowedOperators)) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Creates a safe aggregation match stage by sanitizing input
 * @param {object} matchConditions - Conditions for the $match stage
 * @returns {object} - Safe match conditions
 */
function createSafeMatchStage(matchConditions) {
  if (!matchConditions || typeof matchConditions !== 'object') {
    return {};
  }
  
  const sanitized = {};
  
  for (const key in matchConditions) {
    if (Object.prototype.hasOwnProperty.call(matchConditions, key) && !key.startsWith('$')) {
      const value = matchConditions[key];
      
      // Only allow simple value comparisons in aggregation
      if (typeof value === 'string' || typeof value === 'number' || 
          typeof value === 'boolean' || value instanceof Date) {
        sanitized[key] = value;
      } else if (value && typeof value === 'object' && value.constructor === Object) {
        // Allow specific safe operators only
        const safeValue = {};
        if (value.$eq !== undefined) {safeValue.$eq = value.$eq;}
        if (value.$ne !== undefined) {safeValue.$ne = value.$ne;}
        if (value.$in !== undefined && Array.isArray(value.$in)) {
          safeValue.$in = value.$in.filter(item => 
            typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
          );
        }
        if (Object.keys(safeValue).length > 0) {
          sanitized[key] = safeValue;
        }
      }
    }
  }
  
  return sanitized;
}

/**
 * Middleware to sanitize all request inputs
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Next middleware function
 */
function sanitizeInputMiddleware(req, res, next) {
  try {
    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeQuery(req.query);
    }
    
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeBody(req.body);
    }
    
    // Sanitize route parameters that should be ObjectIds
    if (req.params) {
      for (const param in req.params) {
        if (Object.prototype.hasOwnProperty.call(req.params, param)) {
          const value = req.params[param];
          
          // Common ObjectId parameter names
          if (['id', 'userId', 'productId', 'orderId', 'reviewId', 'addressId'].includes(param)) {
            const sanitizedId = sanitizeObjectId(value);
            if (!sanitizedId) {
              return res.status(400).json({
                success: false,
                error: {
                  code: 'INVALID_ID',
                  message: `Invalid ${param} format`
                }
              });
            }
            req.params[param] = sanitizedId;
          }
        }
      }
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SANITIZATION_ERROR',
        message: 'Input sanitization failed'
      }
    });
  }
}

/**
 * Specific sanitizer for ObjectId parameters in routes
 * @param {string} paramName - Name of the parameter to validate
 */
function validateObjectIdParam(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_ID',
          message: `${paramName} is required`
        }
      });
    }
    
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: `Invalid ${paramName} format`
        }
      });
    }
    
    req.params[paramName] = sanitizedId;
    next();
  };
}

/**
 * Express validator custom validation function for ObjectIds
 * @param {any} value - Value to validate
 * @returns {boolean} - True if valid ObjectId
 */
function isObjectId(value) {
  return isValidObjectId(value);
}

/**
 * Sanitizes search query to prevent regex injection
 * @param {string} searchQuery - Search query string
 * @returns {string} - Sanitized search query
 */
function sanitizeSearchQuery(searchQuery) {
  if (typeof searchQuery !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous regex characters
  return searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  isValidObjectId,
  sanitizeObjectId,
  sanitizeValue,
  sanitizeQuery,
  sanitizeBody,
  validateAllowedOperators,
  createSafeMatchStage,
  sanitizeInputMiddleware,
  validateObjectIdParam,
  isObjectId,
  sanitizeSearchQuery,
  MONGODB_OPERATORS
};