import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/config'

// Async thunks
export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (orderData, { rejectWithValue, getState }) => {
    try {
      console.log('Sending order data:', JSON.stringify(orderData, null, 2))
      
      // Check if user is authenticated
      const state = getState()
      const isAuthenticated = state.auth.isAuthenticated
      const endpoint = isAuthenticated ? '/api/orders/registered' : '/api/orders'
      
      const response = await api.post(endpoint, orderData)
      return response.data
    } catch (error) {
      console.error('Order creation error:', error.response?.data)
      
      // If CSRF token error, try refreshing token and retry once
      if (error.response?.data?.error?.code === 'CSRF_TOKEN_MISMATCH') {
        try {
          const { default: csrfService } = await import('../../services/csrf.js')
          await csrfService.fetchToken()
          console.log('Retrying order creation after CSRF refresh...')
          // Retry the request
          const state = getState()
          const isAuthenticated = state.auth.isAuthenticated
          const endpoint = isAuthenticated ? '/api/orders/registered' : '/api/orders'
          const retryResponse = await api.post(endpoint, orderData)
          return retryResponse.data
        } catch (retryError) {
          console.error('Order creation retry failed:', retryError.response?.data)
          return rejectWithValue(retryError.response?.data?.error?.message || retryError.message)
        }
      }
      
      return rejectWithValue(error.response?.data?.error?.message || error.message)
    }
  }
)

export const fetchUserOrders = createAsyncThunk(
  'orders/fetchUserOrders',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      console.log('Fetching user orders with token:', token ? 'present' : 'missing')
      const response = await api.get('/api/orders', {
        headers: { Authorization: `Bearer ${token}` }
      })
      console.log('Orders API response:', response.data)
      return response.data
    } catch (error) {
      console.error('Fetch orders error:', error)
      return rejectWithValue(
        error.response?.data?.error?.message || 
        error.response?.data?.message || 
        error.message || 
        'Failed to fetch orders'
      )
    }
  }
)

export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      return response.data
    } catch (error) {
      console.error('Fetch order error:', error)
      return rejectWithValue(
        error.response?.data?.error?.message || 
        error.response?.data?.message || 
        error.message || 
        'Failed to fetch order'
      )
    }
  }
)

const ordersSlice = createSlice({
  name: 'orders',
  initialState: {
    orders: [],
    currentOrder: null,
    isLoading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    clearCurrentOrder: (state) => {
      state.currentOrder = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Create order
      .addCase(createOrder.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createOrder.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentOrder = action.payload.order
        state.orders.unshift(action.payload.order)
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      // Fetch user orders
      .addCase(fetchUserOrders.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchUserOrders.fulfilled, (state, action) => {
        state.isLoading = false
        state.orders = action.payload.data.orders
      })
      .addCase(fetchUserOrders.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload || 'Failed to fetch orders'
      })
      // Fetch order by ID
      .addCase(fetchOrderById.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentOrder = action.payload.data.order
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload || 'Failed to fetch order'
      })
  }
})

export const { clearError, clearCurrentOrder } = ordersSlice.actions
export default ordersSlice.reducer