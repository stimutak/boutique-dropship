const {
  CircuitBreaker,
  retryWithBackoff,
  PaymentErrorRecovery,
  WholesalerErrorRecovery
} = require('../../utils/errorRecovery');

describe('Error Recovery Utilities', () => {
  describe('CircuitBreaker', () => {
    let circuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker('TestService', {
        failureThreshold: 2,
        resetTimeout: 1000
      });
    });

    test('should start in CLOSED state', () => {
      expect(circuitBreaker.state).toBe('CLOSED');
      expect(circuitBreaker.failureCount).toBe(0);
    });

    test('should execute operation successfully when CLOSED', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(circuitBreaker.state).toBe('CLOSED');
    });

    test('should open circuit after failure threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Service error'));
      
      // First failure
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Service error');
      expect(circuitBreaker.state).toBe('CLOSED');
      expect(circuitBreaker.failureCount).toBe(1);
      
      // Second failure - should open circuit
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Service error');
      expect(circuitBreaker.state).toBe('OPEN');
      expect(circuitBreaker.failureCount).toBe(2);
    });

    test('should reject immediately when OPEN', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Service error'));
      
      // Trigger circuit to open
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      
      // Should now reject immediately
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
      expect(operation).toHaveBeenCalledTimes(2); // Not called the third time
    });

    test('should transition to HALF_OPEN after timeout', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Service error'))
        .mockRejectedValueOnce(new Error('Service error'))
        .mockResolvedValueOnce('success');
      
      // Open the circuit
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      expect(circuitBreaker.state).toBe('OPEN');
      
      // Wait for timeout and try again
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const result = await circuitBreaker.execute(operation);
      expect(result).toBe('success');
      expect(circuitBreaker.state).toBe('CLOSED');
    });

    test('should provide status information', () => {
      const status = circuitBreaker.getStatus();
      
      expect(status).toHaveProperty('name', 'TestService');
      expect(status).toHaveProperty('state', 'CLOSED');
      expect(status).toHaveProperty('failureCount', 0);
      expect(status).toHaveProperty('lastFailureTime');
      expect(status).toHaveProperty('nextAttempt');
    });
  });

  describe('retryWithBackoff', () => {
    test('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await retryWithBackoff(operation, 'Test operation');
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce('success');
      
      const result = await retryWithBackoff(operation, 'Test operation', {
        maxRetries: 3,
        baseDelay: 10
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should fail after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent error'));
      
      await expect(retryWithBackoff(operation, 'Test operation', {
        maxRetries: 2,
        baseDelay: 10
      })).rejects.toThrow('Persistent error');
      
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should use exponential backoff', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValueOnce('success');
      
      const startTime = Date.now();
      
      const result = await retryWithBackoff(operation, 'Test operation', {
        maxRetries: 3,
        baseDelay: 50,
        backoffFactor: 2
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      // Should have waited at least 50ms + 100ms = 150ms
      expect(duration).toBeGreaterThan(140);
    });
  });

  describe('PaymentErrorRecovery', () => {
    let paymentRecovery;

    beforeEach(() => {
      paymentRecovery = new PaymentErrorRecovery();
    });

    test('should process payment successfully', async () => {
      const paymentOperation = jest.fn().mockResolvedValue({ status: 'paid' });
      const paymentData = { orderId: '123', amount: 100 };
      
      const result = await paymentRecovery.processPayment(paymentOperation, paymentData);
      
      expect(result).toEqual({ status: 'paid' });
      expect(paymentOperation).toHaveBeenCalledWith(paymentData);
    });

    test('should handle network errors by queueing for retry', async () => {
      const error = new Error('network timeout');
      const paymentData = { orderId: '123', amount: 100 };
      
      const result = await paymentRecovery.handlePaymentFailure(error, paymentData);
      
      expect(result.status).toBe('queued_for_retry');
      expect(result.retryAt).toBeInstanceOf(Date);
    });

    test('should handle insufficient funds by notifying customer', async () => {
      const error = new Error('insufficient_funds');
      const paymentData = { orderId: '123', amount: 100 };
      
      const result = await paymentRecovery.handlePaymentFailure(error, paymentData);
      
      expect(result.status).toBe('customer_notified');
      expect(result.issueType).toBe('insufficient_funds');
    });

    test('should escalate unknown errors', async () => {
      const error = new Error('unknown error');
      const paymentData = { orderId: '123', amount: 100 };
      
      const result = await paymentRecovery.handlePaymentFailure(error, paymentData);
      
      expect(result.status).toBe('escalated');
      expect(result.error).toBe('unknown error');
    });
  });

  describe('WholesalerErrorRecovery', () => {
    let wholesalerRecovery;

    beforeEach(() => {
      wholesalerRecovery = new WholesalerErrorRecovery();
    });

    test('should send notification successfully', async () => {
      const notificationOperation = jest.fn().mockResolvedValue({ sent: true });
      const notificationData = { orderId: '123', wholesalerId: 'w1' };
      
      const result = await wholesalerRecovery.sendNotification(notificationOperation, notificationData);
      
      expect(result).toEqual({ sent: true });
      expect(notificationOperation).toHaveBeenCalledWith(notificationData);
    });

    test('should handle network errors by queueing for retry', async () => {
      const error = new Error('network error');
      const notificationData = { orderId: '123', wholesalerId: 'w1' };
      
      const result = await wholesalerRecovery.handleNotificationFailure(error, notificationData);
      
      expect(result.status).toBe('queued_for_retry');
      expect(result.retryAt).toBeInstanceOf(Date);
    });

    test('should handle email errors by trying alternative method', async () => {
      const error = new Error('invalid_email');
      const notificationData = { orderId: '123', wholesalerId: 'w1' };
      
      const result = await wholesalerRecovery.handleNotificationFailure(error, notificationData);
      
      expect(result.status).toBe('alternative_method_attempted');
      expect(result.method).toBe('webhook');
    });

    test('should escalate unknown errors', async () => {
      const error = new Error('unknown error');
      const notificationData = { orderId: '123', wholesalerId: 'w1' };
      
      const result = await wholesalerRecovery.handleNotificationFailure(error, notificationData);
      
      expect(result.status).toBe('escalated');
      expect(result.error).toBe('unknown error');
    });
  });
});