import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import AdminProductForm from '../../components/admin/AdminProductForm'
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

const mockProduct = {
  _id: '1',
  name: 'Crystal Healing Set',
  slug: 'crystal-healing-set',
  description: 'A beautiful set of healing crystals',
  price: 29.99,
  category: 'crystals',
  isActive: true,
  inStock: true,
  images: ['image1.jpg'],
  translations: {
    en: {
      name: 'Crystal Healing Set',
      description: 'A beautiful set of healing crystals'
    },
    es: {
      name: 'Kit de Sanación con Cristales',
      description: 'Un hermoso conjunto de cristales sanadores'
    }
  }
}

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

describe('AdminProductForm Component', () => {
  const defaultState = {
    auth: {
      isAuthenticated: true,
      user: { firstName: 'Admin', isAdmin: true },
      token: 'test-token',
      isLoading: false,
      error: null
    },
    products: {
      items: [],
      isLoading: false,
      error: null
    }
  }

  test('renders form for creating new product', () => {
    renderWithProviders(<AdminProductForm />, defaultState)
    
    // Should show form fields with internationalized labels
    expect(screen.getByLabelText(/products.title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/products.price/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
    
    // Should show create button
    expect(screen.getByText('common.save')).toBeInTheDocument()
  })

  test('renders form for editing existing product', () => {
    renderWithProviders(
      <AdminProductForm product={mockProduct} />, 
      defaultState
    )
    
    // Should show form pre-filled with product data
    expect(screen.getByDisplayValue('Crystal Healing Set')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A beautiful set of healing crystals')).toBeInTheDocument()
    expect(screen.getByDisplayValue('29.99')).toBeInTheDocument()
    
    // Should show update button
    expect(screen.getByText('common.save')).toBeInTheDocument()
  })

  test('supports multi-language product names and descriptions', () => {
    renderWithProviders(
      <AdminProductForm product={mockProduct} />, 
      defaultState
    )
    
    // Should show language tabs
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('Español')).toBeInTheDocument()
    
    // Clicking Spanish tab should show Spanish content
    fireEvent.click(screen.getByText('Español'))
    expect(screen.getByDisplayValue('Kit de Sanación con Cristales')).toBeInTheDocument()
  })

  test('has image upload functionality', () => {
    renderWithProviders(<AdminProductForm />, defaultState)
    
    // Should show image upload area
    expect(screen.getByText(/image upload/i)).toBeInTheDocument()
    expect(screen.getByText('Upload Images')).toBeInTheDocument()
    expect(screen.getByLabelText('Upload Images')).toBeInTheDocument()
  })

  test('has category selection dropdown', () => {
    renderWithProviders(<AdminProductForm />, defaultState)
    
    // Should show category dropdown with options
    const categorySelect = screen.getByLabelText(/category/i)
    expect(categorySelect).toBeInTheDocument()
    
    // Should have category options
    expect(screen.getByText('products.categories.crystals')).toBeInTheDocument()
    expect(screen.getByText('products.categories.herbs')).toBeInTheDocument()
  })

  test('validates required fields', async () => {
    renderWithProviders(<AdminProductForm />, defaultState)
    
    // Submit form without filling required fields
    const saveButton = screen.getByText('common.save')
    fireEvent.click(saveButton)
    
    // Should show validation errors (multiple fields will show this error)
    await waitFor(() => {
      expect(screen.getAllByText('errors.requiredField').length).toBeGreaterThan(0)
    })
  })

  test('supports price input with currency formatting', () => {
    renderWithProviders(<AdminProductForm />, defaultState)
    
    const priceInput = screen.getByLabelText(/products.price/i)
    fireEvent.change(priceInput, { target: { value: '25.99' } })
    
    expect(priceInput.value).toBe('25.99')
  })

  test('has active/inactive status toggle', () => {
    renderWithProviders(<AdminProductForm />, defaultState)
    
    // Should show status toggle
    expect(screen.getByLabelText(/admin.products.active/i)).toBeInTheDocument()
  })

  test('shows loading state during save', async () => {
    const loadingState = {
      ...defaultState,
      products: {
        ...defaultState.products,
        isLoading: true
      }
    }
    
    renderWithProviders(<AdminProductForm />, loadingState)
    
    expect(screen.getByText('common.loading')).toBeInTheDocument()
  })

  test('shows error state on save failure', () => {
    const errorState = {
      ...defaultState,
      products: {
        ...defaultState.products,
        error: 'Failed to save product'
      }
    }
    
    renderWithProviders(<AdminProductForm />, errorState)
    
    expect(screen.getByText('Failed to save product')).toBeInTheDocument()
  })
})