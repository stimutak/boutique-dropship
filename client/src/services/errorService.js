// Enhanced error handling service with retry mechanisms and user feedback
class ErrorService {
  constructor() {
    this.retryQueue = []
    this.errorHistory = []
    this.maxRetries = 3
    this.retryDelays = [1000, 2000, 4000] // exponential backoff
    this.listeners = []
  }

  // Register error listeners for components
  addListener(callback) {
    this.listeners.push(callback)
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback)
    }
  }

  // Notify all listeners of errors
  notifyListeners(error) {
    this.listeners.forEach(listener => {
      try {
        listener(error)
      } catch (err) {
        console.error('Error in error listener:', err)
      }
    })
  }

  // Enhanced error handling with categorization
  handleError(error, context = {}) {
    const enhancedError = this.categorizeError(error, context)
    
    // Add to error history
    this.errorHistory.push({
      ...enhancedError,
      timestamp: new Date(),
      context
    })
    
    // Keep only last 100 errors
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-100)
    }
    
    // Notify listeners
    this.notifyListeners(enhancedError)
    
    // Handle retry logic
    if (enhancedError.shouldRetry && enhancedError.retryCount < this.maxRetries) {
      this.queueRetry(enhancedError, context)
    }
    
    return enhancedError
  }

  // Categorize errors for better user experience
  categorizeError(error, context = {}) {
    const baseError = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      originalError: error,
      retryCount: context.retryCount || 0
    }

    // Network errors
    if (!navigator.onLine) {
      return {
        ...baseError,
        type: 'NETWORK_ERROR',
        category: 'connectivity',
        message: 'You appear to be offline. Changes will be saved when connection returns.',
        userMessage: 'No internet connection',
        icon: 'wifi-off',
        severity: 'warning',
        shouldRetry: true,
        retryWhenOnline: true,
        actions: [
          { label: 'Retry when online', action: 'retry' },
          { label: 'Continue offline', action: 'dismiss' }
        ]
      }
    }

    // API errors
    if (error.response) {
      const status = error.response.status
      const data = error.response.data
      
      switch (status) {
        case 400:
          return {
            ...baseError,
            type: 'VALIDATION_ERROR',
            category: 'user_input',
            message: data?.error?.message || 'Please check your input and try again.',
            userMessage: 'Invalid input',
            icon: 'alert-circle',
            severity: 'error',
            shouldRetry: false,
            actions: [
              { label: 'Try again', action: 'retry' },
              { label: 'Dismiss', action: 'dismiss' }
            ]
          }

        case 401:
          return {
            ...baseError,
            type: 'AUTHENTICATION_ERROR',
            category: 'auth',
            message: 'Please log in again to continue.',
            userMessage: 'Session expired',
            icon: 'lock',
            severity: 'error',
            shouldRetry: false,
            actions: [
              { label: 'Log in', action: 'login' },
              { label: 'Continue as guest', action: 'guest' }
            ]
          }

        case 403:
          return {
            ...baseError,
            type: 'AUTHORIZATION_ERROR',
            category: 'auth',
            message: 'You don\'t have permission to perform this action.',
            userMessage: 'Access denied',
            icon: 'shield-off',
            severity: 'error',
            shouldRetry: false,
            actions: [
              { label: 'Go back', action: 'goBack' },
              { label: 'Dismiss', action: 'dismiss' }
            ]
          }

        case 404:
          return {
            ...baseError,
            type: 'NOT_FOUND_ERROR',
            category: 'resource',
            message: 'The requested item could not be found.',
            userMessage: 'Not found',
            icon: 'search',
            severity: 'error',
            shouldRetry: false,
            actions: [
              { label: 'Go back', action: 'goBack' },
              { label: 'Refresh page', action: 'refresh' }
            ]
          }

        case 429:
          const retryAfter = error.response.headers?.['retry-after'] || 60
          return {
            ...baseError,
            type: 'RATE_LIMIT_ERROR',
            category: 'rate_limit',
            message: `Too many requests. Please wait ${retryAfter} seconds before trying again.`,
            userMessage: 'Too many requests',
            icon: 'clock',
            severity: 'warning',
            shouldRetry: true,
            retryAfter: retryAfter * 1000,
            actions: [
              { label: `Retry in ${retryAfter}s`, action: 'retryAfter' },
              { label: 'Dismiss', action: 'dismiss' }
            ]
          }

        case 500:
        case 502:
        case 503:
        case 504:
          return {
            ...baseError,
            type: 'SERVER_ERROR',
            category: 'server',
            message: 'Something went wrong on our end. Please try again in a moment.',
            userMessage: 'Server error',
            icon: 'server',
            severity: 'error',
            shouldRetry: true,
            actions: [
              { label: 'Retry', action: 'retry' },
              { label: 'Report issue', action: 'report' }
            ]
          }

        default:
          return {
            ...baseError,
            type: 'API_ERROR',
            category: 'api',
            message: data?.error?.message || 'An unexpected error occurred.',
            userMessage: 'Request failed',
            icon: 'alert-triangle',
            severity: 'error',
            shouldRetry: status >= 500,
            actions: [
              { label: 'Retry', action: 'retry' },
              { label: 'Dismiss', action: 'dismiss' }
            ]
          }
      }
    }

    // JavaScript errors
    if (error instanceof TypeError || error instanceof ReferenceError) {
      return {
        ...baseError,
        type: 'JAVASCRIPT_ERROR',
        category: 'application',
        message: 'A technical error occurred. Please refresh the page.',
        userMessage: 'Application error',
        icon: 'code',
        severity: 'error',
        shouldRetry: false,
        actions: [
          { label: 'Refresh page', action: 'refresh' },
          { label: 'Report issue', action: 'report' }
        ]
      }
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        ...baseError,
        type: 'TIMEOUT_ERROR',
        category: 'network',
        message: 'The request took too long. Please check your connection and try again.',
        userMessage: 'Request timeout',
        icon: 'clock',
        severity: 'warning',
        shouldRetry: true,
        actions: [
          { label: 'Retry', action: 'retry' },
          { label: 'Check connection', action: 'checkConnection' }
        ]
      }
    }

    // Generic error
    return {
      ...baseError,
      type: 'UNKNOWN_ERROR',
      category: 'unknown',
      message: error.message || 'An unexpected error occurred.',
      userMessage: 'Something went wrong',
      icon: 'alert-circle',
      severity: 'error',
      shouldRetry: false,
      actions: [
        { label: 'Try again', action: 'retry' },
        { label: 'Report issue', action: 'report' }
      ]
    }
  }

  // Queue retry operations with exponential backoff
  queueRetry(error, context) {
    const retryDelay = this.retryDelays[error.retryCount] || this.retryDelays[this.retryDelays.length - 1]
    
    const retryOperation = {
      id: error.id,
      error,
      context: {
        ...context,
        retryCount: error.retryCount + 1
      },
      executeAt: Date.now() + retryDelay,
      execute: context.retryFunction
    }
    
    this.retryQueue.push(retryOperation)
    
    // Schedule retry
    setTimeout(() => {
      this.processRetryQueue()
    }, retryDelay)
  }

  // Process retry queue
  async processRetryQueue() {
    const now = Date.now()
    const readyToRetry = this.retryQueue.filter(op => op.executeAt <= now)
    
    for (const operation of readyToRetry) {
      try {
        if (operation.execute && typeof operation.execute === 'function') {
          await operation.execute()
        }
        
        // Remove from queue on success
        this.retryQueue = this.retryQueue.filter(op => op.id !== operation.id)
        
        // Notify success
        this.notifyListeners({
          type: 'RETRY_SUCCESS',
          message: 'Operation completed successfully',
          originalError: operation.error
        })
      } catch (retryError) {
        // Handle retry failure
        const enhancedRetryError = this.handleError(retryError, operation.context)
        
        // Remove from queue if max retries exceeded
        if (enhancedRetryError.retryCount >= this.maxRetries) {
          this.retryQueue = this.retryQueue.filter(op => op.id !== operation.id)
        }
      }
    }
  }

  // Get error statistics for monitoring
  getErrorStatistics(timeWindow = 3600000) { // 1 hour default
    const now = Date.now()
    const recentErrors = this.errorHistory.filter(
      error => now - error.timestamp.getTime() < timeWindow
    )
    
    const stats = {
      total: recentErrors.length,
      byCategory: {},
      byType: {},
      retrySuccess: 0,
      averageRetryTime: 0
    }
    
    recentErrors.forEach(error => {
      // Count by category
      if (!stats.byCategory[error.category]) {
        stats.byCategory[error.category] = 0
      }
      stats.byCategory[error.category]++
      
      // Count by type
      if (!stats.byType[error.type]) {
        stats.byType[error.type] = 0
      }
      stats.byType[error.type]++
    })
    
    return stats
  }

  // Clear error history
  clearHistory() {
    this.errorHistory = []
  }

  // Clear retry queue
  clearRetryQueue() {
    this.retryQueue = []
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
    }
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
    }
    
    return features
  }

  // Graceful degradation for missing features
  handleFeatureDegradation(missingFeature, fallback) {
    const degradationError = {
      type: 'FEATURE_DEGRADATION',
      category: 'compatibility',
      message: `${missingFeature} is not available. Using fallback.`,
      userMessage: 'Limited functionality',
      icon: 'info',
      severity: 'info',
      shouldRetry: false,
      actions: [
        { label: 'Continue', action: 'dismiss' },
        { label: 'Learn more', action: 'learnMore' }
      ]
    }
    
    this.notifyListeners(degradationError)
    
    if (fallback && typeof fallback === 'function') {
      return fallback()
    }
  }
}

// Export singleton instance
const errorService = new ErrorService()

// Global error handler for unhandled JavaScript errors
window.addEventListener('error', (event) => {
  errorService.handleError(new Error(event.message), {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  })
})

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  errorService.handleError(event.reason, {
    type: 'unhandled_promise'
  })
})

export default errorService