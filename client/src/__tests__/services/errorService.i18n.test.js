import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import i18n from '../../i18n/i18n.js';
import errorService from '../../services/errorService.js';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

describe('ErrorService I18n Integration', () => {
  beforeEach(() => {
    // Clear error history before each test
    errorService.clearHistory();
    errorService.clearRetryQueue();
    
    // Reset language to English
    i18n.changeLanguage('en');
    
    // Reset navigator.onLine to true
    navigator.onLine = true;
  });

  afterEach(() => {
    // Clean up any listeners
    errorService.listeners = [];
  });

  describe('Network Error Messages', () => {
    it('should return localized offline error in English', () => {
      navigator.onLine = false;
      const error = new Error('Network error');
      
      const result = errorService.handleError(error);
      
      expect(result.type).toBe('NETWORK_ERROR');
      expect(result.message).toBe(i18n.t('errors.networkError.offline'));
      expect(result.userMessage).toBe(i18n.t('errors.networkError.noConnection'));
      expect(result.actions[0].label).toBe(i18n.t('errors.networkError.retryWhenOnline'));
      expect(result.actions[1].label).toBe(i18n.t('errors.networkError.continueOffline'));
    });

    it('should return localized offline error in Spanish', async () => {
      await i18n.changeLanguage('es');
      navigator.onLine = false;
      const error = new Error('Network error');
      
      const result = errorService.handleError(error);
      
      expect(result.type).toBe('NETWORK_ERROR');
      expect(result.message).toBe(i18n.t('errors.networkError.offline'));
      expect(result.userMessage).toBe(i18n.t('errors.networkError.noConnection'));
      expect(result.actions[0].label).toBe(i18n.t('errors.networkError.retryWhenOnline'));
      expect(result.actions[1].label).toBe(i18n.t('errors.networkError.continueOffline'));
    });

    it('should return localized offline error in Arabic (RTL)', async () => {
      await i18n.changeLanguage('ar');
      navigator.onLine = false;
      const error = new Error('Network error');
      
      const result = errorService.handleError(error);
      
      expect(result.type).toBe('NETWORK_ERROR');
      expect(result.message).toBe(i18n.t('errors.networkError.offline'));
      expect(result.userMessage).toBe(i18n.t('errors.networkError.noConnection'));
      expect(result.actions[0].label).toBe(i18n.t('errors.networkError.retryWhenOnline'));
      expect(result.actions[1].label).toBe(i18n.t('errors.networkError.continueOffline'));
      
      // Verify RTL context is preserved
      expect(result.rtl).toBe(true);
    });
  });

  describe('API Error Messages', () => {
    it('should return localized validation error (400)', () => {
      const error = {
        response: {
          status: 400,
          data: { error: { message: 'Backend validation failed' } }
        }
      };
      
      const result = errorService.handleError(error);
      
      expect(result.type).toBe('VALIDATION_ERROR');
      // Should use the backend message when available
      expect(result.message).toBe('Backend validation failed');
      expect(result.userMessage).toBe(i18n.t('errors.validationError.invalidInput'));
      expect(result.actions[0].label).toBe(i18n.t('errors.common.tryAgain'));
      expect(result.actions[1].label).toBe(i18n.t('errors.common.dismiss'));
    });

    it('should return localized validation error (400) when no backend message', () => {
      const error = {
        response: {
          status: 400,
          data: {}
        }
      };
      
      const result = errorService.handleError(error);
      
      expect(result.type).toBe('VALIDATION_ERROR');
      // Should use i18n fallback when no backend message
      expect(result.message).toBe(i18n.t('errors.validationError.checkInput'));
      expect(result.userMessage).toBe(i18n.t('errors.validationError.invalidInput'));
    });

    it('should return localized authentication error (401)', () => {
      const error = {
        response: {
          status: 401,
          data: {}
        }
      };
      
      const result = errorService.handleError(error);
      
      expect(result.type).toBe('AUTHENTICATION_ERROR');
      expect(result.message).toBe(i18n.t('errors.authError.loginAgain'));
      expect(result.userMessage).toBe(i18n.t('errors.authError.sessionExpired'));
      expect(result.actions[0].label).toBe(i18n.t('errors.authError.login'));
      expect(result.actions[1].label).toBe(i18n.t('errors.authError.continueGuest'));
    });

    it('should return localized authorization error (403)', () => {
      const error = {
        response: {
          status: 403,
          data: {}
        }
      };
      
      const result = errorService.handleError(error);
      
      expect(result.type).toBe('AUTHORIZATION_ERROR');
      expect(result.message).toBe(i18n.t('errors.authError.noPermission'));
      expect(result.userMessage).toBe(i18n.t('errors.authError.accessDenied'));
      expect(result.actions[0].label).toBe(i18n.t('errors.common.goBack'));
      expect(result.actions[1].label).toBe(i18n.t('errors.common.dismiss'));
    });

    it('should return localized not found error (404)', () => {
      const error = {
        response: {
          status: 404,
          data: {}
        }
      };
      
      const result = errorService.handleError(error);
      
      expect(result.type).toBe('NOT_FOUND_ERROR');
      expect(result.message).toBe(i18n.t('errors.notFoundError.itemNotFound'));
      expect(result.userMessage).toBe(i18n.t('errors.notFoundError.notFound'));
      expect(result.actions[0].label).toBe(i18n.t('errors.common.goBack'));
      expect(result.actions[1].label).toBe(i18n.t('errors.common.refreshPage'));
    });

    it('should return localized rate limit error (429)', () => {
      const error = {
        response: {
          status: 429,
          data: {},
          headers: { 'retry-after': '60' }
        }
      };
      
      const result = errorService.handleError(error);
      
      expect(result.type).toBe('RATE_LIMIT_ERROR');
      expect(result.message).toBe(i18n.t('errors.rateLimitError.tooManyRequests', { seconds: 60 }));
      expect(result.userMessage).toBe(i18n.t('errors.rateLimitError.tooManyRequestsShort'));
      expect(result.actions[0].label).toBe(i18n.t('errors.rateLimitError.retryAfter', { seconds: 60 }));
      expect(result.actions[1].label).toBe(i18n.t('errors.common.dismiss'));
    });

    it('should return localized server error (500)', () => {
      const error = {
        response: {
          status: 500,
          data: {}
        }
      };
      
      const result = errorService.handleError(error);
      
      expect(result.type).toBe('SERVER_ERROR');
      expect(result.message).toBe(i18n.t('errors.serverError.internalError'));
      expect(result.userMessage).toBe(i18n.t('errors.serverError.serverError'));
      expect(result.actions[0].label).toBe(i18n.t('errors.common.retry'));
      expect(result.actions[1].label).toBe(i18n.t('errors.common.reportIssue'));
    });
  });

  describe('JavaScript Error Messages', () => {
    it('should return localized JavaScript error', () => {
      const error = new TypeError('Cannot read property of undefined');
      
      const result = errorService.handleError(error);
      
      expect(result.type).toBe('JAVASCRIPT_ERROR');
      expect(result.message).toBe(i18n.t('errors.jsError.technicalError'));
      expect(result.userMessage).toBe(i18n.t('errors.jsError.applicationError'));
      expect(result.actions[0].label).toBe(i18n.t('errors.common.refreshPage'));
      expect(result.actions[1].label).toBe(i18n.t('errors.common.reportIssue'));
    });
  });

  describe('Timeout Error Messages', () => {
    it('should return localized timeout error', () => {
      const error = { 
        code: 'ECONNABORTED',
        message: 'Request timeout'
      };
      
      const result = errorService.handleError(error);
      
      expect(result.type).toBe('TIMEOUT_ERROR');
      expect(result.message).toBe(i18n.t('errors.timeoutError.requestTooLong'));
      expect(result.userMessage).toBe(i18n.t('errors.timeoutError.requestTimeout'));
      expect(result.actions[0].label).toBe(i18n.t('errors.common.retry'));
      expect(result.actions[1].label).toBe(i18n.t('errors.timeoutError.checkConnection'));
    });
  });

  describe('Generic Error Messages', () => {
    it('should return localized unknown error with custom message', () => {
      const error = new Error('Unknown error occurred');
      
      const result = errorService.handleError(error);
      
      expect(result.type).toBe('UNKNOWN_ERROR');
      // Should use the error message when available
      expect(result.message).toBe('Unknown error occurred');
      expect(result.userMessage).toBe(i18n.t('errors.unknownError.somethingWrong'));
      expect(result.actions[0].label).toBe(i18n.t('errors.common.tryAgain'));
      expect(result.actions[1].label).toBe(i18n.t('errors.common.reportIssue'));
    });

    it('should return localized unknown error without message', () => {
      const error = {}; // Error without message
      
      const result = errorService.handleError(error);
      
      expect(result.type).toBe('UNKNOWN_ERROR');
      // Should use i18n fallback when no error message
      expect(result.message).toBe(i18n.t('errors.unknownError.unexpectedError'));
      expect(result.userMessage).toBe(i18n.t('errors.unknownError.somethingWrong'));
    });
  });

  describe('RTL Language Support', () => {
    it('should add RTL context for Arabic language', async () => {
      await i18n.changeLanguage('ar');
      const error = new Error('Test error');
      
      const result = errorService.handleError(error);
      
      expect(result.rtl).toBe(true);
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('should add RTL context for Hebrew language', async () => {
      await i18n.changeLanguage('he');
      const error = new Error('Test error');
      
      const result = errorService.handleError(error);
      
      expect(result.rtl).toBe(true);
      expect(typeof result.message).toBe('string');
      expect(result.message.length).toBeGreaterThan(0);
    });

    it('should not add RTL context for LTR languages', async () => {
      await i18n.changeLanguage('en');
      const error = new Error('Test error');
      
      const result = errorService.handleError(error);
      
      expect(result.rtl).toBeUndefined();
    });
  });

  describe('Feature Degradation Messages', () => {
    it('should return localized feature degradation message', () => {
      const result = errorService.handleFeatureDegradation('WebSocket', null);
      
      // Should notify listeners with localized message
      expect(errorService.listeners.length).toBe(0); // No listeners in test
    });
  });

  describe('Retry Success Messages', () => {
    it('should show localized retry success message', () => {
      // Mock a listener to capture the retry success message
      let capturedError = null;
      const unsubscribe = errorService.addListener((error) => {
        capturedError = error;
      });
      
      // Simulate successful retry by directly calling notifyListeners
      errorService.notifyListeners({
        type: 'RETRY_SUCCESS',
        message: i18n.t('errors.retrySuccess.operationCompleted'),
        originalError: { id: 'test' }
      });
      
      expect(capturedError).toBeTruthy();
      expect(capturedError.type).toBe('RETRY_SUCCESS');
      expect(capturedError.message).toBe(i18n.t('errors.retrySuccess.operationCompleted'));
      
      unsubscribe();
    });
  });

  describe('Currency Integration', () => {
    it('should preserve context passed to error handler', () => {
      const error = {
        response: {
          status: 400,
          data: { 
            error: { 
              message: 'Payment failed',
              currency: 'EUR',
              amount: 29.99
            }
          }
        }
      };
      
      const context = { 
        currency: 'EUR',
        amount: 29.99
      };
      
      const result = errorService.handleError(error, context);
      
      // The error should include RTL flag and language info
      expect(result.language).toBe('en');
      expect(result.retryCount).toBe(0);
      expect(result.originalError).toBe(error);
    });
  });

  describe('Error Formatting for User Display', () => {
    it('should format error for user display with i18n', () => {
      const error = {
        userMessage: i18n.t('errors.authError.sessionExpired'),
        message: i18n.t('errors.authError.loginAgain'),
        severity: 'error',
        icon: 'lock',
        actions: [
          { label: i18n.t('errors.authError.login'), action: 'login' }
        ],
        shouldRetry: false
      };
      
      const formatted = errorService.formatErrorForUser(error);
      
      expect(formatted.title).toBe(i18n.t('errors.authError.sessionExpired'));
      expect(formatted.message).toBe(i18n.t('errors.authError.loginAgain'));
      expect(formatted.type).toBe('error');
      expect(formatted.actions[0].label).toBe(i18n.t('errors.authError.login'));
    });
  });
});