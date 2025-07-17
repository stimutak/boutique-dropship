import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { configureStore } from '@reduxjs/toolkit'
import Header from '../../components/Layout/Header'
import authReducer from '../../store/slices/authSlice'
import cartReducer from '../../store/slices/cartSlice'
import productsReducer from '../../store/slices/productsSlice'

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

describe('Header Component', () => {
  test('renders logo and navigation links', () => {
    renderWithProviders(<Header />)
    
    expect(screen.getByText('Holistic Store')).toBeInTheDocument()
    expect(screen.getByText('Products')).toBeInTheDocument()
    expect(screen.getByText('Cart')).toBeInTheDocument()
    expect(screen.getByText('Login')).toBeInTheDocument()
    expect(screen.getByText('Register')).toBeInTheDocument()
  })

  test('shows cart item count when items are present', () => {
    const initialState = {
      cart: {
        totalItems: 3,
        items: [],
        totalPrice: 0,
        isLoading: false,
        error: null
      }
    }
    
    renderWithProviders(<Header />, initialState)
    
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  test('shows user menu when authenticated', () => {
    const initialState = {
      auth: {
        isAuthenticated: true,
        user: { firstName: 'John', lastName: 'Doe' },
        token: 'test-token',
        isLoading: false,
        error: null
      }
    }
    
    renderWithProviders(<Header />, initialState)
    
    expect(screen.getByText('John ▼')).toBeInTheDocument()
    expect(screen.queryByText('Login')).not.toBeInTheDocument()
    expect(screen.queryByText('Register')).not.toBeInTheDocument()
  })

  test('search form submits with search term', () => {
    renderWithProviders(<Header />)
    
    const searchInput = screen.getByPlaceholderText('Search products...')
    const searchButton = screen.getByText('Search')
    
    fireEvent.change(searchInput, { target: { value: 'crystals' } })
    fireEvent.click(searchButton)
    
    // The search should clear the input
    expect(searchInput.value).toBe('')
  })
})