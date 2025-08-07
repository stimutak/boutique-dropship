// Enhanced error handling service with retry mechanisms and user feedback
import i18n from '../i18n/i18n.js';
import { supportedLanguages } from '../i18n/i18n.js';

class ErrorService {
  constructor() {
    this.retryQueue = [];
    this.errorHistory = [];
    this.maxRetries = 3;
    this.retryDelays = [1000, 2000, 4000]; // exponential backoff
    this.listeners = [];
    this.globalHandlersInitialized = false;
    this.globalErrorHandler = null;
    this.globalRejectionHandler = null;
  }

  // Register error listeners for components
  addListener(callback) {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners of errors
  notifyListeners(error) {
    this.listeners.forEach(listener => {
      try {
        listener(error);
      } catch (err) {
        console.error('Error in error listener:', err);
      }
    });
  }

  // Enhanced error handling with categorization
  handleError(error, context = {}) {
    const enhancedError = this.categorizeError(error, context);
    
    // Add to error history
    this.errorHistory.push({
      ...enhancedError,
      timestamp: new Date(),
      context
    });
    
    // Keep only last 100 errors
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-100);
    }
    
    // Notify listeners
    this.notifyListeners(enhancedError);
    
    // Handle retry logic
    if (enhancedError.shouldRetry && enhancedError.retryCount < this.maxRetries) {
      this.queueRetry(enhancedError, context);
    }
    
    return enhancedError;
  }

  // Categorize errors for better user experience
  categorizeError(error, context = {}) {
    const currentLang = i18n.language || 'en';
    const isRTL = supportedLanguages[currentLang]?.dir === 'rtl';
    
    const baseError = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      originalError: error,
      retryCount: context.retryCount || 0,
      language: currentLang,
      ...(isRTL && { rtl: true })
    };

    // Network errors
    if (!navigator.onLine) {
      return {
        ...baseError,
        type: 'NETWORK_ERROR',
        category: 'connectivity',
        message: i18n.t('errors.networkError.offline'),
        userMessage: i18n.t('errors.networkError.noConnection'),
        icon: 'wifi-off',
        severity: 'warning',
        shouldRetry: true,
        retryWhenOnline: true,
        actions: [
          { label: i18n.t('errors.networkError.retryWhenOnline'), action: 'retry' },
          { label: i18n.t('errors.networkError.continueOffline'), action: 'dismiss' }
        ]
      };
    }

    // API errors
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 400:
          return {
            ...baseError,
            type: 'VALIDATION_ERROR',
            category: 'user_input',
            message: data?.error?.message || i18n.t('errors.validationError.checkInput'),
            userMessage: i18n.t('errors.validationError.invalidInput'),
            icon: 'alert-circle',
            severity: 'error',
            shouldRetry: false,
            actions: [
              { label: i18n.t('errors.common.tryAgain'), action: 'retry' },
              { label: i18n.t('errors.common.dismiss'), action: 'dismiss' }
            ]
          };

        case 401:
          return {
            ...baseError,
            type: 'AUTHENTICATION_ERROR',
            category: 'auth',
            message: i18n.t('errors.authError.loginAgain'),
            userMessage: i18n.t('errors.authError.sessionExpired'),
            icon: 'lock',
            severity: 'error',
            shouldRetry: false,
            actions: [
              { label: i18n.t('errors.authError.login'), action: 'login' },
              { label: i18n.t('errors.authError.continueGuest'), action: 'guest' }
            ]
          };

        case 403:
          return {
            ...baseError,
            type: 'AUTHORIZATION_ERROR',
            category: 'auth',
            message: i18n.t('errors.authError.noPermission'),
            userMessage: i18n.t('errors.authError.accessDenied'),
            icon: 'shield-off',
            severity: 'error',
            shouldRetry: false,
            actions: [
              { label: i18n.t('errors.common.goBack'), action: 'goBack' },
              { label: i18n.t('errors.common.dismiss'), action: 'dismiss' }
            ]
          };

        case 404:
          return {
            ...baseError,
            type: 'NOT_FOUND_ERROR',
            category: 'resource',
            message: i18n.t('errors.notFoundError.itemNotFound'),
            userMessage: i18n.t('errors.notFoundError.notFound'),
            icon: 'search',
            severity: 'error',
            shouldRetry: false,
            actions: [
              { label: i18n.t('errors.common.goBack'), action: 'goBack' },
              { label: i18n.t('errors.common.refreshPage'), action: 'refresh' }
            ]
          };

        case 429:
          const retryAfter = error.response.headers?.['retry-after'] || 60;
          return {
            ...baseError,
            type: 'RATE_LIMIT_ERROR',
            category: 'rate_limit',
            message: i18n.t('errors.rateLimitError.tooManyRequests', { seconds: retryAfter }),
            userMessage: i18n.t('errors.rateLimitError.tooManyRequestsShort'),
            icon: 'clock',
            severity: 'warning',
            shouldRetry: true,
            retryAfter: retryAfter * 1000,
            actions: [
              { label: i18n.t('errors.rateLimitError.retryAfter', { seconds: retryAfter }), action: 'retryAfter' },
              { label: i18n.t('errors.common.dismiss'), action: 'dismiss' }
            ]
          };

        case 500:
        case 502:
        case 503:
        case 504:
          return {
            ...baseError,
            type: 'SERVER_ERROR',
            category: 'server',
            message: i18n.t('errors.serverError.internalError'),
            userMessage: i18n.t('errors.serverError.serverError'),
            icon: 'server',
            severity: 'error',
            shouldRetry: true,
            actions: [
              { label: i18n.t('errors.common.retry'), action: 'retry' },
              { label: i18n.t('errors.common.reportIssue'), action: 'report' }
            ]
          };

        default:
          return {
            ...baseError,
            type: 'API_ERROR',
            category: 'api',
            message: data?.error?.message || i18n.t('errors.unknownError.unexpectedError'),
            userMessage: i18n.t('errors.unknownError.somethingWrong'),
            icon: 'alert-triangle',
            severity: 'error',
            shouldRetry: status >= 500,
            actions: [
              { label: i18n.t('errors.common.retry'), action: 'retry' },
              { label: i18n.t('errors.common.dismiss'), action: 'dismiss' }
            ]
          };
      }
    }

    // JavaScript errors
    if (error instanceof TypeError || error instanceof ReferenceError) {
      return {
        ...baseError,
        type: 'JAVASCRIPT_ERROR',
        category: 'application',
        message: i18n.t('errors.jsError.technicalError'),
        userMessage: i18n.t('errors.jsError.applicationError'),
        icon: 'code',
        severity: 'error',
        shouldRetry: false,
        actions: [
          { label: i18n.t('errors.common.refreshPage'), action: 'refresh' },
          { label: i18n.t('errors.common.reportIssue'), action: 'report' }
        ]
      };
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        ...baseError,
        type: 'TIMEOUT_ERROR',
        category: 'network',
        message: i18n.t('errors.timeoutError.requestTooLong'),
        userMessage: i18n.t('errors.timeoutError.requestTimeout'),
        icon: 'clock',
        severity: 'warning',
        shouldRetry: true,
        actions: [
          { label: i18n.t('errors.common.retry'), action: 'retry' },
          { label: i18n.t('errors.timeoutError.checkConnection'), action: 'checkConnection' }
        ]
      };
    }

    // Generic error
    return {
      ...baseError,
      type: 'UNKNOWN_ERROR',
      category: 'unknown',
      message: error.message || i18n.t('errors.unknownError.unexpectedError'),
      userMessage: i18n.t('errors.unknownError.somethingWrong'),
      icon: 'alert-circle',
      severity: 'error',
      shouldRetry: false,
      actions: [
        { label: i18n.t('errors.common.tryAgain'), action: 'retry' },
        { label: i18n.t('errors.common.reportIssue'), action: 'report' }
      ]
    };
  }

  // Queue retry operations with exponential backoff
  queueRetry(error, context) {
    const retryDelay = this.retryDelays[error.retryCount] || this.retryDelays[this.retryDelays.length - 1];
    
    const retryOperation = {
      id: error.id,
      error,
      context: {
        ...context,
        retryCount: error.retryCount + 1
      },
      executeAt: Date.now() + retryDelay,
      execute: context.retryFunction
    };
    
    this.retryQueue.push(retryOperation);
    
    // Schedule retry
    setTimeout(() => {
      this.processRetryQueue();
    }, retryDelay);
  }

  // Process retry queue
  async processRetryQueue() {
    const now = Date.now();
    const readyToRetry = this.retryQueue.filter(op => op.executeAt <= now);
    
    for (const operation of readyToRetry) {
      try {
        if (operation.execute && typeof operation.execute === 'function') {
          await operation.execute();
        }
        
        // Remove from queue on success
        this.retryQueue = this.retryQueue.filter(op => op.id !== operation.id);
        
        // Notify success
        this.notifyListeners({
          type: 'RETRY_SUCCESS',
          message: i18n.t('errors.retrySuccess.operationCompleted'),
          originalError: operation.error
        });
      } catch (retryError) {
        // Handle retry failure
        const enhancedRetryError = this.handleError(retryError, operation.context);
        
        // Remove from queue if max retries exceeded
        if (enhancedRetryError.retryCount >= this.maxRetries) {
          this.retryQueue = this.retryQueue.filter(op => op.id !== operation.id);
        }
      }
    }
  }

  // Get error statistics for monitoring
  getErrorStatistics(timeWindow = 3600000) { // 1 hour default
    const now = Date.now();
    const recentErrors = this.errorHistory.filter(
      error => now - error.timestamp.getTime() < timeWindow
    );
    
    const stats = {
      total: recentErrors.length,
      byCategory: {},
      byType: {},
      retrySuccess: 0,
      averageRetryTime: 0
    };
    
    recentErrors.forEach(error => {
      // Count by category
      if (!stats.byCategory[error.category]) {
        stats.byCategory[error.category] = 0;
      }
      stats.byCategory[error.category]++;
      
      // Count by type
      if (!stats.byType[error.type]) {
        stats.byType[error.type] = 0;
      }
      stats.byType[error.type]++;
    });
    
    return stats;
  }

  // Clear error history
  clearHistory() {
    this.errorHistory = [];
  }

  // Clear retry queue
  clearRetryQueue() {
    this.retryQueue = [];
  }

  // Initialize global error handlers (call once on app start)
  initializeGlobalHandlers() {
    if (this.globalHandlersInitialized) {
      return; // Prevent duplicate listeners
    }
    
    this.globalErrorHandler = (event) => {
      this.handleError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };
    
    this.globalRejectionHandler = (event) => {
      this.handleError(event.reason, {
        type: 'unhandled_promise'
      });
    };

    window.addEventListener('error', this.globalErrorHandler);
    window.addEventListener('unhandledrejection', this.globalRejectionHandler);
    
    this.globalHandlersInitialized = true;
  }

  // Cleanup global error handlers (call on app shutdown if needed)
  cleanupGlobalHandlers() {
    if (!this.globalHandlersInitialized) {
      return;
    }
    
    window.removeEventListener('error', this.globalErrorHandler);
    window.removeEventListener('unhandledrejection', this.globalRejectionHandler);
    
    this.globalHandlersInitialized = false;
    this.globalErrorHandler = null;
    this.globalRejectionHandler = null;
  }

  // Format error for user display
  formatErrorForUser(error) {
    return {
      title: error.userMessage || 'Error',
      message: error.message,
      type: error.severity,
      icon: error.icon,
      actions: error.actions,
      canRetry: error.shouldRetry,
      retryAfter: error.retryAfter
    };
  }

  // Progressive enhancement check
  checkProgressiveEnhancement() {
    const features = {
      javascript: true, // If this runs, JS is available
      localStorage: typeof localStorage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
      fetch: typeof fetch !== 'undefined',
      webSockets: typeof WebSocket !== 'undefined',
      serviceWorker: 'serviceWorker' in navigator,
      online: navigator.onLine
    };
    
    return features;
  }

  // Graceful degradation for missing features
  handleFeatureDegradation(missingFeature, fallback) {
    const currentLang = i18n.language || 'en';
    const isRTL = supportedLanguages[currentLang]?.dir === 'rtl';
    
    const degradationError = {
      type: 'FEATURE_DEGRADATION',
      category: 'compatibility',
      message: i18n.t('errors.featureDegradation.featureUnavailable', { feature: missingFeature }),
      userMessage: i18n.t('errors.featureDegradation.limitedFunctionality'),
      icon: 'info',
      severity: 'info',
      shouldRetry: false,
      ...(isRTL && { rtl: true }),
      actions: [
        { label: i18n.t('errors.common.continue'), action: 'dismiss' },
        { label: i18n.t('errors.featureDegradation.learnMore'), action: 'learnMore' }
      ]
    };
    
    this.notifyListeners(degradationError);
    
    if (fallback && typeof fallback === 'function') {
      return fallback();
    }
  }
}

// Export singleton instance
const errorService = new ErrorService();

// Initialize global handlers once when the module is imported
// This is acceptable for a singleton service that should persist for the app lifetime
errorService.initializeGlobalHandlers();

export default errorService;