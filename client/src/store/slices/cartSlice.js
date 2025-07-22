import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/config'

// Async thunks
export const fetchCart = createAsyncThunk(
  'cart/fetchCart',
  async (_, { rejectWithValue }) => {
    try {
      // Ensure guest session exists for non-authenticated users
      ensureGuestSession()
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
      // Ensure guest session exists for non-authenticated users
      ensureGuestSession()
      const response = await api.post('/api/cart/add', { productId, quantity })
      return response.data
    } catch (error) {
      // If CSRF token error, try refreshing token and retry once
      if (error.response?.data?.error?.code === 'CSRF_TOKEN_MISMATCH') {
        try {
          const { default: csrfService } = await import('../../services/csrf.js')
          await csrfService.fetchToken()
          // Retry the request
          const retryResponse = await api.post('/api/cart/add', { productId, quantity })
          return retryResponse.data
        } catch (retryError) {
          return rejectWithValue(retryError.response?.data?.error?.message || retryError.message || 'Failed to add item to cart')
        }
      }
      return rejectWithValue(error.response?.data?.error?.message || error.message || 'Failed to add item to cart')
    }
  }
)

export const updateCartItem = createAsyncThunk(
  'cart/updateCartItem',
  async ({ productId, quantity }, { rejectWithValue }) => {
    try {
      // Ensure guest session exists for non-authenticated users
      ensureGuestSession()
      const response = await api.put('/api/cart/update', { productId, quantity })
      return response.data
    } catch (error) {
      // If CSRF token error, try refreshing token and retry once
      if (error.response?.data?.error?.code === 'CSRF_TOKEN_MISMATCH') {
        try {
          const { default: csrfService } = await import('../../services/csrf.js')
          await csrfService.fetchToken()
          // Retry the request
          const retryResponse = await api.put('/api/cart/update', { productId, quantity })
          return retryResponse.data
        } catch (retryError) {
          return rejectWithValue(retryError.response?.data?.error?.message || retryError.message || 'Failed to update cart item')
        }
      }
      return rejectWithValue(error.response?.data?.error?.message || error.message || 'Failed to update cart item')
    }
  }
)

export const removeFromCart = createAsyncThunk(
  'cart/removeFromCart',
  async (productId, { rejectWithValue }) => {
    try {
      // Ensure guest session exists for non-authenticated users
      ensureGuestSession()
      const response = await api.delete('/api/cart/remove', { data: { productId } })
      return response.data
    } catch (error) {
      // If CSRF token error, try refreshing token and retry once
      if (error.response?.data?.error?.code === 'CSRF_TOKEN_MISMATCH') {
        try {
          const { default: csrfService } = await import('../../services/csrf.js')
          await csrfService.fetchToken()
          // Retry the request
          const retryResponse = await api.delete('/api/cart/remove', { data: { productId } })
          return retryResponse.data
        } catch (retryError) {
          return rejectWithValue(retryError.response?.data?.error?.message || retryError.message || 'Failed to remove item from cart')
        }
      }
      return rejectWithValue(error.response?.data?.error?.message || error.message || 'Failed to remove item from cart')
    }
  }
)

export const clearCart = createAsyncThunk(
  'cart/clearCart',
  async (_, { rejectWithValue }) => {
    try {
      // Ensure guest session exists for non-authenticated users
      ensureGuestSession()
      const response = await api.delete('/api/cart/clear')
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || error.message || 'Failed to clear cart')
    }
  }
)

// Hard reset for debugging - clears everything
export const hardResetCart = createAsyncThunk(
  'cart/hardResetCart',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      // Clear session storage
      window.sessionStorage.removeItem('guestSessionId')
      window.sessionStorage.removeItem('justLoggedOut')
      
      // Create new session
      ensureGuestSession()
      
      // Clear cart on server
      const response = await api.delete('/api/cart/clear')
      
      // Also dispatch local clear
      dispatch(clearAfterMerge())
      
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || error.message || 'Failed to reset cart')
    }
  }
)

export const mergeGuestCart = createAsyncThunk(
  'cart/mergeGuestCart',
  async ({ guestCartItems, sessionId }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/cart/merge', { 
        guestCartItems, 
        sessionId 
      })
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || error.message || 'Failed to merge cart')
    }
  }
)

// Get session ID for guest cart tracking
const getSessionId = () => {
  // Use a combination of timestamp and random string for session ID
  // This will be managed by the backend session system
  if (!window.sessionStorage.getItem('guestSessionId')) {
    const sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    window.sessionStorage.setItem('guestSessionId', sessionId)
  }
  return window.sessionStorage.getItem('guestSessionId')
}

// Ensure guest session ID exists before cart operations
const ensureGuestSession = () => {
  return getSessionId()
}

// Get current guest cart items for merging
const getGuestCartForMerge = (state) => {
  return {
    guestCartItems: state.items.map(item => ({
      productId: item.product._id,
      quantity: item.quantity
    })),
    sessionId: getSessionId()
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
    pendingMerge: null,
    syncStatus: 'idle', // 'idle', 'syncing', 'synced', 'error'
  },
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    // Prepare cart for merge on authentication
    prepareCartForMerge: (state) => {
      state.pendingMerge = getGuestCartForMerge(state)
    },
    // Clear cart after successful merge or logout
    clearAfterMerge: (state) => {
      state.items = []
      state.totalItems = 0
      state.totalPrice = 0
      state.pendingMerge = null
      state.syncStatus = 'idle'
      state.error = null
      // Clear session storage to prevent duplicate merges
      window.sessionStorage.removeItem('guestSessionId')
    },
    // Set cart synchronization status
    setSyncStatus: (state, action) => {
      state.syncStatus = action.payload
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
        state.syncStatus = 'synced'
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
        state.syncStatus = 'error'
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
        state.syncStatus = 'synced'
      })
      .addCase(removeFromCart.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
        state.syncStatus = 'error'
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
        state.syncStatus = 'synced'
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
        state.syncStatus = 'error'
      })
      // Hard reset cart
      .addCase(hardResetCart.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(hardResetCart.fulfilled, (state) => {
        state.isLoading = false
        state.items = []
        state.totalItems = 0
        state.totalPrice = 0
        state.pendingMerge = null
        state.syncStatus = 'idle'
        state.error = null
      })
      .addCase(hardResetCart.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
        state.syncStatus = 'error'
      })
      // Merge guest cart
      .addCase(mergeGuestCart.pending, (state) => {
        state.isLoading = true
        state.error = null
        state.syncStatus = 'syncing'
      })
      .addCase(mergeGuestCart.fulfilled, (state, action) => {
        state.isLoading = false
        const cart = action.payload.data?.cart || action.payload
        state.items = cart.items || []
        state.totalItems = cart.itemCount || 0
        state.totalPrice = cart.total || 0
        state.syncStatus = 'synced'
        // Clear pending merge data and session storage
        state.pendingMerge = null
        window.sessionStorage.removeItem('guestSessionId')
      })
      .addCase(mergeGuestCart.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
        state.syncStatus = 'error'
      })
  }
})

export const { 
  clearError, 
  prepareCartForMerge, 
  clearAfterMerge, 
  setSyncStatus 
} = cartSlice.actions

// hardResetCart is already exported above as a thunk
export default cartSlice.reducer