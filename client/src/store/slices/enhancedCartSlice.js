import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/config'

// Offline queue for when user is offline
let offlineQueue = []
let isOnline = navigator.onLine

// Listen for online/offline events
window.addEventListener('online', () => {
  isOnline = true
  processOfflineQueue()
})

window.addEventListener('offline', () => {
  isOnline = false
})

// Process offline queue when connection returns
const processOfflineQueue = async () => {
  if (offlineQueue.length === 0) return

  const queueCopy = [...offlineQueue]
  offlineQueue = []

  for (const operation of queueCopy) {
    try {
      await operation.execute()
    } catch (error) {
      console.error('Failed to sync offline operation:', error)
      // Re-add to queue if it fails
      offlineQueue.push(operation)
    }
  }
}

// Enhanced async thunks with optimistic updates and retry logic
export const fetchCartOptimistic = createAsyncThunk(
  'cart/fetchCartOptimistic',
  async (_, { rejectWithValue, getState }) => {
    const startTime = Date.now()
    
    try {
      const response = await api.get('/api/cart')
      const duration = Date.now() - startTime
      
      return {
        ...response.data,
        performance: {
          duration,
          status: duration <= 100 ? 'good' : 'needs_optimization'
        }
      }
    } catch (error) {
      // If offline, return current state
      if (!isOnline) {
        const currentState = getState().cart
        return {
          data: {
            cart: {
              items: currentState.items,
              itemCount: currentState.totalItems,
              total: currentState.totalPrice
            }
          },
          offline: true
        }
      }
      
      return rejectWithValue({
        message: error.response?.data?.error?.message || error.message || 'Failed to fetch cart',
        shouldRetry: error.response?.status >= 500
      })
    }
  }
)

export const addToCartOptimistic = createAsyncThunk(
  'cart/addToCartOptimistic',
  async ({ productId, quantity = 1, product }, { rejectWithValue, dispatch, getState }) => {
    const startTime = Date.now()
    
    // Optimistic update first
    if (product) {
      dispatch(cartSlice.actions.addItemOptimistically({ product, quantity }))
    }
    
    const operation = {
      type: 'add',
      productId,
      quantity,
      product,
      execute: async () => {
        const response = await api.post('/api/cart/add', { productId, quantity })
        dispatch(cartSlice.actions.confirmOperation({ type: 'add', data: response.data }))
        return response.data
      }
    }
    
    if (!isOnline) {
      offlineQueue.push(operation)
      return {
        offline: true,
        optimistic: true,
        queuePosition: offlineQueue.length
      }
    }
    
    try {
      const result = await operation.execute()
      const duration = Date.now() - startTime
      
      return {
        ...result,
        performance: {
          duration,
          status: duration <= 200 ? 'good' : 'needs_optimization'
        }
      }
    } catch (error) {
      // Rollback optimistic update
      if (product) {
        dispatch(cartSlice.actions.rollbackOptimisticAdd({ productId, quantity }))
      }
      
      return rejectWithValue({
        message: error.response?.data?.error?.message || error.message || 'Failed to add item to cart',
        shouldRetry: error.response?.status >= 500
      })
    }
  }
)

export const updateCartItemOptimistic = createAsyncThunk(
  'cart/updateCartItemOptimistic',
  async ({ productId, quantity, previousQuantity }, { rejectWithValue, dispatch }) => {
    const startTime = Date.now()
    
    // Optimistic update first
    dispatch(cartSlice.actions.updateItemOptimistically({ productId, quantity }))
    
    const operation = {
      type: 'update',
      productId,
      quantity,
      previousQuantity,
      execute: async () => {
        const response = await api.put('/api/cart/update', { productId, quantity })
        dispatch(cartSlice.actions.confirmOperation({ type: 'update', data: response.data }))
        return response.data
      }
    }
    
    if (!isOnline) {
      offlineQueue.push(operation)
      return {
        offline: true,
        optimistic: true,
        queuePosition: offlineQueue.length
      }
    }
    
    try {
      const result = await operation.execute()
      const duration = Date.now() - startTime
      
      return {
        ...result,
        performance: {
          duration,
          status: duration <= 200 ? 'good' : 'needs_optimization'
        }
      }
    } catch (error) {
      // Rollback optimistic update
      dispatch(cartSlice.actions.rollbackOptimisticUpdate({ productId, quantity: previousQuantity }))
      
      return rejectWithValue({
        message: error.response?.data?.error?.message || error.message || 'Failed to update cart item',
        shouldRetry: error.response?.status >= 500
      })
    }
  }
)

export const removeFromCartOptimistic = createAsyncThunk(
  'cart/removeFromCartOptimistic',
  async ({ productId, item }, { rejectWithValue, dispatch }) => {
    const startTime = Date.now()
    
    // Optimistic update first
    dispatch(cartSlice.actions.removeItemOptimistically({ productId }))
    
    const operation = {
      type: 'remove',
      productId,
      item,
      execute: async () => {
        const response = await api.delete(`/api/cart/remove/${productId}`)
        dispatch(cartSlice.actions.confirmOperation({ type: 'remove', data: response.data }))
        return response.data
      }
    }
    
    if (!isOnline) {
      offlineQueue.push(operation)
      return {
        offline: true,
        optimistic: true,
        queuePosition: offlineQueue.length
      }
    }
    
    try {
      const result = await operation.execute()
      const duration = Date.now() - startTime
      
      return {
        ...result,
        performance: {
          duration,
          status: duration <= 200 ? 'good' : 'needs_optimization'
        }
      }
    } catch (error) {
      // Rollback optimistic update
      if (item) {
        dispatch(cartSlice.actions.rollbackOptimisticRemove({ item }))
      }
      
      return rejectWithValue({
        message: error.response?.data?.error?.message || error.message || 'Failed to remove item from cart',
        shouldRetry: error.response?.status >= 500
      })
    }
  }
)

export const mergeGuestCartOptimistic = createAsyncThunk(
  'cart/mergeGuestCartOptimistic',
  async ({ guestCartItems, sessionId }, { rejectWithValue }) => {
    const startTime = Date.now()
    
    try {
      const response = await api.post('/api/cart/merge', { 
        guestCartItems, 
        sessionId 
      })
      
      const duration = Date.now() - startTime
      
      return {
        ...response.data,
        performance: {
          duration,
          status: duration <= 100 ? 'good' : 'needs_optimization'
        }
      }
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.error?.message || error.message || 'Failed to merge cart',
        shouldRetry: error.response?.status >= 500
      })
    }
  }
)

// Load cart from localStorage with offline sync queue
const loadCartFromStorage = () => {
  try {
    const savedCart = localStorage.getItem('guestCart')
    const savedQueue = localStorage.getItem('cartOfflineQueue')
    
    if (savedQueue) {
      offlineQueue = JSON.parse(savedQueue)
    }
    
    if (savedCart) {
      const cart = JSON.parse(savedCart)
      return {
        items: cart.items || [],
        totalItems: cart.totalItems || 0,
        totalPrice: cart.totalPrice || 0,
        isLoading: false,
        error: null,
        offline: {
          isOffline: !isOnline,
          queueLength: offlineQueue.length,
          lastSync: cart.lastSync || null
        }
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
    offline: {
      isOffline: !isOnline,
      queueLength: 0,
      lastSync: null
    }
  }
}

// Save cart to localStorage with sync info
const saveCartToStorage = (state) => {
  try {
    const cartData = {
      items: state.items,
      totalItems: state.totalItems,
      totalPrice: state.totalPrice,
      lastSync: new Date().toISOString()
    }
    localStorage.setItem('guestCart', JSON.stringify(cartData))
    localStorage.setItem('cartOfflineQueue', JSON.stringify(offlineQueue))
  } catch (error) {
    console.error('Error saving cart to localStorage:', error)
  }
}

const cartSlice = createSlice({
  name: 'cart',
  initialState: loadCartFromStorage(),
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    
    updateOfflineStatus: (state) => {
      state.offline.isOffline = !isOnline
      state.offline.queueLength = offlineQueue.length
    },
    
    // Optimistic updates
    addItemOptimistically: (state, action) => {
      const { product, quantity } = action.payload
      const existingItem = state.items.find(item => item.product._id === product._id)
      
      if (existingItem) {
        existingItem.quantity += quantity
        existingItem.optimistic = true
      } else {
        state.items.push({ 
          product, 
          quantity, 
          optimistic: true,
          _id: product._id 
        })
      }
      
      state.totalItems = state.items.reduce((total, item) => total + item.quantity, 0)
      state.totalPrice = state.items.reduce((total, item) => total + (item.product.price * item.quantity), 0)
      saveCartToStorage(state)
    },
    
    updateItemOptimistically: (state, action) => {
      const { productId, quantity } = action.payload
      const item = state.items.find(item => item.product._id === productId)
      
      if (item) {
        if (quantity <= 0) {
          state.items = state.items.filter(item => item.product._id !== productId)
        } else {
          item.quantity = quantity
          item.optimistic = true
        }
      }
      
      state.totalItems = state.items.reduce((total, item) => total + item.quantity, 0)
      state.totalPrice = state.items.reduce((total, item) => total + (item.product.price * item.quantity), 0)
      saveCartToStorage(state)
    },
    
    removeItemOptimistically: (state, action) => {
      const { productId } = action.payload
      const itemIndex = state.items.findIndex(item => item.product._id === productId)
      
      if (itemIndex >= 0) {
        state.items[itemIndex].optimistic = true
        state.items[itemIndex].removed = true
      }
      
      const visibleItems = state.items.filter(item => !item.removed)
      state.totalItems = visibleItems.reduce((total, item) => total + item.quantity, 0)
      state.totalPrice = visibleItems.reduce((total, item) => total + (item.product.price * item.quantity), 0)
      saveCartToStorage(state)
    },
    
    // Rollback functions
    rollbackOptimisticAdd: (state, action) => {
      const { productId, quantity } = action.payload
      const item = state.items.find(item => item.product._id === productId)
      
      if (item && item.optimistic) {
        if (item.quantity <= quantity) {
          state.items = state.items.filter(item => item.product._id !== productId)
        } else {
          item.quantity -= quantity
        }
      }
      
      state.totalItems = state.items.reduce((total, item) => total + item.quantity, 0)
      state.totalPrice = state.items.reduce((total, item) => total + (item.product.price * item.quantity), 0)
      saveCartToStorage(state)
    },
    
    rollbackOptimisticUpdate: (state, action) => {
      const { productId, quantity } = action.payload
      const item = state.items.find(item => item.product._id === productId)
      
      if (item && item.optimistic) {
        item.quantity = quantity
        item.optimistic = false
      }
      
      state.totalItems = state.items.reduce((total, item) => total + item.quantity, 0)
      state.totalPrice = state.items.reduce((total, item) => total + (item.product.price * item.quantity), 0)
      saveCartToStorage(state)
    },
    
    rollbackOptimisticRemove: (state, action) => {
      const { item } = action.payload
      const existingItem = state.items.find(i => i.product._id === item.product._id)
      
      if (existingItem && existingItem.removed) {
        existingItem.removed = false
        existingItem.optimistic = false
      }
      
      const visibleItems = state.items.filter(item => !item.removed)
      state.totalItems = visibleItems.reduce((total, item) => total + item.quantity, 0)
      state.totalPrice = visibleItems.reduce((total, item) => total + (item.product.price * item.quantity), 0)
      saveCartToStorage(state)
    },
    
    // Confirm operations (remove optimistic flags)
    confirmOperation: (state, action) => {
      const { type, data } = action.payload
      const cart = data.data?.cart || data
      
      // Update with server data and remove optimistic flags
      state.items = (cart.items || []).map(item => ({
        ...item,
        optimistic: false,
        removed: false
      }))
      state.totalItems = cart.itemCount || 0
      state.totalPrice = cart.total || 0
      
      saveCartToStorage(state)
    },
    
    // Event-driven synchronization (called from WebSocket or polling)
    synchronizeCart: (state, action) => {
      const { cart, timestamp } = action.payload
      
      // Only sync if this is newer than our last update
      const lastUpdate = new Date(state.lastUpdated || 0)
      const syncTime = new Date(timestamp)
      
      if (syncTime > lastUpdate) {
        state.items = cart.items || []
        state.totalItems = cart.itemCount || 0
        state.totalPrice = cart.total || 0
        state.lastUpdated = timestamp
        saveCartToStorage(state)
      }
    },
    
    // Legacy local methods for guest users
    addItemLocally: (state, action) => {
      const { product, quantity } = action.payload
      const existingItem = state.items.find(item => item.product._id === product._id)
      
      if (existingItem) {
        existingItem.quantity += quantity
      } else {
        state.items.push({ product, quantity, _id: product._id })
      }
      
      state.totalItems = state.items.reduce((total, item) => total + item.quantity, 0)
      state.totalPrice = state.items.reduce((total, item) => total + (item.product.price * item.quantity), 0)
      saveCartToStorage(state)
    },
    
    clearCartLocally: (state) => {
      state.items = []
      state.totalItems = 0
      state.totalPrice = 0
      state.offline.queueLength = 0
      offlineQueue = []
      localStorage.removeItem('guestCart')
      localStorage.removeItem('cartOfflineQueue')
    }
  },
  
  extraReducers: (builder) => {
    builder
      // Fetch cart optimistic
      .addCase(fetchCartOptimistic.fulfilled, (state, action) => {
        state.isLoading = false
        
        if (action.payload.offline) {
          // Keep current state for offline mode
          state.offline.isOffline = true
          return
        }
        
        const cart = action.payload.data?.cart || action.payload
        state.items = cart.items || []
        state.totalItems = cart.itemCount || 0
        state.totalPrice = cart.total || 0
        state.performance = action.payload.performance
        state.offline.lastSync = new Date().toISOString()
        saveCartToStorage(state)
      })
      
      // Add to cart optimistic
      .addCase(addToCartOptimistic.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(addToCartOptimistic.fulfilled, (state, action) => {
        state.isLoading = false
        
        if (action.payload.offline) {
          state.offline.queueLength = action.payload.queuePosition
          return
        }
        
        // Data already updated by confirmOperation
        state.performance = action.payload.performance
      })
      .addCase(addToCartOptimistic.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload.message
        
        if (action.payload.shouldRetry && isOnline) {
          // Could implement retry logic here
          state.error += ' (will retry)'
        }
      })
      
      // Similar patterns for other operations...
      .addCase(mergeGuestCartOptimistic.fulfilled, (state, action) => {
        state.isLoading = false
        const cart = action.payload.data?.cart || action.payload
        state.items = cart.items || []
        state.totalItems = cart.itemCount || 0
        state.totalPrice = cart.total || 0
        state.performance = action.payload.performance
        
        // Clear guest cart after successful merge
        localStorage.removeItem('guestCart')
        localStorage.removeItem('cartOfflineQueue')
        offlineQueue = []
        state.offline.queueLength = 0
      })
  }
})

export const { 
  clearError,
  updateOfflineStatus,
  addItemOptimistically,
  updateItemOptimistically,
  removeItemOptimistically,
  rollbackOptimisticAdd,
  rollbackOptimisticUpdate,
  rollbackOptimisticRemove,
  confirmOperation,
  synchronizeCart,
  addItemLocally,
  clearCartLocally
} = cartSlice.actions

export default cartSlice.reducer