const mongoose = require('mongoose');
const {
  isValidObjectId,
  sanitizeObjectId,
  sanitizeQuery,
  sanitizeBody,
  validateAllowedOperators,
  createSafeMatchStage,
  sanitizeSearchQuery,
  MONGODB_OPERATORS
} = require('../../utils/inputSanitizer');

describe('Input Sanitization Unit Tests', () => {
  describe('ObjectId Validation', () => {
    test('isValidObjectId should correctly validate ObjectIds', () => {
      const validId = new mongoose.Types.ObjectId().toString();
      
      // Valid cases
      expect(isValidObjectId(validId)).toBe(true);
      expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
      
      // Invalid cases
      expect(isValidObjectId('invalid-id')).toBe(false);
      expect(isValidObjectId('123')).toBe(false);
      expect(isValidObjectId(null)).toBe(false);
      expect(isValidObjectId(undefined)).toBe(false);
      expect(isValidObjectId({})).toBe(false);
      expect(isValidObjectId({ '$ne': null })).toBe(false);
      expect(isValidObjectId('')).toBe(false);
      expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false); // Too short
      expect(isValidObjectId('507f1f77bcf86cd799439011x')).toBe(false); // Too long
    });

    test('sanitizeObjectId should return valid ObjectId or null', () => {
      const validId = new mongoose.Types.ObjectId().toString();
      
      expect(sanitizeObjectId(validId)).toBe(validId);
      expect(sanitizeObjectId('  ' + validId + '  ')).toBe(validId); // Trims whitespace
      expect(sanitizeObjectId('invalid')).toBe(null);
      expect(sanitizeObjectId({ '$ne': null })).toBe(null);
      expect(sanitizeObjectId(null)).toBe(null);
      expect(sanitizeObjectId(undefined)).toBe(null);
      expect(sanitizeObjectId('')).toBe(null);
      expect(sanitizeObjectId(123)).toBe(null);
    });
  });

  describe('Query Sanitization', () => {
    test('sanitizeQuery should sanitize MongoDB operators', () => {
      const maliciousQuery = {
        name: 'test',
        email: { '$ne': null },
        price: { '$gt': 0 },
        category: ['crystals', 'herbs'],
        status: 'active'
      };

      const sanitized = sanitizeQuery(maliciousQuery);
      
      expect(sanitized.name).toBe('test');
      expect(sanitized.status).toBe('active');
      expect(sanitized.category).toEqual(['crystals', 'herbs']);
      
      // MongoDB operators should be converted to strings
      expect(sanitized.email).toBe('[object Object]');
      expect(sanitized.price).toBe('[object Object]');
    });

    test('sanitizeQuery should handle edge cases', () => {
      expect(sanitizeQuery(null)).toEqual({});
      expect(sanitizeQuery(undefined)).toEqual({});
      expect(sanitizeQuery('string')).toEqual({});
      expect(sanitizeQuery(123)).toEqual({});
      
      const emptyQuery = sanitizeQuery({});
      expect(emptyQuery).toEqual({});
    });
  });

  describe('Body Sanitization', () => {
    test('sanitizeBody should remove MongoDB operators from nested objects', () => {
      const maliciousBody = {
        name: 'test',
        email: { '$ne': 'admin@test.com' },
        preferences: {
          notifications: { '$set': true },
          validField: 'value',
          nested: {
            '$where': 'function() { return true; }',
            safeValue: 123
          }
        },
        '$where': 'function() { return true; }',
        validArray: [1, 2, 3, { '$ne': null }],
        primitiveValue: 'safe'
      };

      const sanitized = sanitizeBody(maliciousBody);
      
      expect(sanitized.name).toBe('test');
      expect(sanitized.primitiveValue).toBe('safe');
      expect(sanitized.email).toEqual({}); // MongoDB operators removed
      expect(sanitized.preferences.validField).toBe('value');
      expect(sanitized.preferences.notifications).toEqual({}); // $set removed
      expect(sanitized.preferences.nested.safeValue).toBe(123);
      expect(sanitized.preferences.nested['$where']).toBeUndefined(); // $where removed
      expect(sanitized['$where']).toBeUndefined(); // Top-level operator removed
      expect(sanitized.validArray).toEqual([1, 2, 3, {}]); // Array with sanitized object
    });

    test('sanitizeBody should handle primitive values', () => {
      expect(sanitizeBody('string')).toBe('string');
      expect(sanitizeBody(123)).toBe(123);
      expect(sanitizeBody(true)).toBe(true);
      expect(sanitizeBody(null)).toBe(null);
      expect(sanitizeBody(undefined)).toBe(undefined);
      expect(sanitizeBody([])).toEqual([]);
    });
  });

  describe('Operator Validation', () => {
    test('validateAllowedOperators should validate allowed operators', () => {
      const queryWithDisallowedOps = {
        name: 'test',
        '$where': 'function() { return true; }',
        '$ne': null
      };

      const queryWithAllowedOps = {
        name: 'test',
        '$eq': 'value'
      };

      expect(validateAllowedOperators(queryWithDisallowedOps, [])).toBe(false);
      expect(validateAllowedOperators(queryWithDisallowedOps, ['$eq'])).toBe(false);
      expect(validateAllowedOperators(queryWithAllowedOps, ['$eq'])).toBe(true);
      expect(validateAllowedOperators({ name: 'test' }, [])).toBe(true);
    });
  });

  describe('Safe Aggregation Stage Creation', () => {
    test('createSafeMatchStage should create safe aggregation conditions', () => {
      const maliciousConditions = {
        name: 'test',
        '$where': 'function() { return true; }',
        email: { '$ne': null },
        price: { '$gt': 100, '$lt': 200 },
        category: { '$regex': '.*', '$options': 'i' },
        isActive: true
      };

      const safeStage = createSafeMatchStage(maliciousConditions);

      expect(safeStage.name).toBe('test');
      expect(safeStage.isActive).toBe(true);
      expect(safeStage['$where']).toBeUndefined();
      expect(safeStage.email).toBeDefined();
      expect(safeStage.email.$ne).toBe(null);
      expect(safeStage.price).toBeUndefined(); // $gt/$lt not in safe operators
      expect(safeStage.category).toBeUndefined(); // $regex not in safe operators
    });
  });

  describe('Search Query Sanitization', () => {
    test('sanitizeSearchQuery should escape regex special characters', () => {
      const dangerousSearch = 'test.*+?^${}()|[]\\';
      const sanitized = sanitizeSearchQuery(dangerousSearch);
      
      expect(sanitized).toBe('test\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
      
      // Verify it doesn't break normal searches
      expect(sanitizeSearchQuery('normal search')).toBe('normal search');
      expect(sanitizeSearchQuery('')).toBe('');
      expect(sanitizeSearchQuery(123)).toBe('');
    });
  });

  describe('MongoDB Operators Detection', () => {
    test('MONGODB_OPERATORS should contain all dangerous operators', () => {
      const criticalOperators = [
        '$where', '$ne', '$regex', '$set', '$unset', '$inc', '$eval',
        '$function', '$accumulator', '$where', '$expr'
      ];

      criticalOperators.forEach(operator => {
        expect(MONGODB_OPERATORS).toContain(operator);
      });

      expect(MONGODB_OPERATORS.length).toBeGreaterThan(50);
    });
  });

  describe('Complex Attack Scenarios', () => {
    test('should handle deeply nested injection attempts', () => {
      const deeplyNested = {
        level1: {
          level2: {
            level3: {
              '$where': 'function() { db.users.drop(); return true; }',
              level4: {
                '$ne': null,
                safeValue: 'test'
              }
            }
          }
        }
      };

      const sanitized = sanitizeBody(deeplyNested);
      
      expect(sanitized.level1.level2.level3.safeValue).toBeUndefined();
      expect(sanitized.level1.level2.level3['$where']).toBeUndefined();
      expect(sanitized.level1.level2.level3.level4.safeValue).toBe('test');
      expect(sanitized.level1.level2.level3.level4['$ne']).toBeUndefined();
    });

    test('should handle mixed arrays with objects and primitives', () => {
      const mixedArray = [
        'safe string',
        123,
        { '$ne': null, validField: 'test' },
        { '$where': 'evil code', anotherField: true },
        null,
        undefined
      ];

      const sanitized = sanitizeBody(mixedArray);
      
      expect(sanitized[0]).toBe('safe string');
      expect(sanitized[1]).toBe(123);
      expect(sanitized[2]).toEqual({ validField: 'test' });
      expect(sanitized[3]).toEqual({ anotherField: true });
      expect(sanitized[4]).toBe(null);
      expect(sanitized[5]).toBe(undefined);
    });

    test('should prevent prototype pollution attempts', () => {
      const pollutionAttempt = {
        '__proto__': { polluted: true },
        'constructor': { prototype: { polluted: true } },
        'prototype': { polluted: true },
        validField: 'safe'
      };

      const sanitized = sanitizeBody(pollutionAttempt);
      
      expect(sanitized.validField).toBe('safe');
      expect(sanitized.__proto__).toEqual({}); // MongoDB operators removed
      expect({}.polluted).toBeUndefined(); // Verify no actual pollution
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle large objects efficiently', () => {
      const largeObject = {};
      
      // Create object with 1000 properties
      for (let i = 0; i < 1000; i++) {
        largeObject[`field${i}`] = i % 2 === 0 ? `value${i}` : { '$ne': null };
      }

      const startTime = Date.now();
      const sanitized = sanitizeBody(largeObject);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(Object.keys(sanitized)).toHaveLength(1000);
      
      // Verify sanitization worked
      expect(sanitized.field0).toBe('value0');
      expect(sanitized.field1).toEqual({});
    });

    test('should handle circular references gracefully', () => {
      const circular = { name: 'test' };
      circular.self = circular;

      // Should not throw an error
      expect(() => sanitizeBody(circular)).not.toThrow();
    });
  });
});

describe('Security Validation Tests', () => {
  test('All critical MongoDB operators are blocked', () => {
    const criticalPayload = {
      '$where': 'function() { return true; }',
      '$regex': '.*',
      '$ne': null,
      '$gt': 0,
      '$lt': 100,
      '$in': ['admin', 'root'],
      '$exists': true,
      '$type': 'string',
      '$expr': { '$gt': ['$price', 0] },
      '$function': { body: 'function() { return true; }', args: [], lang: 'js' }
    };

    const sanitized = sanitizeBody(criticalPayload);
    
    // All MongoDB operators should be removed
    MONGODB_OPERATORS.forEach(operator => {
      expect(sanitized[operator]).toBeUndefined();
    });
    
    expect(Object.keys(sanitized)).toHaveLength(0);
  });

  test('Legitimate data passes through unchanged', () => {
    const legitimateData = {
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      isActive: true,
      tags: ['customer', 'premium'],
      address: {
        street: '123 Main St',
        city: 'Anytown',
        zipCode: '12345'
      },
      preferences: {
        newsletter: true,
        notifications: false
      }
    };

    const sanitized = sanitizeBody(legitimateData);
    
    expect(sanitized).toEqual(legitimateData);
  });
});