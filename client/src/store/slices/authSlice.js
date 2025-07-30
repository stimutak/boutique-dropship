import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/config'

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/auth/login', { 
        email, 
        password
      })
      // Store token in localStorage for now (will move to HTTP-only cookies later)
      const token = response.data.data?.token || response.data.token
      if (token) {
        localStorage.setItem('token', token)
      }
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Login failed')
    }
  }
)

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/auth/register', userData)
      // Store token in localStorage for now (will move to HTTP-only cookies later)
      const token = response.data.data?.token || response.data.token
      if (token) {
        localStorage.setItem('token', token)
      }
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Registration failed')
    }
  }
)

export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        return rejectWithValue('No token found')
      }
      
      const response = await api.get('/api/auth/profile')
      return response.data
    } catch (error) {
      // Only remove token if it's actually invalid (401), not for other errors
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
      }
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to load user')
    }
  }
)

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await api.put('/api/auth/profile', userData)
      // Return the updated user data without affecting authentication
      return response.data
    } catch (error) {
      // Don't remove token on profile update errors - this was causing the re-login loop
      return rejectWithValue(error.response?.data?.error?.message || 'Profile update failed')
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: localStorage.getItem('token'),
    isLoading: false,
    error: null,
    isAuthenticated: false,
  },
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token')
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.error = null
      // Set logout flag to prevent cart merge on next login
      window.sessionStorage.setItem('justLoggedOut', 'true')
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.data?.user || action.payload.user
        state.token = action.payload.data?.token || action.payload.token
        state.isAuthenticated = true
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = action.payload.data?.user || action.payload.user
        state.token = action.payload.data?.token || action.payload.token
        state.isAuthenticated = true
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      // Load user
      .addCase(loadUser.pending, (state) => {
        state.isLoading = true
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.isLoading = false
        // Extract user from the response structure
        state.user = action.payload.data?.user || action.payload.user || action.payload
        state.isAuthenticated = true
      })
      .addCase(loadUser.rejected, (state, action) => {
        state.isLoading = false
        state.token = null
        state.isAuthenticated = false
      })
      // Update profile
      .addCase(updateProfile.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.isLoading = false
        // Handle nested response structure
        const userData = action.payload.data?.user || action.payload.user || action.payload
        state.user = userData
        // Keep authentication state - don't force re-login
        state.isAuthenticated = true
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
  },
})

export const { logout, clearError } = authSlice.actions
export default authSlice.reducer