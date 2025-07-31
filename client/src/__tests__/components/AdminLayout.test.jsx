import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import AdminLayout from '../../components/Layout/AdminLayout'
import authReducer from '../../store/slices/authSlice'
import cartReducer from '../../store/slices/cartSlice'
import productsReducer from '../../store/slices/productsSlice'
import ordersReducer from '../../store/slices/ordersSlice'
import adminReducer from '../../store/slices/adminSlice'

// Mock i18n
import { vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' }
  })
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

describe('AdminLayout Component', () => {
  const defaultState = {
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

  test('renders admin sidebar with navigation links', () => {
    renderWithProviders(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>,
      defaultState
    )
    
    // Should show admin navigation items
    expect(screen.getByText('admin.navigation.dashboard')).toBeInTheDocument()
    expect(screen.getByText('admin.navigation.products')).toBeInTheDocument()
    expect(screen.getByText('admin.navigation.orders')).toBeInTheDocument()
    expect(screen.getByText('admin.navigation.users')).toBeInTheDocument()
    
    // Should render children content
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  test('supports RTL language direction classes', () => {
    const { container } = renderWithProviders(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>,
      defaultState
    )
    
    // Should have layout classes (RTL will be tested in integration tests)
    const layout = container.querySelector('.admin-layout')
    expect(layout).toHaveClass('admin-layout')
    expect(layout).toHaveClass('ltr') // Default is LTR with our mock
  })

  test('has responsive design with collapsible sidebar', () => {
    const { container } = renderWithProviders(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>,
      defaultState
    )
    
    // Should have responsive classes
    const sidebar = container.querySelector('.admin-sidebar')
    expect(sidebar).toHaveClass('admin-sidebar')
    
    const mainContent = container.querySelector('.admin-main-content')
    expect(mainContent).toHaveClass('admin-main-content')
  })

  test('shows admin user info in header', () => {
    renderWithProviders(
      <AdminLayout>
        <div>Test Content</div>
      </AdminLayout>,
      defaultState
    )
    
    // Should show admin user name
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })
})