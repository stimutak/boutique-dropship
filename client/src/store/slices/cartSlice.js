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
      return rejectWithValue(error.response.data.error.message)
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
      return rejectWithValue(error.response.data.error.message)
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
      return rejectWithValue(error.response.data.error.message)
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
      return rejectWithValue(error.response.data.error.message)
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
      return rejectWithValue(error.response.data.error.message)
    }
  }
)

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
    },
    removeItemLocally: (state, action) => {
      const productId = action.payload
      state.items = state.items.filter(item => item.product._id !== productId)
      state.totalItems = state.items.reduce((total, item) => total + item.quantity, 0)
      state.totalPrice = state.items.reduce((total, item) => total + (item.product.price * item.quantity), 0)
    },
    clearCartLocally: (state) => {
      state.items = []
      state.totalItems = 0
      state.totalPrice = 0
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
        state.items = action.payload.items || []
        state.totalItems = action.payload.totalItems || 0
        state.totalPrice = action.payload.totalPrice || 0
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
        state.items = action.payload.items
        state.totalItems = action.payload.totalItems
        state.totalPrice = action.payload.totalPrice
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
        state.items = action.payload.items
        state.totalItems = action.payload.totalItems
        state.totalPrice = action.payload.totalPrice
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
        state.items = action.payload.items
        state.totalItems = action.payload.totalItems
        state.totalPrice = action.payload.totalPrice
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