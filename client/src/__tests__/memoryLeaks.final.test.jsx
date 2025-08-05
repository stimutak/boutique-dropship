import { render, cleanup, act, waitFor } from '@testing-library/react'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import { Toast } from '../components/feedback/FeedbackSystem'

describe('Memory Leak Fixes Verification', () => {
  let originalSetTimeout
  let originalClearTimeout
  let originalSetInterval
  let originalClearInterval
  
  // Track all timers and intervals
  const timeouts = new Set()
  const intervals = new Set()

  beforeEach(() => {
    // Reset tracking collections
    timeouts.clear()
    intervals.clear()

    // Spy on global functions
    originalSetTimeout = window.setTimeout
    originalClearTimeout = window.clearTimeout
    originalSetInterval = window.setInterval
    originalClearInterval = window.clearInterval

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
  })

  afterEach(() => {
    // Restore original functions
    window.setTimeout = originalSetTimeout
    window.clearTimeout = originalClearTimeout
    window.setInterval = originalSetInterval
    window.clearInterval = originalClearInterval
    
    cleanup()
  })

  describe('Toast Component Memory Leak Fixes', () => {
    test('FIXED: should clear timer interval when toast unmounts before auto-dismiss', async () => {
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
      }, { timeout: 1000 })

      // Unmount component before interval completes
      unmount()

      // SHOULD NOW PASS - interval is properly cleared on unmount
      expect(intervals.size).toBe(0)
    })

    test('FIXED: should clear timer when toast is manually dismissed', async () => {
      const mockOnDismiss = vi.fn()
      const mockNotification = {
        id: 'test-2',
        type: 'info',
        title: 'Test',
        message: 'Test message',
        autoDismiss: true,
        duration: 5000
      }

      const { getByLabelText } = render(
        <Toast 
          notification={mockNotification}
          onDismiss={mockOnDismiss}
          onAction={vi.fn()}
        />
      )

      // Wait for interval to be created
      await waitFor(() => {
        expect(intervals.size).toBeGreaterThan(0)
      }, { timeout: 1000 })

      // Click dismiss button before auto-dismiss completes
      const dismissButton = getByLabelText('Dismiss notification')
      act(() => {
        dismissButton.click()
      })

      // SHOULD NOW PASS - interval is properly cleared when manually dismissed
      await waitFor(() => {
        expect(intervals.size).toBe(0)
      }, { timeout: 1000 })
    })
  })

  describe('Memory Leak Prevention Best Practices', () => {
    test('multiple toasts should all clean up their timers', async () => {
      const toasts = []
      
      // Create 3 Toast components
      for (let i = 0; i < 3; i++) {
        const mockNotification = {
          id: `test-${i}`,
          type: 'success',
          title: `Test ${i}`,
          message: 'Test message',
          autoDismiss: true,
          duration: 5000
        }

        toasts.push(render(
          <Toast 
            notification={mockNotification}
            onDismiss={vi.fn()}
            onAction={vi.fn()}
          />
        ))
      }

      // Wait for all intervals to be created
      await waitFor(() => {
        expect(intervals.size).toBe(3)
      }, { timeout: 2000 })

      // Unmount all toasts
      toasts.forEach(toast => toast.unmount())

      // All intervals should be cleaned up
      expect(intervals.size).toBe(0)
      
      // All timeouts should be cleaned up (for dismiss animations)
      await waitFor(() => {
        expect(timeouts.size).toBe(0)
      }, { timeout: 1000 })
    })
  })
})