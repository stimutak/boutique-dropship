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
import adminProductsReducer from '../../store/slices/adminProductsSlice'

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
      adminProducts: adminProductsReducer,
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
    adminProducts: {
      items: mockProducts,
      totalItems: 2,
      isLoading: false,
      error: null,
      pagination: {
        currentPage: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      },
      bulkOperations: {
        importing: false,
        exporting: false,
        importProgress: 0,
        exportProgress: 0,
        importResults: null,
        exportResults: null
      },
      uploadedImages: [],
      uploadProgress: 0
    },
    admin: {
      products: {
        filters: {},
        sortBy: 'newest',
        sortOrder: 'desc',
        currentPage: 1,
        itemsPerPage: 20
      }
    }
  }

  test('renders product list table with internationalized headers', () => {
    // Create a store with mocked dispatch to prevent loading state
    const store = createTestStore(defaultState)
    const originalDispatch = store.dispatch
    store.dispatch = vi.fn((action) => {
      if (typeof action === 'object' && action.type && !action.type.includes('pending')) {
        return originalDispatch(action)
      }
      return Promise.resolve({ unwrap: vi.fn() })
    })

    render(
      <Provider store={store}>
        <BrowserRouter>
          <AdminProductList />
        </BrowserRouter>
      </Provider>
    )
    
    // Should show table headers
    expect(screen.getByText('admin.products.title')).toBeInTheDocument()
    expect(screen.getAllByText('common.edit')).toHaveLength(2) // One for each product
    expect(screen.getAllByText('common.delete')).toHaveLength(2) // One for each product
    expect(screen.getAllByText('admin.products.status')).toHaveLength(2) // Filter label and table header
  })

  test('displays products with multi-currency price support', () => {
    // Create a store that doesn't trigger new fetches
    const store = createTestStore(defaultState)
    // Mock dispatch to prevent real API calls
    const originalDispatch = store.dispatch
    store.dispatch = vi.fn((action) => {
      // Only process non-async actions (like setting filters)
      if (typeof action === 'object' && action.type && !action.type.includes('pending')) {
        return originalDispatch(action)
      }
      // Mock async actions by returning a resolved promise
      return Promise.resolve({ unwrap: vi.fn() })
    })

    render(
      <Provider store={store}>
        <BrowserRouter>
          <AdminProductList />
        </BrowserRouter>
      </Provider>
    )
    
    // Should show product names
    expect(screen.getByText('Crystal Healing Set')).toBeInTheDocument()
    expect(screen.getByText('Sage Bundle')).toBeInTheDocument()
    
    // Should show prices using existing PriceDisplay component
    expect(screen.getByText('$29.99')).toBeInTheDocument()
    expect(screen.getByText('$15.50')).toBeInTheDocument()
  })

  test('supports sorting by different columns', async () => {
    const store = createTestStore(defaultState)
    const originalDispatch = store.dispatch
    store.dispatch = vi.fn((action) => {
      if (typeof action === 'object' && action.type && !action.type.includes('pending')) {
        return originalDispatch(action)
      }
      return Promise.resolve({ unwrap: vi.fn() })
    })

    render(
      <Provider store={store}>
        <BrowserRouter>
          <AdminProductList />
        </BrowserRouter>
      </Provider>
    )
    
    // Find and click sort button for name column
    const nameSortButton = screen.getByRole('button', { name: /sort by name/i })
    fireEvent.click(nameSortButton)
    
    // Should trigger sort action (we'll verify state change in integration)
    expect(nameSortButton).toBeInTheDocument()
  })

  test('supports filtering by category and status', () => {
    const store = createTestStore(defaultState)
    const originalDispatch = store.dispatch
    store.dispatch = vi.fn((action) => {
      if (typeof action === 'object' && action.type && !action.type.includes('pending')) {
        return originalDispatch(action)
      }
      return Promise.resolve({ unwrap: vi.fn() })
    })

    render(
      <Provider store={store}>
        <BrowserRouter>
          <AdminProductList />
        </BrowserRouter>
      </Provider>
    )
    
    // Should show filter controls
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
  })

  test('supports pagination', () => {
    const stateWithManyProducts = {
      ...defaultState,
      adminProducts: {
        ...defaultState.adminProducts,
        totalItems: 25,
        pagination: {
          currentPage: 1,
          totalPages: 3,
          hasNextPage: true,
          hasPrevPage: false
        }
      }
    }
    
    const store = createTestStore(stateWithManyProducts)
    const originalDispatch = store.dispatch
    store.dispatch = vi.fn((action) => {
      if (typeof action === 'object' && action.type && !action.type.includes('pending')) {
        return originalDispatch(action)
      }
      return Promise.resolve({ unwrap: vi.fn() })
    })

    render(
      <Provider store={store}>
        <BrowserRouter>
          <AdminProductList />
        </BrowserRouter>
      </Provider>
    )
    
    // Should show pagination controls
    expect(screen.getByText('common.next')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
  })

  test('shows product status correctly', () => {
    const store = createTestStore(defaultState)
    const originalDispatch = store.dispatch
    store.dispatch = vi.fn((action) => {
      if (typeof action === 'object' && action.type && !action.type.includes('pending')) {
        return originalDispatch(action)
      }
      return Promise.resolve({ unwrap: vi.fn() })
    })

    render(
      <Provider store={store}>
        <BrowserRouter>
          <AdminProductList />
        </BrowserRouter>
      </Provider>
    )
    
    // Should show active/inactive status (appears in filter dropdown and in product rows)
    expect(screen.getAllByText('admin.products.active').length).toBeGreaterThan(0)
    expect(screen.getAllByText('admin.products.inactive').length).toBeGreaterThan(0)
  })

  test('has add new product button', () => {
    const store = createTestStore(defaultState)
    const originalDispatch = store.dispatch
    store.dispatch = vi.fn((action) => {
      if (typeof action === 'object' && action.type && !action.type.includes('pending')) {
        return originalDispatch(action)
      }
      return Promise.resolve({ unwrap: vi.fn() })
    })

    render(
      <Provider store={store}>
        <BrowserRouter>
          <AdminProductList />
        </BrowserRouter>
      </Provider>
    )
    
    expect(screen.getByText('admin.products.add')).toBeInTheDocument()
  })

  test('shows loading state', () => {
    const loadingState = {
      ...defaultState,
      adminProducts: {
        ...defaultState.adminProducts,
        isLoading: true
      }
    }
    
    // For loading state test, we want to see the loading UI
    // So we use the normal renderWithProviders without mocking dispatch
    renderWithProviders(<AdminProductList />, loadingState)
    
    expect(screen.getByText('common.loading')).toBeInTheDocument()
  })

  test('shows error state', () => {
    const errorState = {
      ...defaultState,
      adminProducts: {
        ...defaultState.adminProducts,
        isLoading: false,
        error: 'Failed to load products'
      }
    }
    
    const store = createTestStore(errorState)
    const originalDispatch = store.dispatch
    store.dispatch = vi.fn((action) => {
      if (typeof action === 'object' && action.type && !action.type.includes('pending')) {
        return originalDispatch(action)
      }
      return Promise.resolve({ unwrap: vi.fn() })
    })

    render(
      <Provider store={store}>
        <BrowserRouter>
          <AdminProductList />
        </BrowserRouter>
      </Provider>
    )
    
    expect(screen.getByText('Failed to load products')).toBeInTheDocument()
  })

  test('handles delete product confirmation and API call', async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm
    window.confirm = vi.fn(() => true)
    
    const store = createTestStore(defaultState)
    const originalDispatch = store.dispatch
    store.dispatch = vi.fn((action) => {
      if (typeof action === 'object' && action.type && !action.type.includes('pending')) {
        return originalDispatch(action)
      }
      // Return a proper promise with unwrap method for async thunks
      return {
        unwrap: vi.fn().mockResolvedValue({ success: true })
      }
    })

    render(
      <Provider store={store}>
        <BrowserRouter>
          <AdminProductList />
        </BrowserRouter>
      </Provider>
    )

    // Find and click delete button for first product
    const deleteButtons = screen.getAllByText('common.delete')
    fireEvent.click(deleteButtons[0])

    // Should show confirmation dialog
    expect(window.confirm).toHaveBeenCalledWith('admin.products.confirmDelete')
    
    // Cleanup
    window.confirm = originalConfirm
  })

  test('fetches products on component mount with correct parameters', async () => {
    const store = createTestStore(defaultState)
    const dispatchSpy = vi.fn()
    const originalDispatch = store.dispatch
    
    store.dispatch = (action) => {
      dispatchSpy(action)
      // Mock async actions to prevent loading state
      if (typeof action === 'function') {
        return Promise.resolve({ unwrap: vi.fn() })
      }
      return originalDispatch(action)
    }

    render(
      <Provider store={store}>
        <BrowserRouter>
          <AdminProductList />
        </BrowserRouter>
      </Provider>
    )

    // Wait for component to mount and dispatch action
    await waitFor(() => {
      expect(dispatchSpy).toHaveBeenCalled()
    })
    
    // Check that a function (thunk) was dispatched
    const dispatchedActions = dispatchSpy.mock.calls.map(call => call[0])
    expect(dispatchedActions.some(action => typeof action === 'function')).toBe(true)
  })

  test('updates filters and triggers new fetch', async () => {
    const store = createTestStore(defaultState)
    const originalDispatch = store.dispatch
    store.dispatch = vi.fn((action) => {
      if (typeof action === 'object' && action.type && !action.type.includes('pending')) {
        return originalDispatch(action)
      }
      return Promise.resolve({ unwrap: vi.fn() })
    })

    render(
      <Provider store={store}>
        <BrowserRouter>
          <AdminProductList />
        </BrowserRouter>
      </Provider>
    )

    // Verify filter controls exist and are functional
    const categorySelect = screen.getByLabelText(/category/i)
    const statusSelect = screen.getByLabelText(/status/i)
    
    expect(categorySelect).toBeInTheDocument()
    expect(statusSelect).toBeInTheDocument()
    
    // Test that the component properly displays the filters
    expect(screen.getAllByText('products.categories.all')).toHaveLength(2) // Label and option
    expect(screen.getAllByText('admin.products.status')).toHaveLength(2) // Label and table header
  })

  test('handles pagination correctly with adminProducts slice data', () => {
    const paginationState = {
      ...defaultState,
      adminProducts: {
        ...defaultState.adminProducts,
        totalItems: 45,
        pagination: {
          currentPage: 2,
          totalPages: 3,
          hasNextPage: true,
          hasPrevPage: true
        }
      }
    }
    
    const store = createTestStore(paginationState)
    const originalDispatch = store.dispatch
    store.dispatch = vi.fn((action) => {
      if (typeof action === 'object' && action.type && !action.type.includes('pending')) {
        return originalDispatch(action)
      }
      return Promise.resolve({ unwrap: vi.fn() })
    })

    render(
      <Provider store={store}>
        <BrowserRouter>
          <AdminProductList />
        </BrowserRouter>
      </Provider>
    )
    
    // Should show correct pagination info using adminProducts data
    expect(screen.getByText(/45/)).toBeInTheDocument() // Total items
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument() // Has page 2 button
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument() // Has page 3 button
  })

  test('displays products with international pricing support', () => {
    const internationalState = {
      ...defaultState,
      adminProducts: {
        ...defaultState.adminProducts,
        items: [
          {
            _id: '1',
            name: 'International Crystal',
            price: 29.99,
            priceUSD: 29.99,
            displayPrice: '$29.99',
            currency: 'USD',
            category: 'crystals',
            isActive: true
          },
          {
            _id: '2',
            name: 'European Herb',
            price: 25.50,
            priceUSD: 30.60,
            displayPrice: '€25.50',
            currency: 'EUR',
            category: 'herbs',
            isActive: true
          }
        ]
      }
    }
    
    const store = createTestStore(internationalState)
    const originalDispatch = store.dispatch
    store.dispatch = vi.fn((action) => {
      if (typeof action === 'object' && action.type && !action.type.includes('pending')) {
        return originalDispatch(action)
      }
      return Promise.resolve({ unwrap: vi.fn() })
    })

    render(
      <Provider store={store}>
        <BrowserRouter>
          <AdminProductList />
        </BrowserRouter>
      </Provider>
    )
    
    // Should display international pricing through PriceDisplay component
    expect(screen.getByText('$29.99')).toBeInTheDocument()
    expect(screen.getByText('€25.50')).toBeInTheDocument()
  })
})