/**
 * Secure logging utilities to prevent leaking sensitive information in logs
 * 
 * This module provides utilities to safely log information without exposing
 * sensitive data like session IDs, authentication tokens, or environment details.
 */

/**
 * Masks a session ID for safe logging
 * Keeps the prefix and last 3 characters, masks the middle
 * 
 * @param {string} sessionId - The session ID to mask
 * @returns {string} - The masked session ID
 */
function maskSessionId(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return '[invalid-session-id]';
  }
  
  // For guest session IDs like 'guest_1234567890_abcdefghi'
  if (sessionId.startsWith('guest_')) {
    const parts = sessionId.split('_');
    if (parts.length >= 3) {
      const prefix = parts[0]; // 'guest'
      const suffix = parts[parts.length - 1].slice(-3); // last 3 chars of final part
      return `${prefix}_***_${suffix}`;
    }
  }
  
  // For other session IDs, mask middle part
  if (sessionId.length <= 6) {
    return '***';
  }
  
  const start = sessionId.slice(0, 3);
  const end = sessionId.slice(-3);
  return `${start}***${end}`;
}

/**
 * Environment-aware logging function
 * Logs messages only in development, never in production
 * 
 * @param {string} message - The message to log
 * @param {Object} context - Optional context object that may contain sensitive data
 */
function secureLog(message, context = {}) {
  // Never log in production
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  
  // In development, log but mask sensitive information
  let sanitizedMessage = message;
  
  // If context contains sessionId, mask it
  if (context.sessionId) {
    const maskedSessionId = maskSessionId(context.sessionId);
    sanitizedMessage = sanitizedMessage.replace(context.sessionId, maskedSessionId);
  }
  
  console.log(sanitizedMessage);
}

/**
 * Secure console.log replacement for guest session operations
 * 
 * @param {string} message - The message to log
 * @param {string} sessionId - The session ID to mask
 */
function secureSessionLog(message, sessionId) {
  if (process.env.NODE_ENV === 'production') {
    return; // No logging in production
  }
  
  // In development, log with masked session ID
  const maskedId = maskSessionId(sessionId);
  const sanitizedMessage = message.replace(sessionId, maskedId);
  console.log(sanitizedMessage);
}

/**
 * Safe way to log operation results that may contain session information
 * 
 * @param {string} operation - Description of the operation
 * @param {number} count - Number of items affected
 * @param {string} sessionId - Session ID (will be masked)
 */
function secureOperationLog(operation, count, sessionId) {
  if (process.env.NODE_ENV === 'production') {
    return; // No logging in production
  }
  
  const maskedId = maskSessionId(sessionId);
  console.log(`${operation}: ${count} items for session ${maskedId}`);
}

/**
 * Check if environment-sensitive logging should be enabled
 * 
 * @returns {boolean} - True if development logging is enabled
 */
function isDevelopmentLogging() {
  return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
}

module.exports = {
  maskSessionId,
  secureLog,
  secureSessionLog,
  secureOperationLog,
  isDevelopmentLogging
};