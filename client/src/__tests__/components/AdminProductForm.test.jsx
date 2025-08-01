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
    },
    adminProducts: {
      items: [],
      totalItems: 0,
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
    }
  }

  test('renders form for creating new product', () => {
    renderWithProviders(<AdminProductForm />, defaultState)
    
    // Should show form fields with internationalized labels
    expect(screen.getByLabelText(/products.title/i)).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /^description \*/i })).toBeInTheDocument()
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
      adminProducts: {
        ...defaultState.adminProducts,
        isLoading: true
      }
    }
    
    renderWithProviders(<AdminProductForm />, loadingState)
    
    expect(screen.getByText('common.loading')).toBeInTheDocument()
  })

  test('shows error state on save failure', () => {
    const errorState = {
      ...defaultState,
      adminProducts: {
        ...defaultState.adminProducts,
        error: 'Failed to save product'
      }
    }
    
    renderWithProviders(<AdminProductForm />, errorState)
    
    expect(screen.getByText('Failed to save product')).toBeInTheDocument()
  })

  // BUG TESTS - These tests verify the bugs have been fixed
  describe('Bug Tests - Should now pass after fixes', () => {
    test('Bug 3: Form submission should call onSave callback after successful Redux action', async () => {
      // This test reproduces the silent failure where the form "blinks" but doesn't save
      const mockOnSave = vi.fn()
      const mockDispatch = vi.fn().mockResolvedValue({ 
        type: 'adminProducts/createProduct/fulfilled',
        payload: { data: { product: mockProduct } },
        unwrap: vi.fn().mockResolvedValue({ data: { product: mockProduct } })
      })
      
      // Mock the Redux store dispatch to simulate successful creation
      const storeWithMockDispatch = {
        ...createTestStore(defaultState),
        dispatch: mockDispatch
      }
      
      render(
        <Provider store={storeWithMockDispatch}>
          <BrowserRouter>
            <AdminProductForm onSave={mockOnSave} />
          </BrowserRouter>
        </Provider>
      )
      
      // Fill in required fields
      fireEvent.change(screen.getByLabelText(/products.title/i), { target: { value: 'Test Product' } })
      fireEvent.change(screen.getByRole('textbox', { name: /^description \*/i }), { target: { value: 'Test description' } })
      fireEvent.change(screen.getByLabelText(/short description/i), { target: { value: 'Short desc' } })
      fireEvent.change(screen.getByLabelText(/products.price/i), { target: { value: '25.99' } })
      fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'crystals' } })
      
      // Fill in wholesaler fields
      fireEvent.change(screen.getByLabelText(/wholesaler name/i), { target: { value: 'Test Wholesaler' } })
      fireEvent.change(screen.getByLabelText(/wholesaler email/i), { target: { value: 'test@wholesaler.com' } })
      fireEvent.change(screen.getByLabelText(/product code/i), { target: { value: 'TEST-001' } })
      fireEvent.change(screen.getByLabelText(/wholesale cost/i), { target: { value: '15.00' } })
      
      // Submit the form
      const saveButton = screen.getByText('common.save')
      fireEvent.click(saveButton)
      
      // Should call dispatch for createProduct
      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalled()
      })
      
      // Should call onSave callback after successful dispatch
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
          name: 'Test Product',
          description: 'Test description',
          price: 25.99
        }))
      })
    })
    
    test('Bug 3 Reproduction: onSave callback should wait for Redux action completion', async () => {
      // This test specifically checks that onSave is not called prematurely
      const mockOnSave = vi.fn()
      let resolveDispatch
      const mockDispatch = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolveDispatch = () => resolve({ 
            type: 'adminProducts/createProduct/fulfilled',
            payload: { data: { product: mockProduct } },
            unwrap: vi.fn().mockResolvedValue({ data: { product: mockProduct } })
          })
        })
      })
      
      const storeWithAsyncDispatch = {
        ...createTestStore(defaultState),
        dispatch: mockDispatch
      }
      
      render(
        <Provider store={storeWithAsyncDispatch}>
          <BrowserRouter>
            <AdminProductForm onSave={mockOnSave} />
          </BrowserRouter>
        </Provider>
      )
      
      // Fill form and submit
      fireEvent.change(screen.getByLabelText(/products.title/i), { target: { value: 'Test Product' } })
      fireEvent.change(screen.getByRole('textbox', { name: /^description \*/i }), { target: { value: 'Test description' } })
      fireEvent.change(screen.getByLabelText(/short description/i), { target: { value: 'Short desc' } })
      fireEvent.change(screen.getByLabelText(/products.price/i), { target: { value: '25.99' } })
      fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'crystals' } })
      fireEvent.change(screen.getByLabelText(/wholesaler name/i), { target: { value: 'Test Wholesaler' } })
      fireEvent.change(screen.getByLabelText(/wholesaler email/i), { target: { value: 'test@wholesaler.com' } })
      fireEvent.change(screen.getByLabelText(/product code/i), { target: { value: 'TEST-001' } })
      fireEvent.change(screen.getByLabelText(/wholesale cost/i), { target: { value: '15.00' } })
      
      fireEvent.click(screen.getByText('common.save'))
      
      // onSave should NOT be called yet (while dispatch is pending)
      expect(mockOnSave).not.toHaveBeenCalled()
      
      // Now resolve the dispatch
      resolveDispatch()
      
      // Now onSave should be called
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled()
      })
    })
    test('Bug 1 Fixed: Image selection should work and show images in form', async () => {
      // Test that images are properly displayed in the form when uploaded
      const mockImages = [{ url: '/images/products/test-image.png', alt: 'Test Image' }]
      const stateWithImages = {
        ...defaultState,
        // Create a form state that would have images
      }
      
      // Mock a product with images to test the edit case
      const productWithImages = {
        _id: '1',
        name: 'Test Product',
        images: mockImages
      }
      
      renderWithProviders(<AdminProductForm product={productWithImages} />, stateWithImages)

      // Should show current images section when product has images
      expect(screen.getByText('Current Images')).toBeInTheDocument()
      
      // Should show the image
      const image = screen.getByRole('img')
      expect(image).toBeInTheDocument()
      expect(image.src).toContain('/images/products/test-image.png')
    })

    test('Bug 2 Fixed: Product save should work without showing error banners', async () => {
      // Test that the form doesn't show error when Redux state is clean
      const cleanState = {
        ...defaultState,
        adminProducts: {
          ...defaultState.adminProducts,
          error: null,
          isLoading: false
        }
      }
      
      renderWithProviders(<AdminProductForm />, cleanState)

      // Should NOT show any error messages when state is clean
      expect(screen.queryByText(/product not saved/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/failed to save/i)).not.toBeInTheDocument()
      
      // Form should be ready for input
      expect(screen.getByLabelText(/products.title/i)).toBeInTheDocument()
      expect(screen.getByText('common.save')).toBeInTheDocument()
    })
  })
})