import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/config'

// Async thunks
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/cart')
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || error.message || 'Failed to fetch cart')
    }
  }
)

export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async ({ productId, quantity = 1 }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/cart/add', { productId, quantity })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || error.message || 'Failed to add item to cart')
    }
  }
)

export const updateCartItem = createAsyncThunk(
  'cart/updateCartItem',
  async ({ productId, quantity }, { rejectWithValue }) => {
    try {
      const response = await api.put('/api/cart/update', { productId, quantity })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || error.message || 'Failed to update cart item')
    }
  }
)

export const removeFromCart = createAsyncThunk(
  'cart/removeFromCart',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await api.delete('/api/cart/remove', { data: { productId } })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || error.message || 'Failed to remove item from cart')
    }
  }
)

export const clearCart = createAsyncThunk(
  'cart/clearCart',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.delete('/api/cart/clear')
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || error.message || 'Failed to clear cart')
    }
  }
)

export const mergeGuestCart = createAsyncThunk(
  'cart/mergeGuestCart',
  async (guestCart, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/cart/merge', { guestCart })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || error.message || 'Failed to merge cart')
    }
  }
)

// Load cart from localStorage for guest users
const loadCartFromStorage = () => {
  try {
    const savedCart = localStorage.getItem('guestCart')
    if (savedCart) {
      const cart = JSON.parse(savedCart)
      return {
        items: cart.items || [],
        totalItems: cart.totalItems || 0,
        totalPrice: cart.totalPrice || 0,
        isLoading: false,
        error: null,
      }
    }
  } catch (error) {
    console.error('Error loading cart from localStorage:', error)
  }
  return {
    items: [],
    totalItems: 0,
    totalPrice: 0,
    isLoading: false,
    error: null,
  }
}

// Save cart to localStorage for guest users
const saveCartToStorage = (state) => {
  try {
    const cartData = {
      items: state.items,
      totalItems: state.totalItems,
      totalPrice: state.totalPrice
    }
    localStorage.setItem('guestCart', JSON.stringify(cartData))
  } catch (error) {
    console.error('Error saving cart to localStorage:', error)
  }
}

const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    totalItems: 0,
    totalPrice: 0,
    isLoading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    // Local cart management for guest users
    addItemLocally: (state, action) => {
      const { product, quantity } = action.payload
      const existingItem = state.items.find(item => item.product._id === product._id)
      
      if (existingItem) {
        existingItem.quantity += quantity
      } else {
        state.items.push({ product, quantity })
      }
      
      state.totalItems = state.items.reduce((total, item) => total + item.quantity, 0)
      state.totalPrice = state.items.reduce((total, item) => total + (item.product.price * item.quantity), 0)
      saveCartToStorage(state)
    },
    updateItemLocally: (state, action) => {
      const { productId, quantity } = action.payload
      const item = state.items.find(item => item.product._id === productId)
      
      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter(item => item.product._id !== productId)
        } else {
          item.quantity = quantity
        }
      }
      
      state.totalItems = state.items.reduce((total, item) => total + item.quantity, 0)
      state.totalPrice = state.items.reduce((total, item) => total + (item.product.price * item.quantity), 0)
      saveCartToStorage(state)
    },
    removeItemLocally: (state, action) => {
      const productId = action.payload
      state.items = state.items.filter(item => item.product._id !== productId)
      state.totalItems = state.items.reduce((total, item) => total + item.quantity, 0)
      state.totalPrice = state.items.reduce((total, item) => total + (item.product.price * item.quantity), 0)
      saveCartToStorage(state)
    },
    clearCartLocally: (state) => {
      state.items = []
      state.totalItems = 0
      state.totalPrice = 0
      localStorage.removeItem('guestCart')
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch cart
      .addCase(fetchCart.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.isLoading = false
        const cart = action.payload.data?.cart || action.payload
        state.items = cart.items || []
        state.totalItems = cart.itemCount || 0
        state.totalPrice = cart.total || 0
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      // Add to cart
      .addCase(addToCart.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.isLoading = false
        const cart = action.payload.data?.cart || action.payload
        state.items = cart.items || []
        state.totalItems = cart.itemCount || 0
        state.totalPrice = cart.total || 0
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      // Update cart item
      .addCase(updateCartItem.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.isLoading = false
        const cart = action.payload.data?.cart || action.payload
        state.items = cart.items || []
        state.totalItems = cart.itemCount || 0
        state.totalPrice = cart.total || 0
        // Save to localStorage for guest users
        saveCartToStorage(state)
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      // Remove from cart
      .addCase(removeFromCart.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.isLoading = false
        const cart = action.payload.data?.cart || action.payload
        state.items = cart.items || []
        state.totalItems = cart.itemCount || 0
        state.totalPrice = cart.total || 0
        // Save to localStorage for guest users
        saveCartToStorage(state)
      })
      .addCase(removeFromCart.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      // Clear cart
      .addCase(clearCart.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(clearCart.fulfilled, (state) => {
        state.isLoading = false
        state.items = []
        state.totalItems = 0
        state.totalPrice = 0
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      // Merge guest cart
      .addCase(mergeGuestCart.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(mergeGuestCart.fulfilled, (state, action) => {
        state.isLoading = false
        const cart = action.payload.data?.cart || action.payload
        state.items = cart.items || []
        state.totalItems = cart.itemCount || 0
        state.totalPrice = cart.total || 0
        // Clear guest cart from localStorage after successful merge
        localStorage.removeItem('guestCart')
      })
      .addCase(mergeGuestCart.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
  }
})

export const { 
  clearError, 
  addItemLocally, 
  updateItemLocally, 
  removeItemLocally, 
  clearCartLocally 
} = cartSlice.actions
export default cartSlice.reducer