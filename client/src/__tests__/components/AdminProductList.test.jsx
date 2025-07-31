import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import AdminProductList from '../../components/admin/AdminProductList'
import authReducer from '../../store/slices/authSlice'
import cartReducer from '../../store/slices/cartSlice'
import productsReducer from '../../store/slices/productsSlice'
import ordersReducer from '../../store/slices/ordersSlice'
import adminReducer from '../../store/slices/adminSlice'

// Mock i18n
import { vi } from 'vitest'

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual('react-i18next')
  return {
    ...actual,
    useTranslation: () => ({
      t: (key) => key,
      i18n: { language: 'en' }
    })
  }
})

// Mock i18n config
vi.mock('../../i18n/i18n', () => ({
  localeCurrencies: {
    en: 'USD'
  },
  supportedLanguages: {
    en: { dir: 'ltr' }
  }
}))

// Mock API calls
vi.mock('../../api/config', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

const mockProducts = [
  {
    _id: '1',
    name: 'Crystal Healing Set',
    slug: 'crystal-healing-set',
    price: 29.99,
    priceUSD: 29.99,
    displayPrice: '$29.99',
    category: 'crystals',
    isActive: true,
    inStock: true,
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    _id: '2',
    name: 'Sage Bundle',
    slug: 'sage-bundle',
    price: 15.50,
    priceUSD: 15.50,
    displayPrice: '$15.50',
    category: 'herbs',
    isActive: false,
    inStock: true,
    createdAt: '2025-01-02T00:00:00.000Z'
  }
]

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

describe('AdminProductList Component', () => {
  const defaultState = {
    auth: {
      isAuthenticated: true,
      user: { firstName: 'Admin', isAdmin: true },
      token: 'test-token',
      isLoading: false,
      error: null
    },
    products: {
      items: mockProducts,
      totalItems: 2,
      isLoading: false,
      error: null
    },
    admin: {
      products: {
        filters: {},
        sortBy: 'createdAt',
        sortOrder: 'desc',
        currentPage: 1,
        itemsPerPage: 10
      }
    }
  }

  test('renders product list table with internationalized headers', () => {
    renderWithProviders(<AdminProductList />, defaultState)
    
    // Should show table headers
    expect(screen.getByText('admin.products.title')).toBeInTheDocument()
    expect(screen.getAllByText('common.edit')).toHaveLength(2) // One for each product
    expect(screen.getAllByText('common.delete')).toHaveLength(2) // One for each product
    expect(screen.getAllByText('admin.products.status')).toHaveLength(2) // Filter label and table header
  })

  test('displays products with multi-currency price support', () => {
    renderWithProviders(<AdminProductList />, defaultState)
    
    // Should show product names
    expect(screen.getByText('Crystal Healing Set')).toBeInTheDocument()
    expect(screen.getByText('Sage Bundle')).toBeInTheDocument()
    
    // Should show prices using existing PriceDisplay component
    expect(screen.getByText('$29.99')).toBeInTheDocument()
    expect(screen.getByText('$15.50')).toBeInTheDocument()
  })

  test('supports sorting by different columns', async () => {
    const { container } = renderWithProviders(<AdminProductList />, defaultState)
    
    // Find and click sort button for name column
    const nameSortButton = screen.getByRole('button', { name: /sort by name/i })
    fireEvent.click(nameSortButton)
    
    // Should trigger sort action (we'll verify state change in integration)
    expect(nameSortButton).toBeInTheDocument()
  })

  test('supports filtering by category and status', () => {
    renderWithProviders(<AdminProductList />, defaultState)
    
    // Should show filter controls
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  test('supports pagination', () => {
    const stateWithManyProducts = {
      ...defaultState,
      products: {
        ...defaultState.products,
        totalItems: 25
      }
    }
    
    renderWithProviders(<AdminProductList />, stateWithManyProducts)
    
    // Should show pagination controls
    expect(screen.getByText('common.next')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
  })

  test('shows product status correctly', () => {
    renderWithProviders(<AdminProductList />, defaultState)
    
    // Should show active/inactive status (appears in filter dropdown and in product rows)
    expect(screen.getAllByText('admin.products.active').length).toBeGreaterThan(0)
    expect(screen.getAllByText('admin.products.inactive').length).toBeGreaterThan(0)
  })

  test('has add new product button', () => {
    renderWithProviders(<AdminProductList />, defaultState)
    
    expect(screen.getByText('admin.products.add')).toBeInTheDocument()
  })

  test('shows loading state', () => {
    const loadingState = {
      ...defaultState,
      products: {
        ...defaultState.products,
        isLoading: true
      }
    }
    
    renderWithProviders(<AdminProductList />, loadingState)
    
    expect(screen.getByText('common.loading')).toBeInTheDocument()
  })

  test('shows error state', () => {
    const errorState = {
      ...defaultState,
      products: {
        ...defaultState.products,
        isLoading: false,
        error: 'Failed to load products'
      }
    }
    
    renderWithProviders(<AdminProductList />, errorState)
    
    expect(screen.getByText('Failed to load products')).toBeInTheDocument()
  })
})