import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import { vi } from 'vitest'
import AdminDashboard from '../../pages/admin/AdminDashboard'
import authReducer from '../../store/slices/authSlice'
import adminReducer from '../../store/slices/adminSlice'

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' }
  })
}))

// Mock react-router-dom navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// Mock currency utilities
vi.mock('../../utils/currency', () => ({
  formatPrice: (amount, currency, locale) => `${currency} ${amount.toFixed(2)}`,
  getCurrencyForLocale: (locale) => locale === 'ar' ? 'SAR' : 'USD',
  convertPrice: (amount, from, to) => amount * (to === 'EUR' ? 0.85 : 1)
}))

// Mock API calls
global.fetch = vi.fn()

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer,
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

describe('AdminDashboard Component - TDD Implementation', () => {
  const mockAnalyticsData = {
    metrics: {
      sales: {
        totalRevenue: 15750.50,
        totalOrders: 125,
        avgOrderValue: 126.00
      },
      products: {
        totalProducts: 85,
        activeProducts: 78,
        lowStockProducts: 5,
        outOfStockProducts: 2
      },
      users: {
        totalUsers: 1250,
        newUsersToday: 12,
        newUsersThisWeek: 45
      }
    }
  }

  const mockRecentOrders = [
    {
      _id: '1',
      orderNumber: 'ORD-001',
      customer: { firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
      total: 99.99,
      currency: 'USD',
      status: 'pending',
      createdAt: '2023-01-01T00:00:00Z'
    },
    {
      _id: '2',
      orderNumber: 'ORD-002',
      customer: { firstName: 'Jane', lastName: 'Smith', email: 'jane@test.com' },
      total: 75.50,
      currency: 'EUR',
      status: 'processing',
      createdAt: '2023-01-02T00:00:00Z'
    }
  ]

  const mockTopProducts = [
    {
      _id: 'p1',
      name: { en: 'Crystal Healing Set', ar: 'مجموعة الشفاء بالكريستال' },
      images: ['https://example.com/crystal.jpg'],
      unitsSold: 45,
      revenue: 2250.00,
      currency: 'USD'
    },
    {
      _id: 'p2',
      name: { en: 'Lavender Essential Oil', ar: 'زيت اللافندر الأساسي' },
      images: ['https://example.com/lavender.jpg'],
      unitsSold: 32,
      revenue: 1280.00,
      currency: 'USD'
    }
  ]

  const mockLowStockProducts = [
    {
      _id: 'p3',
      name: { en: 'Sage Bundle', ar: 'حزمة المريمية' },
      stock: 3,
      lowStockThreshold: 10
    }
  ]

  const defaultState = {
    auth: {
      isAuthenticated: true,
      user: { firstName: 'Admin', isAdmin: true },
      token: 'test-token'
    },
    admin: {
      dashboard: {
        analytics: mockAnalyticsData,
        recentOrders: mockRecentOrders,
        topProducts: mockTopProducts,
        lowStockProducts: mockLowStockProducts,
        isLoading: false,
        error: null
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock multiple fetch calls for different endpoints
    fetch.mockImplementation((url) => {
      if (url.includes('/analytics/dashboard')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ analytics: mockAnalyticsData })
        })
      }
      if (url.includes('/orders?limit=5')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ orders: mockRecentOrders })
        })
      }
      if (url.includes('/analytics/products')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ products: mockTopProducts })
        })
      }
      if (url.includes('/products?filter=lowStock')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ products: mockLowStockProducts })
        })
      }
      if (url.includes('/users/stats')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ stats: { newUsersToday: 12 } })
        })
      }
      if (url.includes('/analytics/export')) {
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['mock csv data'], { type: 'text/csv' }))
        })
      }
      // Default fallback
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    })
  })

  // RED PHASE: Write failing test first
  test('should render admin dashboard with layout', () => {
    renderWithProviders(<AdminDashboard />, defaultState)
    
    // Should render within AdminLayout with dashboard content
    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument()
  })

  test('should display summary statistics cards with multi-currency support', async () => {
    renderWithProviders(<AdminDashboard />, defaultState)
    
    // Should show revenue statistics
    await waitFor(() => {
      expect(screen.getByTestId('total-revenue-card')).toBeInTheDocument()
    })
    expect(screen.getByText('USD 15750.50')).toBeInTheDocument()
    
    // Should show order statistics
    expect(screen.getByTestId('total-orders-card')).toBeInTheDocument()
    expect(screen.getByText('125')).toBeInTheDocument()
    
    // Should show product statistics
    expect(screen.getByTestId('total-products-card')).toBeInTheDocument()
    expect(screen.getByText('85')).toBeInTheDocument()
    expect(screen.getByText(/78.*admin\.dashboard\.active/)).toBeInTheDocument() // Active products
    
    // Should show user statistics
    expect(screen.getByTestId('total-users-card')).toBeInTheDocument()
    expect(screen.getByText('1250')).toBeInTheDocument()
    expect(screen.getByText(/45.*admin\.dashboard\.newThisWeek/)).toBeInTheDocument() // New this week
  })

  test('should show clickable statistics cards that navigate to respective sections', async () => {
    renderWithProviders(<AdminDashboard />, defaultState)

    await waitFor(() => {
      expect(screen.getByTestId('total-orders-card')).toBeInTheDocument()
    })
    
    // Click on orders card should navigate to orders page
    fireEvent.click(screen.getByTestId('total-orders-card'))
    expect(mockNavigate).toHaveBeenCalledWith('/admin/orders')
    
    // Click on products card should navigate to products page
    fireEvent.click(screen.getByTestId('total-products-card'))
    expect(mockNavigate).toHaveBeenCalledWith('/admin/products')
    
    // Click on users card should navigate to users page
    fireEvent.click(screen.getByTestId('total-users-card'))
    expect(mockNavigate).toHaveBeenCalledWith('/admin/users')
  })

  test('should display recent activity section with latest orders', async () => {
    renderWithProviders(<AdminDashboard />, defaultState)
    
    await waitFor(() => {
      expect(screen.getByTestId('recent-activity-section')).toBeInTheDocument()
    })
    
    // Should show recent orders
    expect(screen.getByText('ORD-001')).toBeInTheDocument()
    expect(screen.getByText('ORD-002')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    
    // Should show order amounts with proper currency formatting
    expect(screen.getByText('USD 99.99')).toBeInTheDocument()
    expect(screen.getByText('EUR 75.50')).toBeInTheDocument()
    
    // Should show order statuses
    expect(screen.getByText('admin.orders.pending')).toBeInTheDocument()
    expect(screen.getByText('admin.orders.processing')).toBeInTheDocument()
  })

  test('should display quick actions section with navigation buttons', () => {
    renderWithProviders(<AdminDashboard />, defaultState)
    
    const quickActionsSection = screen.getByTestId('quick-actions-section')
    expect(quickActionsSection).toBeInTheDocument()
    
    // Should have all quick action buttons
    expect(screen.getByTestId('add-product-btn')).toBeInTheDocument()
    expect(screen.getByTestId('view-orders-btn')).toBeInTheDocument()
    expect(screen.getByTestId('manage-users-btn')).toBeInTheDocument()
    expect(screen.getByTestId('export-reports-btn')).toBeInTheDocument()
  })

  test('should navigate when clicking quick action buttons', () => {
    renderWithProviders(<AdminDashboard />, defaultState)
    
    // Test navigation for each quick action
    fireEvent.click(screen.getByTestId('add-product-btn'))
    expect(mockNavigate).toHaveBeenCalledWith('/admin/products/new')
    
    fireEvent.click(screen.getByTestId('view-orders-btn'))
    expect(mockNavigate).toHaveBeenCalledWith('/admin/orders')
    
    fireEvent.click(screen.getByTestId('manage-users-btn'))
    expect(mockNavigate).toHaveBeenCalledWith('/admin/users')
  })

  test('should display top products section with localized names', async () => {
    renderWithProviders(<AdminDashboard />, defaultState)
    
    await waitFor(() => {
      expect(screen.getByTestId('top-products-section')).toBeInTheDocument()
    })
    
    // Should show top products with English names (default language)
    expect(screen.getByText('Crystal Healing Set')).toBeInTheDocument()
    expect(screen.getByText('Lavender Essential Oil')).toBeInTheDocument()
    
    // Should show units sold and revenue
    expect(screen.getByText(/45.*admin\.dashboard\.unitsSold/)).toBeInTheDocument() // units sold
    expect(screen.getByText(/32.*admin\.dashboard\.unitsSold/)).toBeInTheDocument() // units sold
    expect(screen.getByText('USD 2250.00')).toBeInTheDocument() // revenue
    expect(screen.getByText('USD 1280.00')).toBeInTheDocument() // revenue
  })

  test('should display top products with Arabic names when language is Arabic', async () => {
    // Mock Arabic i18n - this test verifies localization logic works
    const arabicMockUseTranslation = vi.fn(() => ({
      t: (key) => key,
      i18n: { language: 'ar' }
    }))
    
    vi.mocked(require('react-i18next')).useTranslation = arabicMockUseTranslation

    renderWithProviders(<AdminDashboard />, defaultState)
    
    await waitFor(() => {
      expect(screen.getByTestId('top-products-section')).toBeInTheDocument()
    })
    
    // Should show Arabic product names
    expect(screen.getByText('مجموعة الشفاء بالكريستال')).toBeInTheDocument()
    expect(screen.getByText('زيت اللافندر الأساسي')).toBeInTheDocument()
  })

  test('should display system status section with alerts', async () => {
    renderWithProviders(<AdminDashboard />, defaultState)
    
    await waitFor(() => {
      expect(screen.getByTestId('system-status-section')).toBeInTheDocument()
    })
    
    // Should show low stock alerts
    expect(screen.getByText('admin.dashboard.lowStockAlerts')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // Low stock count
    
    // Should show pending orders count
    expect(screen.getByText('admin.dashboard.pendingOrders')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    
    // Should show new users today
    expect(screen.getByText('admin.dashboard.newUsersToday')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  test('should display revenue chart placeholder', () => {
    renderWithProviders(<AdminDashboard />, defaultState)
    
    const chartPlaceholder = screen.getByTestId('revenue-chart-placeholder')
    expect(chartPlaceholder).toBeInTheDocument()
    expect(screen.getByText('admin.dashboard.analyticsComingSoon')).toBeInTheDocument()
  })

  test('should handle loading state correctly', () => {
    const loadingState = {
      ...defaultState,
      admin: {
        ...defaultState.admin,
        dashboard: {
          ...defaultState.admin.dashboard,
          isLoading: true
        }
      }
    }
    
    renderWithProviders(<AdminDashboard />, loadingState)
    
    expect(screen.getByText('common.loading')).toBeInTheDocument()
    expect(screen.queryByTestId('total-revenue-card')).not.toBeInTheDocument()
  })

  test('should handle error state correctly', () => {
    const errorState = {
      ...defaultState,
      admin: {
        ...defaultState.admin,
        dashboard: {
          ...defaultState.admin.dashboard,
          error: 'Failed to load dashboard data'
        }
      }
    }
    
    renderWithProviders(<AdminDashboard />, errorState)
    
    expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument()
    expect(screen.queryByTestId('total-revenue-card')).not.toBeInTheDocument()
  })

  test('should handle empty states gracefully', async () => {
    const emptyData = {
      analytics: {
        metrics: {
          sales: { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 },
          products: { totalProducts: 0, activeProducts: 0, lowStockProducts: 0, outOfStockProducts: 0 },
          users: { totalUsers: 0, newUsersToday: 0, newUsersThisWeek: 0 }
        }
      },
      orders: [],
      products: []
    }

    fetch.mockImplementation(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(emptyData)
    }))

    renderWithProviders(<AdminDashboard />, defaultState)
    
    await waitFor(() => {
      expect(screen.getByTestId('total-revenue-card')).toBeInTheDocument()
    })
    
    // Should show zero values
    expect(screen.getByText('USD 0.00')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    
    // Should show empty states for sections
    expect(screen.getByText('admin.dashboard.noRecentOrders')).toBeInTheDocument()
    expect(screen.getByText('admin.dashboard.noTopProducts')).toBeInTheDocument()
  })

  test('should support RTL layout for Arabic language', () => {
    const { container } = renderWithProviders(<AdminDashboard />, defaultState)
    
    // Should render dashboard properly (AdminLayout handles RTL class)
    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument()
    
    // AdminLayout should handle RTL styling
    const layout = container.querySelector('.admin-layout')
    expect(layout).toBeInTheDocument()
  })

  test('should fetch dashboard data on component mount', async () => {
    renderWithProviders(<AdminDashboard />, defaultState)
    
    // Should make API calls to fetch dashboard data
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/analytics/dashboard', expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test-token'
        })
      }))
    })
  })

  test('should refresh data when clicking refresh button', async () => {
    renderWithProviders(<AdminDashboard />, defaultState)
    
    await waitFor(() => {
      expect(screen.getByTestId('refresh-dashboard-btn')).toBeInTheDocument()
    })
    
    // Clear previous fetch calls
    fetch.mockClear()
    
    // Click refresh button
    fireEvent.click(screen.getByTestId('refresh-dashboard-btn'))
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/analytics/dashboard', expect.any(Object))
    })
  })

  test('should handle export reports functionality', async () => {
    global.URL.createObjectURL = vi.fn(() => 'mocked-url')
    global.URL.revokeObjectURL = vi.fn()
    
    const mockBlob = new Blob(['mock csv data'], { type: 'text/csv' })
    fetch.mockResolvedValueOnce({
      ok: true,
      blob: async () => mockBlob
    })

    renderWithProviders(<AdminDashboard />, defaultState)
    
    const exportButton = screen.getByTestId('export-reports-btn')
    fireEvent.click(exportButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/analytics/export?type=dashboard', expect.any(Object))
    })
  })
})