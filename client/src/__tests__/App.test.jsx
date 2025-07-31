import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import App from '../App'
import authReducer from '../store/slices/authSlice'
import cartReducer from '../store/slices/cartSlice'
import productsReducer from '../store/slices/productsSlice'
import ordersReducer from '../store/slices/ordersSlice'
import adminReducer from '../store/slices/adminSlice'

// Mock CSRF service
import { vi } from 'vitest'

vi.mock('../services/csrf', () => ({
  default: {
    fetchToken: vi.fn(() => Promise.resolve('mock-token'))
  }
}))

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
      cart: cartReducer,
      products: productsReducer,
      orders: ordersReducer,
      admin: adminReducer,
    },
    preloadedState: initialState
  })
}

const renderWithProviders = (component, initialState = {}, initialEntries = ['/']) => {
  const store = createTestStore(initialState)
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={initialEntries}>
        {component}
      </MemoryRouter>
    </Provider>
  )
}

describe('App Component - Admin Routes', () => {
  test('admin dashboard route should be defined and accessible', () => {
    const adminState = {
      auth: {
        isAuthenticated: true,
        user: { firstName: 'Admin', isAdmin: true },
        token: 'test-token',
        isLoading: false,
        error: null
      },
      cart: {
        items: [],
        totalItems: 0,
        totalPrice: 0,
        isLoading: false,
        error: null
      }
    }

    // Try to navigate to admin dashboard route
    renderWithProviders(<App />, adminState, ['/admin/dashboard'])
    
    // Should show the admin dashboard content
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    
    // Should not show Not Found page
    expect(screen.queryByText('Page Not Found')).not.toBeInTheDocument()
  })

  test('admin products route should be accessible to admin users', () => {
    const adminState = {
      auth: {
        isAuthenticated: true,
        user: { firstName: 'Admin', isAdmin: true },
        token: 'test-token',
        isLoading: false,
        error: null
      },
      cart: {
        items: [],
        totalItems: 0,
        totalPrice: 0,
        isLoading: false,
        error: null
      }
    }

    renderWithProviders(<App />, adminState, ['/admin/products'])
    
    // Should show the admin products content
    expect(screen.getByText('Product Management')).toBeInTheDocument()
    expect(screen.queryByText('Page Not Found')).not.toBeInTheDocument()
  })

  test('admin routes structure should exist', () => {
    // This test verifies that our admin routes are properly defined
    // It will fail until we implement the routes in App.jsx
    const adminState = {
      auth: {
        isAuthenticated: true,
        user: { firstName: 'Admin', isAdmin: true },
        token: 'test-token',
        isLoading: false,
        error: null
      },
      cart: {
        items: [],
        totalItems: 0,
        totalPrice: 0,
        isLoading: false,
        error: null
      }
    }

    renderWithProviders(<App />, adminState, ['/admin'])
    
    // Should not show the not found page for admin base route
    expect(screen.queryByText('Page Not Found')).not.toBeInTheDocument()
  })
})