import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import Home from '../../pages/Home'
import productsReducer from '../../store/slices/productsSlice'

const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
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

describe('Home Page', () => {
  test('renders hero section', () => {
    renderWithProviders(<Home />)
    
    expect(screen.getByText('Welcome to Holistic Store')).toBeInTheDocument()
    expect(screen.getByText('Discover spiritual and wellness products to enhance your journey')).toBeInTheDocument()
    expect(screen.getByText('Shop Now')).toBeInTheDocument()
  })

  test('renders category cards', () => {
    renderWithProviders(<Home />)
    
    expect(screen.getByText('Shop by Category')).toBeInTheDocument()
    expect(screen.getByText('Crystals')).toBeInTheDocument()
    expect(screen.getByText('Herbs')).toBeInTheDocument()
    expect(screen.getByText('Essential Oils')).toBeInTheDocument()
    expect(screen.getByText('Supplements')).toBeInTheDocument()
    expect(screen.getByText('Books')).toBeInTheDocument()
    expect(screen.getByText('Accessories')).toBeInTheDocument()
  })

  test('renders featured products section with products', () => {
    const initialState = {
      products: {
        products: [
          {
            _id: '1',
            name: 'Test Crystal',
            slug: 'test-crystal',
            price: 29.99,
            images: ['test-image.jpg']
          }
        ],
        isLoading: false,
        error: null,
        pagination: {},
        categories: [],
        filters: {},
        currentProduct: null,
        searchResults: []
      }
    }
    
    renderWithProviders(<Home />, initialState)
    
    expect(screen.getByText('Featured Products')).toBeInTheDocument()
    // Note: The component makes an API call on mount, so we just test the section exists
  })

  test('shows loading state', () => {
    const initialState = {
      products: {
        products: [],
        isLoading: true,
        error: null
      }
    }
    
    renderWithProviders(<Home />, initialState)
    
    expect(screen.getByText('Loading products...')).toBeInTheDocument()
  })
})