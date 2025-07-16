const { logger, paymentLogger, wholesalerLogger } = require('./logger');

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2
};

// Circuit breaker states
const CIRCUIT_STATES = {
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  HALF_OPEN: 'HALF_OPEN'
};

// Circuit breaker class for external services
class CircuitBreaker {
  constructor(name, options = {}) {
    this.name = name;
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    
    this.state = CIRCUIT_STATES.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttempt = Date.now();
  }

  async execute(operation) {
    if (this.state === CIRCUIT_STATES.OPEN) {
      if (Date.now() < this.nextAttempt) {
        throw new Error(`Circuit breaker is OPEN for ${this.name}. Next attempt in ${this.nextAttempt - Date.now()}ms`);
      }
      this.state = CIRCUIT_STATES.HALF_OPEN;
      logger.info(`Circuit breaker for ${this.name} is now HALF_OPEN`);
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      this.state = CIRCUIT_STATES.CLOSED;
      logger.info(`Circuit breaker for ${this.name} is now CLOSED`);
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = CIRCUIT_STATES.OPEN;
      this.nextAttempt = Date.now() + this.resetTimeout;
      logger.warn(`Circuit breaker for ${this.name} is now OPEN. Will retry after ${this.resetTimeout}ms`);
    }
  }

  getStatus() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt
    };
  }
}

// Retry mechanism with exponential backoff
async function retryWithBackoff(operation, context = '', options = {}) {
  const config = { ...RETRY_CONFIG, ...options };
  let lastError;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 1) {
        logger.info(`${context} succeeded on attempt ${attempt}`);
      }
      return result;
    } catch (error) {
      lastError = error;
      
      if (attempt === config.maxRetries) {
        logger.error(`${context} failed after ${config.maxRetries} attempts:`, {
          error: error.message,
          attempts: attempt
        });
        break;
      }

      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelay
      );

      logger.warn(`${context} failed on attempt ${attempt}, retrying in ${delay}ms:`, {
        error: error.message,
        attempt,
        nextRetryIn: delay
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Payment service error recovery
class PaymentErrorRecovery {
  constructor() {
    this.circuitBreaker = new CircuitBreaker('PaymentService', {
      failureThreshold: 3,
      resetTimeout: 30000 // 30 seconds
    });
  }

  async processPayment(paymentOperation, paymentData) {
    return this.circuitBreaker.execute(async () => {
      return retryWithBackoff(
        () => paymentOperation(paymentData),
        `Payment processing for order ${paymentData.orderId}`,
        { maxRetries: 2 }
      );
    });
  }

  async handlePaymentFailure(error, paymentData) {
    paymentLogger.error('Payment processing failed:', {
      error: error.message,
      orderId: paymentData.orderId,
      amount: paymentData.amount,
      method: paymentData.method,
      timestamp: new Date().toISOString()
    });

    // Implement fallback strategies
    if (error.message.includes('network') || error.message.includes('timeout')) {
      // Network-related errors - queue for retry
      return this.queuePaymentForRetry(paymentData);
    }

    if (error.message.includes('insufficient_funds')) {
      // Customer issue - notify customer
      return this.notifyCustomerOfPaymentIssue(paymentData, 'insufficient_funds');
    }

    // Unknown error - escalate
    return this.escalatePaymentError(error, paymentData);
  }

  async queuePaymentForRetry(paymentData) {
    paymentLogger.info('Queueing payment for retry:', {
      orderId: paymentData.orderId,
      retryAt: new Date(Date.now() + 300000).toISOString() // 5 minutes
    });
    
    // In a real implementation, this would use a job queue like Bull or Agenda
    return {
      status: 'queued_for_retry',
      retryAt: new Date(Date.now() + 300000)
    };
  }

  async notifyCustomerOfPaymentIssue(paymentData, issueType) {
    paymentLogger.info('Notifying customer of payment issue:', {
      orderId: paymentData.orderId,
      issueType
    });
    
    return {
      status: 'customer_notified',
      issueType
    };
  }

  async escalatePaymentError(error, paymentData) {
    paymentLogger.error('Escalating payment error:', {
      error: error.message,
      orderId: paymentData.orderId,
      escalatedAt: new Date().toISOString()
    });
    
    return {
      status: 'escalated',
      error: error.message
    };
  }
}

// Wholesaler communication error recovery
class WholesalerErrorRecovery {
  constructor() {
    this.circuitBreaker = new CircuitBreaker('WholesalerService', {
      failureThreshold: 5,
      resetTimeout: 60000 // 1 minute
    });
  }

  async sendNotification(notificationOperation, notificationData) {
    return this.circuitBreaker.execute(async () => {
      return retryWithBackoff(
        () => notificationOperation(notificationData),
        `Wholesaler notification for order ${notificationData.orderId}`,
        { maxRetries: 3 }
      );
    });
  }

  async handleNotificationFailure(error, notificationData) {
    wholesalerLogger.error('Wholesaler notification failed:', {
      error: error.message,
      orderId: notificationData.orderId,
      wholesalerId: notificationData.wholesalerId,
      timestamp: new Date().toISOString()
    });

    // Implement fallback strategies
    if (error.message.includes('network') || error.message.includes('timeout')) {
      // Network-related errors - queue for retry
      return this.queueNotificationForRetry(notificationData);
    }

    if (error.message.includes('invalid_email') || error.message.includes('bounced')) {
      // Email delivery issues - try alternative contact method
      return this.tryAlternativeContactMethod(notificationData);
    }

    // Unknown error - escalate
    return this.escalateNotificationError(error, notificationData);
  }

  async queueNotificationForRetry(notificationData) {
    wholesalerLogger.info('Queueing notification for retry:', {
      orderId: notificationData.orderId,
      wholesalerId: notificationData.wholesalerId,
      retryAt: new Date(Date.now() + 600000).toISOString() // 10 minutes
    });
    
    return {
      status: 'queued_for_retry',
      retryAt: new Date(Date.now() + 600000)
    };
  }

  async tryAlternativeContactMethod(notificationData) {
    wholesalerLogger.info('Trying alternative contact method:', {
      orderId: notificationData.orderId,
      wholesalerId: notificationData.wholesalerId
    });
    
    // In a real implementation, this might try SMS, webhook, or phone
    return {
      status: 'alternative_method_attempted',
      method: 'webhook'
    };
  }

  async escalateNotificationError(error, notificationData) {
    wholesalerLogger.error('Escalating notification error:', {
      error: error.message,
      orderId: notificationData.orderId,
      wholesalerId: notificationData.wholesalerId,
      escalatedAt: new Date().toISOString()
    });
    
    return {
      status: 'escalated',
      error: error.message
    };
  }
}

// Create instances
const paymentErrorRecovery = new PaymentErrorRecovery();
const wholesalerErrorRecovery = new WholesalerErrorRecovery();

// Health check for circuit breakers
function getCircuitBreakerStatus() {
  return {
    payment: paymentErrorRecovery.circuitBreaker.getStatus(),
    wholesaler: wholesalerErrorRecovery.circuitBreaker.getStatus()
  };
}

module.exports = {
  CircuitBreaker,
  retryWithBackoff,
  PaymentErrorRecovery,
  WholesalerErrorRecovery,
  paymentErrorRecovery,
  wholesalerErrorRecovery,
  getCircuitBreakerStatus
};