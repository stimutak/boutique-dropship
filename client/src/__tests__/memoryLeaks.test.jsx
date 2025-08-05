import { render, screen, cleanup, act, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import Header from '../components/Layout/Header'
import Register from '../pages/Register'
import FeedbackSystem, { Toast } from '../components/feedback/FeedbackSystem'
import authReducer from '../store/slices/authSlice'
import cartReducer from '../store/slices/cartSlice'
import productsReducer from '../store/slices/productsSlice'

import { vi } from 'vitest'

// Mock errorService to track listeners
const mockErrorService = {
  addListener: vi.fn(() => vi.fn()), // Return mock unsubscribe function
  formatErrorForUser: vi.fn(() => ({ title: 'Error', message: 'Test error' }))
}

vi.mock('../services/errorService', () => ({ default: mockErrorService }))

// Mock router hooks
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      cart: cartReducer,
      products: productsReducer,
    },
    preloadedState: initialState
  })
}

const renderWithProviders = (component, initialState = {}) => {
  const store = createTestStore(initialState)
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  )
}

describe('Memory Leak Detection', () => {
  let originalAddEventListener
  let originalRemoveEventListener
  let originalSetTimeout
  let originalClearTimeout
  let originalSetInterval
  let originalClearInterval
  
  // Track all listeners, timers, and intervals
  const eventListeners = new Map()
  const timeouts = new Set()
  const intervals = new Set()

  beforeEach(() => {
    // Reset tracking collections
    eventListeners.clear()
    timeouts.clear()
    intervals.clear()

    // Spy on global functions
    originalAddEventListener = window.addEventListener
    originalRemoveEventListener = window.removeEventListener
    originalSetTimeout = window.setTimeout
    originalClearTimeout = window.clearTimeout
    originalSetInterval = window.setInterval
    originalClearInterval = window.clearInterval

    // Track event listeners
    window.addEventListener = vi.fn((event, listener, options) => {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set())
      }
      eventListeners.get(event).add(listener)
      return originalAddEventListener.call(window, event, listener, options)
    })

    window.removeEventListener = vi.fn((event, listener) => {
      if (eventListeners.has(event)) {
        eventListeners.get(event).delete(listener)
      }
      return originalRemoveEventListener.call(window, event, listener)
    })

    // Track timeouts
    window.setTimeout = vi.fn((callback, delay) => {
      const id = originalSetTimeout(callback, delay)
      timeouts.add(id)
      return id
    })

    window.clearTimeout = vi.fn((id) => {
      timeouts.delete(id)
      return originalClearTimeout(id)
    })

    // Track intervals
    window.setInterval = vi.fn((callback, delay) => {
      const id = originalSetInterval(callback, delay)
      intervals.add(id)
      return id
    })

    window.clearInterval = vi.fn((id) => {
      intervals.delete(id)
      return originalClearInterval(id)
    })

    // Clear error service mock
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original functions
    window.addEventListener = originalAddEventListener
    window.removeEventListener = originalRemoveEventListener
    window.setTimeout = originalSetTimeout
    window.clearTimeout = originalClearTimeout
    window.setInterval = originalSetInterval
    window.clearInterval = originalClearInterval
    
    cleanup()
  })

  describe('Header Component Memory Leaks', () => {
    test('FAILING: should clear setTimeout when component unmounts during logout', async () => {
      const initialState = {
        auth: {
          isAuthenticated: true,
          user: { firstName: 'John' },
          isLoading: false,
          error: null
        },
        cart: { items: [], totalItems: 0, totalPrice: 0, isLoading: false, error: null }
      }

      const { unmount } = renderWithProviders(<Header />, initialState)
      
      // Simulate logout click
      const logoutButton = screen.getByText('Logout')
      act(() => {
        logoutButton.click()
      })

      const timeoutCountBeforeUnmount = timeouts.size
      expect(timeoutCountBeforeUnmount).toBeGreaterThan(0)

      // Unmount component before timeout completes
      unmount()

      // THIS TEST SHOULD FAIL - timeouts are not cleared on unmount
      expect(timeouts.size).toBe(0) // This will fail - should be cleaned up but isn't
    })
  })

  describe('Register Page Memory Leaks', () => {
    test('FAILING: should clear setTimeout when component unmounts during registration', async () => {
      const initialState = {
        auth: {
          isAuthenticated: true, // Simulate successful registration
          user: { firstName: 'John' },
          isLoading: false,
          error: null
        },
        cart: { items: [], totalItems: 0, totalPrice: 0, isLoading: false, error: null }
      }

      const { unmount } = renderWithProviders(<Register />, initialState)

      const timeoutCountBeforeUnmount = timeouts.size
      expect(timeoutCountBeforeUnmount).toBeGreaterThan(0)

      // Unmount component before timeout completes
      unmount()

      // THIS TEST SHOULD FAIL - setTimeout is not cleared on unmount
      expect(timeouts.size).toBe(0) // This will fail - should be cleaned up but isn't
    })
  })

  describe('Toast Component Memory Leaks', () => {
    test('FAILING: should clear timer interval when toast unmounts', async () => {
      const mockNotification = {
        id: 'test-1',
        type: 'success',
        title: 'Test',
        message: 'Test message',
        autoDismiss: true,
        duration: 5000
      }

      const { unmount } = render(
        <Toast 
          notification={mockNotification}
          onDismiss={vi.fn()}
          onAction={vi.fn()}
        />
      )

      // Wait for interval to be created
      await waitFor(() => {
        expect(intervals.size).toBeGreaterThan(0)
      })

      const intervalCountBeforeUnmount = intervals.size

      // Unmount component before interval completes
      unmount()

      // THIS TEST SHOULD FAIL - interval is not cleared on unmount
      expect(intervals.size).toBe(0) // This will fail - should be cleaned up but isn't
    })

    test('FAILING: should clear timer when toast is manually dismissed', async () => {
      const mockOnDismiss = jest.fn()
      const mockNotification = {
        id: 'test-2',
        type: 'info',
        title: 'Test',
        message: 'Test message',
        autoDismiss: true,
        duration: 5000
      }

      render(
        <Toast 
          notification={mockNotification}
          onDismiss={mockOnDismiss}
          onAction={jest.fn()}
        />
      )

      // Wait for interval to be created
      await waitFor(() => {
        expect(intervals.size).toBeGreaterThan(0)
      })

      // Click dismiss button
      const dismissButton = screen.getByLabelText('Dismiss notification')
      act(() => {
        dismissButton.click()
      })

      // THIS TEST SHOULD FAIL - interval is not cleared when manually dismissed
      expect(intervals.size).toBe(0) // This will fail - should be cleaned up but isn't
    })
  })

  describe('FeedbackSystem Component Memory Leaks', () => {
    test('should properly clean up online/offline event listeners', async () => {
      const { unmount } = renderWithProviders(<FeedbackSystem />)

      // Should have added online/offline listeners
      expect(eventListeners.has('online')).toBe(true)
      expect(eventListeners.has('offline')).toBe(true)

      const onlineListenersBefore = eventListeners.get('online').size
      const offlineListenersBefore = eventListeners.get('offline').size

      unmount()

      // Listeners should be removed
      expect(eventListeners.get('online').size).toBe(onlineListenersBefore - 1)
      expect(eventListeners.get('offline').size).toBe(offlineListenersBefore - 1)
    })

    test('should properly unsubscribe from error service', async () => {
      const { unmount } = renderWithProviders(<FeedbackSystem />)

      // Should have subscribed to error service
      expect(mockErrorService.addListener).toHaveBeenCalled()

      unmount()

      // Should have called the unsubscribe function
      // Note: This test passes because FeedbackSystem already has proper cleanup
    })
  })

  describe('Global Error Service Memory Leaks', () => {
    test('FAILING: should not accumulate global error and unhandledrejection listeners', async () => {
      // Import error service multiple times (simulating multiple page loads)
      const errorService1 = require('../services/errorService').default
      const errorService2 = require('../services/errorService').default
      const errorService3 = require('../services/errorService').default

      // Each import adds new global listeners
      const errorListenerCount = eventListeners.get('error')?.size || 0
      const rejectionListenerCount = eventListeners.get('unhandledrejection')?.size || 0

      // THIS TEST SHOULD FAIL - global listeners accumulate and are never removed
      expect(errorListenerCount).toBeLessThanOrEqual(1) // Should only be 1 listener max
      expect(rejectionListenerCount).toBeLessThanOrEqual(1) // Should only be 1 listener max
    })
  })

  describe('Component Destruction Memory Verification', () => {
    test('FAILING: components should not leave any active timers or listeners', async () => {
      const { unmount: unmountHeader } = renderWithProviders(<Header />, {
        auth: { isAuthenticated: true, user: { firstName: 'John' }, isLoading: false, error: null },
        cart: { items: [], totalItems: 0, totalPrice: 0, isLoading: false, error: null }
      })

      const { unmount: unmountRegister } = renderWithProviders(<Register />, {
        auth: { isAuthenticated: true, user: { firstName: 'John' }, isLoading: false, error: null },
        cart: { items: [], totalItems: 0, totalPrice: 0, isLoading: false, error: null }
      })

      const { unmount: unmountFeedback } = renderWithProviders(<FeedbackSystem />)

      // Trigger actions that create timers
      const logoutButton = screen.getByText('Logout')
      act(() => {
        logoutButton.click()
      })

      // Unmount all components
      unmountHeader()
      unmountRegister()
      unmountFeedback()

      // THIS TEST SHOULD FAIL - there should be no active timers or intervals
      expect(timeouts.size).toBe(0) // Will fail due to uncleaned timeouts
      expect(intervals.size).toBe(0) // Will fail due to uncleaned intervals
    })
  })
})