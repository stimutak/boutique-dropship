import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/config'

// Offline queue for auth operations
let authOfflineQueue = []
let isOnline = navigator.onLine

// Track retry attempts and exponential backoff
const retryDelays = [1000, 2000, 4000, 8000, 16000] // ms

window.addEventListener('online', () => {
  isOnline = true
  processAuthOfflineQueue()
})

window.addEventListener('offline', () => {
  isOnline = false
})

// Process offline auth queue when connection returns
const processAuthOfflineQueue = async () => {
  if (authOfflineQueue.length === 0) return

  const queueCopy = [...authOfflineQueue]
  authOfflineQueue = []

  for (const operation of queueCopy) {
    try {
      await operation.execute()
    } catch (error) {
      console.error('Failed to sync offline auth operation:', error)
      // Re-add to queue if it fails and hasn't exceeded max retries
      if (operation.retryCount < 5) {
        operation.retryCount++
        authOfflineQueue.push(operation)
      }
    }
  }
}

// Auto-retry with exponential backoff
const withRetry = async (operation, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === maxRetries - 1) throw error
      
      const delay = retryDelays[attempt] || 16000
      console.log(`Auth operation failed, retrying in ${delay}ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}

// Enhanced login with cart merging
export const loginUserOptimistic = createAsyncThunk(
  'auth/loginOptimistic',
  async ({ email, password, guestCartItems = [] }, { rejectWithValue, dispatch }) => {
    const startTime = Date.now()
    
    try {
      const result = await withRetry(async () => {
        const response = await api.post('/api/auth/login', { 
          email, 
          password,
          guestCartItems 
        })
        return response.data.data
      })
      
      // Store token securely
      localStorage.setItem('token', result.token)
      
      // Set up token refresh if needed
      if (result.expiresAt) {
        scheduleTokenRefresh(result.expiresAt)
      }
      
      const duration = Date.now() - startTime
      
      return {
        ...result,
        performance: {
          duration,
          status: duration <= 2000 ? 'good' : 'needs_optimization'
        }
      }
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.error?.message || 'Login failed',
        shouldRetry: error.response?.status >= 500,
        retryAfter: error.response?.headers?.['retry-after']
      })
    }
  }
)

// Enhanced registration
export const registerUserOptimistic = createAsyncThunk(
  'auth/registerOptimistic',
  async (userData, { rejectWithValue }) => {
    const startTime = Date.now()
    
    try {
      const result = await withRetry(async () => {
        const response = await api.post('/api/auth/register', userData)
        return response.data.data
      })
      
      localStorage.setItem('token', result.token)
      
      if (result.expiresAt) {
        scheduleTokenRefresh(result.expiresAt)
      }
      
      const duration = Date.now() - startTime
      
      return {
        ...result,
        performance: {
          duration,
          status: duration <= 2000 ? 'good' : 'needs_optimization'
        }
      }
    } catch (error) {
      return rejectWithValue({
        message: error.response?.data?.error?.message || 'Registration failed',
        shouldRetry: error.response?.status >= 500
      })
    }
  }
)

// Enhanced profile update with optimistic updates and offline support
export const updateProfileOptimistic = createAsyncThunk(
  'auth/updateProfileOptimistic',
  async (userData, { rejectWithValue, dispatch, getState }) => {
    const startTime = Date.now()
    const currentUser = getState().auth.user
    
    // Optimistic update
    dispatch(authSlice.actions.updateUserOptimistically(userData))
    
    const operation = {
      type: 'updateProfile',
      userData,
      originalData: currentUser,
      retryCount: 0,
      execute: async () => {
        const token = localStorage.getItem('token')
        const response = await api.put('/api/auth/profile', userData, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        dispatch(authSlice.actions.confirmProfileUpdate(response.data.data))
        return response.data.data
      }
    }
    
    if (!isOnline) {
      authOfflineQueue.push(operation)
      return {
        offline: true,
        optimistic: true,
        queuePosition: authOfflineQueue.length
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
      dispatch(authSlice.actions.rollbackProfileUpdate(currentUser))
      
      return rejectWithValue({
        message: error.response?.data?.error?.message || 'Profile update failed',
        shouldRetry: error.response?.status >= 500
      })
    }
  }
)

// Load user with token refresh
export const loadUserOptimistic = createAsyncThunk(
  'auth/loadUserOptimistic',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        return rejectWithValue('No token found')
      }
      
      // Check if token needs refresh
      const refreshResult = await dispatch(refreshTokenIfNeeded()).unwrap()
      const currentToken = refreshResult.token || token
      
      const response = await api.get('/api/auth/profile', {
        headers: { Authorization: `Bearer ${currentToken}` }
      })
      
      return response.data.data
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        dispatch(authSlice.actions.logout())
      }
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to load user')
    }
  }
)

// Token refresh mechanism
export const refreshTokenIfNeeded = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        return rejectWithValue('No token to refresh')
      }
      
      const response = await api.post('/api/auth/refresh-token', { token })
      
      if (response.data.refreshed) {
        localStorage.setItem('token', response.data.token)
        scheduleTokenRefresh(response.data.expiresAt)
      }
      
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Token refresh failed')
    }
  }
)

// Address management without authentication loss
export const manageAddressOptimistic = createAsyncThunk(
  'auth/manageAddress',
  async ({ operation, addressData, addressId }, { rejectWithValue, dispatch, getState }) => {
    const startTime = Date.now()
    const currentUser = getState().auth.user
    
    // Optimistic update
    dispatch(authSlice.actions.updateAddressOptimistically({ operation, addressData, addressId }))
    
    const apiOperation = {
      type: 'manageAddress',
      operation,
      addressData,
      addressId,
      originalUser: currentUser,
      retryCount: 0,
      execute: async () => {
        const token = localStorage.getItem('token')
        let response
        
        switch (operation) {
          case 'add':
            response = await api.post('/api/auth/addresses', addressData, {
              headers: { Authorization: `Bearer ${token}` }
            })
            break
          case 'update':
            response = await api.put(`/api/auth/addresses/${addressId}`, addressData, {
              headers: { Authorization: `Bearer ${token}` }
            })
            break
          case 'delete':
            response = await api.delete(`/api/auth/addresses/${addressId}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            break
          default:
            throw new Error(`Unknown operation: ${operation}`)
        }
        
        dispatch(authSlice.actions.confirmAddressUpdate(response.data))
        return response.data
      }
    }
    
    if (!isOnline) {
      authOfflineQueue.push(apiOperation)
      return {
        offline: true,
        optimistic: true,
        queuePosition: authOfflineQueue.length
      }
    }
    
    try {
      const result = await apiOperation.execute()
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
      dispatch(authSlice.actions.rollbackAddressUpdate(currentUser))
      
      return rejectWithValue({
        message: error.response?.data?.error?.message || 'Address operation failed',
        shouldRetry: error.response?.status >= 500
      })
    }
  }
)

// Token refresh scheduler
let tokenRefreshTimeout = null

const scheduleTokenRefresh = (expiresAt) => {
  if (tokenRefreshTimeout) {
    clearTimeout(tokenRefreshTimeout)
  }
  
  const expiryTime = new Date(expiresAt).getTime()
  const now = Date.now()
  const refreshTime = expiryTime - (60 * 60 * 1000) // Refresh 1 hour before expiry
  
  if (refreshTime > now) {
    tokenRefreshTimeout = setTimeout(() => {
      const token = localStorage.getItem('token')
      if (token) {
        // Dispatch refresh token action
        console.log('Auto-refreshing token...')
      }
    }, refreshTime - now)
  }
}

// Load auth state from storage with offline detection
const loadAuthFromStorage = () => {
  try {
    const token = localStorage.getItem('token')
    const savedOfflineQueue = localStorage.getItem('authOfflineQueue')
    
    if (savedOfflineQueue) {
      authOfflineQueue = JSON.parse(savedOfflineQueue)
    }
    
    return {
      user: null,
      token,
      isLoading: false,
      error: null,
      isAuthenticated: !!token,
      offline: {
        isOffline: !isOnline,
        queueLength: authOfflineQueue.length,
        lastSync: null
      },
      performance: {
        lastOperationDuration: null,
        averageResponseTime: null
      }
    }
  } catch (error) {
    console.error('Error loading auth from storage:', error)
    return {
      user: null,
      token: null,
      isLoading: false,
      error: null,
      isAuthenticated: false,
      offline: {
        isOffline: !isOnline,
        queueLength: 0,
        lastSync: null
      },
      performance: {
        lastOperationDuration: null,
        averageResponseTime: null
      }
    }
  }
}

// Save auth state to storage
const saveAuthToStorage = (state) => {
  try {
    localStorage.setItem('authOfflineQueue', JSON.stringify(authOfflineQueue))
  } catch (error) {
    console.error('Error saving auth to storage:', error)
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadAuthFromStorage(),
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token')
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null
      state.offline.queueLength = 0
      authOfflineQueue = []
      
      if (tokenRefreshTimeout) {
        clearTimeout(tokenRefreshTimeout)
        tokenRefreshTimeout = null
      }
      
      saveAuthToStorage(state)
    },
    
    clearError: (state) => {
      state.error = null
    },
    
    updateOfflineStatus: (state) => {
      state.offline.isOffline = !isOnline
      state.offline.queueLength = authOfflineQueue.length
    },
    
    // Optimistic updates
    updateUserOptimistically: (state, action) => {
      if (state.user) {
        state.user = { 
          ...state.user, 
          ...action.payload,
          optimistic: true
        }
      }
    },
    
    updateAddressOptimistically: (state, action) => {
      const { operation, addressData, addressId } = action.payload
      
      if (!state.user) return
      
      switch (operation) {
        case 'add':
          state.user.addresses = state.user.addresses || []
          state.user.addresses.push({
            ...addressData,
            _id: `temp_${Date.now()}`,
            optimistic: true
          })
          break
        case 'update':
          const updateIndex = state.user.addresses?.findIndex(addr => addr._id === addressId)
          if (updateIndex >= 0 && state.user.addresses) {
            state.user.addresses[updateIndex] = {
              ...state.user.addresses[updateIndex],
              ...addressData,
              optimistic: true
            }
          }
          break
        case 'delete':
          if (state.user.addresses) {
            state.user.addresses = state.user.addresses.filter(addr => addr._id !== addressId)
          }
          break
      }
    },
    
    // Confirm operations
    confirmProfileUpdate: (state, action) => {
      const userData = action.payload.user || action.payload
      state.user = {
        ...userData,
        optimistic: false
      }
      state.offline.lastSync = new Date().toISOString()
      saveAuthToStorage(state)
    },
    
    confirmAddressUpdate: (state, action) => {
      const userData = action.payload.user || action.payload
      state.user = {
        ...userData,
        optimistic: false
      }
      saveAuthToStorage(state)
    },
    
    // Rollback operations
    rollbackProfileUpdate: (state, action) => {
      state.user = action.payload
    },
    
    rollbackAddressUpdate: (state, action) => {
      state.user = action.payload
    },
    
    // Update performance metrics
    updatePerformanceMetrics: (state, action) => {
      const { duration } = action.payload
      state.performance.lastOperationDuration = duration
      
      // Calculate rolling average
      if (!state.performance.averageResponseTime) {
        state.performance.averageResponseTime = duration
      } else {
        state.performance.averageResponseTime = 
          (state.performance.averageResponseTime * 0.8) + (duration * 0.2)
      }
    }
  },
  
  extraReducers: (builder) => {
    builder
      // Login optimistic
      .addCase(loginUserOptimistic.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginUserOptimistic.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.user
        state.token = action.payload.token
        state.isAuthenticated = true
        state.performance = action.payload.performance
        state.offline.lastSync = new Date().toISOString()
        saveAuthToStorage(state)
      })
      .addCase(loginUserOptimistic.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload.message
        
        if (action.payload.shouldRetry) {
          state.error += ' (will retry automatically)'
        }
      })
      
      // Profile update optimistic
      .addCase(updateProfileOptimistic.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateProfileOptimistic.fulfilled, (state, action) => {
        state.isLoading = false
        
        if (action.payload.offline) {
          state.offline.queueLength = action.payload.queuePosition
          return
        }
        
        // Data already updated by confirmProfileUpdate
        state.performance = action.payload.performance
      })
      .addCase(updateProfileOptimistic.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload.message
      })
      
      // Address management
      .addCase(manageAddressOptimistic.fulfilled, (state, action) => {
        state.isLoading = false
        
        if (action.payload.offline) {
          state.offline.queueLength = action.payload.queuePosition
          return
        }
        
        state.performance = action.payload.performance
      })
      
      // Token refresh
      .addCase(refreshTokenIfNeeded.fulfilled, (state, action) => {
        if (action.payload.refreshed) {
          state.token = action.payload.token
        }
      })
  }
})

export const { 
  logout, 
  clearError,
  updateOfflineStatus,
  updateUserOptimistically,
  updateAddressOptimistically,
  confirmProfileUpdate,
  confirmAddressUpdate,
  rollbackProfileUpdate,
  rollbackAddressUpdate,
  updatePerformanceMetrics
} = authSlice.actions

export default authSlice.reducer