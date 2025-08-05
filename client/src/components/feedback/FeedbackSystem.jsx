import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import errorService from '../../services/errorService'
import './FeedbackSystem.css'

// Toast notification component
const Toast = ({ notification, onDismiss, onAction }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [progress, setProgress] = useState(100)
  const timerRef = useRef(null)
  const dismissTimeoutRef = useRef(null)

  const handleDismiss = useCallback(() => {
    // Clear any active progress timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    setIsVisible(false)
    
    // Clear any existing dismiss timeout
    if (dismissTimeoutRef.current) {
      clearTimeout(dismissTimeoutRef.current)
    }
    
    dismissTimeoutRef.current = setTimeout(() => {
      onDismiss(notification.id)
      dismissTimeoutRef.current = null
    }, 300)
  }, [notification.id, onDismiss])

  useEffect(() => {
    setIsVisible(true)
    
    // Auto-dismiss after duration
    if (notification.autoDismiss !== false) {
      const duration = notification.duration || 5000
      const interval = 100
      const step = (interval / duration) * 100
      
      timerRef.current = setInterval(() => {
        setProgress(prev => {
          if (prev <= 0) {
            handleDismiss()
            return 0
          }
          return prev - step
        })
      }, interval)
    }

    // Cleanup function - clear timers on unmount or notification change
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current)
        dismissTimeoutRef.current = null
      }
    }
  }, [notification, handleDismiss])

  const handleAction = (action) => {
    onAction(notification.id, action)
    if (action.dismissAfter !== false) {
      handleDismiss()
    }
  }

  const getIcon = () => {
    const iconMap = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
      loading: '⟳'
    }
    return iconMap[notification.type] || iconMap.info
  }

  return (
    <div 
      className={`toast toast--${notification.type} ${isVisible ? 'toast--visible' : ''}`}
      role="alert"
      aria-live="polite"
    >
      <div className="toast__icon">
        {notification.icon || getIcon()}
      </div>
      
      <div className="toast__content">
        <div className="toast__title">{notification.title}</div>
        {notification.message && (
          <div className="toast__message">{notification.message}</div>
        )}
        
        {notification.actions && notification.actions.length > 0 && (
          <div className="toast__actions">
            {notification.actions.map((action, index) => (
              <button
                key={index}
                className={`toast__action toast__action--${action.type || 'default'}`}
                onClick={() => handleAction(action)}
                disabled={action.disabled}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <button 
        className="toast__dismiss"
        onClick={handleDismiss}
        aria-label="Dismiss notification"
      >
        ✕
      </button>
      
      {notification.autoDismiss !== false && (
        <div 
          className="toast__progress"
          style={{ width: `${progress}%` }}
        />
      )}
    </div>
  )
}

// Loading indicator component
const LoadingIndicator = ({ operation, progress, canCancel, onCancel }) => {
  return (
    <div className="loading-indicator" role="status" aria-live="polite">
      <div className="loading-indicator__spinner">
        <div className="spinner"></div>
      </div>
      
      <div className="loading-indicator__content">
        <div className="loading-indicator__title">
          {operation || 'Loading...'}
        </div>
        
        {progress !== undefined && (
          <div className="loading-indicator__progress">
            <div className="progress-bar">
              <div 
                className="progress-bar__fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress-text">{Math.round(progress)}%</span>
          </div>
        )}
        
        {canCancel && onCancel && (
          <button 
            className="loading-indicator__cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

// Offline status indicator
const OfflineIndicator = ({ isOffline, queueLength, lastSync }) => {
  if (!isOffline && queueLength === 0) return null

  return (
    <div className={`offline-indicator ${isOffline ? 'offline-indicator--offline' : ''}`}>
      <div className="offline-indicator__icon">
        {isOffline ? '📡' : '⏳'}
      </div>
      
      <div className="offline-indicator__content">
        <div className="offline-indicator__status">
          {isOffline ? 'You\'re offline' : 'Syncing changes'}
        </div>
        
        {queueLength > 0 && (
          <div className="offline-indicator__queue">
            {queueLength} pending {queueLength === 1 ? 'change' : 'changes'}
          </div>
        )}
        
        {lastSync && !isOffline && (
          <div className="offline-indicator__sync">
            Last synced: {new Date(lastSync).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  )
}

// Performance indicator
const PerformanceIndicator = ({ performance, showDetails = false }) => {
  if (!performance) return null

  const getPerformanceColor = (status) => {
    switch (status) {
      case 'good': return 'green'
      case 'needs_optimization': return 'orange'
      case 'poor': return 'red'
      default: return 'gray'
    }
  }

  return (
    <div className="performance-indicator">
      <div 
        className="performance-indicator__status"
        style={{ color: getPerformanceColor(performance.status) }}
      >
        ●
      </div>
      
      {showDetails && (
        <div className="performance-indicator__details">
          <div>Duration: {performance.duration}ms</div>
          <div>Status: {performance.status}</div>
        </div>
      )}
    </div>
  )
}

// Main feedback system component
const FeedbackSystem = () => {
  const dispatch = useDispatch()
  const [notifications, setNotifications] = useState([])
  const [loadingOperations, setLoadingOperations] = useState([])
  
  // Get state from Redux
  const auth = useSelector(state => state.auth)
  const cart = useSelector(state => state.cart)
  
  // Track offline status
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Listen to error service
  useEffect(() => {
    const unsubscribe = errorService.addListener((error) => {
      if (error.type === 'RETRY_SUCCESS') {
        showNotification({
          type: 'success',
          title: 'Success',
          message: 'Operation completed successfully',
          duration: 3000
        })
      } else {
        const userError = errorService.formatErrorForUser(error)
        showNotification({
          ...userError,
          id: error.id,
          actions: userError.actions?.map(action => ({
            ...action,
            onClick: () => handleErrorAction(error, action)
          }))
        })
      }
    })
    
    return unsubscribe
  }, [])

  // Show notification
  const showNotification = useCallback((notification) => {
    const id = notification.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    setNotifications(prev => [...prev, { ...notification, id }])
  }, [])

  // Dismiss notification
  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id))
  }, [])

  // Handle notification actions
  const handleNotificationAction = useCallback((id, action) => {
    switch (action.action) {
      case 'retry':
        // Trigger retry logic
        break
      case 'login':
        // Navigate to login
        window.location.href = '/login'
        break
      case 'refresh':
        window.location.reload()
        break
      case 'goBack':
        window.history.back()
        break
      case 'dismiss':
        dismissNotification(id)
        break
      default:
        if (action.onClick) {
          action.onClick()
        }
    }
  }, [dismissNotification])

  // Handle error actions
  const handleErrorAction = useCallback((error, action) => {
    // Implementation depends on the specific action
    console.log('Handling error action:', error, action)
  }, [])

  // Add loading operation
  const addLoadingOperation = useCallback((operation) => {
    const id = `loading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    setLoadingOperations(prev => [...prev, { ...operation, id }])
    return id
  }, [])

  // Remove loading operation
  const removeLoadingOperation = useCallback((id) => {
    setLoadingOperations(prev => prev.filter(op => op.id !== id))
  }, [])

  // Update loading progress
  const updateLoadingProgress = useCallback((id, progress) => {
    setLoadingOperations(prev => 
      prev.map(op => op.id === id ? { ...op, progress } : op)
    )
  }, [])

  // Global loading states from Redux
  const globalLoading = auth.isLoading || cart.isLoading

  // Calculate offline queue length
  const offlineQueueLength = (auth.offline?.queueLength || 0) + (cart.offline?.queueLength || 0)
  const lastSync = auth.offline?.lastSync || cart.offline?.lastSync

  return (
    <div className="feedback-system">
      {/* Toast notifications */}
      <div className="toast-container">
        {notifications.map(notification => (
          <Toast
            key={notification.id}
            notification={notification}
            onDismiss={dismissNotification}
            onAction={handleNotificationAction}
          />
        ))}
      </div>

      {/* Loading indicators */}
      {(globalLoading || loadingOperations.length > 0) && (
        <div className="loading-container">
          {globalLoading && (
            <LoadingIndicator 
              operation="Loading..."
            />
          )}
          
          {loadingOperations.map(operation => (
            <LoadingIndicator
              key={operation.id}
              operation={operation.title}
              progress={operation.progress}
              canCancel={operation.canCancel}
              onCancel={() => {
                if (operation.onCancel) operation.onCancel()
                removeLoadingOperation(operation.id)
              }}
            />
          ))}
        </div>
      )}

      {/* Offline status */}
      <OfflineIndicator
        isOffline={isOffline}
        queueLength={offlineQueueLength}
        lastSync={lastSync}
      />

      {/* Performance indicators */}
      {process.env.NODE_ENV === 'development' && (
        <div className="performance-container">
          {auth.performance && (
            <PerformanceIndicator 
              performance={auth.performance}
              showDetails={true}
            />
          )}
          {cart.performance && (
            <PerformanceIndicator 
              performance={cart.performance}
              showDetails={true}
            />
          )}
        </div>
      )}
    </div>
  )
}

// Export individual components for use in other parts of the app
export { Toast, LoadingIndicator, OfflineIndicator, PerformanceIndicator }

export default FeedbackSystem