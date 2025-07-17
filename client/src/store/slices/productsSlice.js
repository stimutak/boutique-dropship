import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/config'

// Async thunks
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async ({ page = 1, limit = 12, category, search, sort } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams()
      params.append('page', page)
      params.append('limit', limit)
      if (category) params.append('category', category)
      if (search) params.append('search', search)
      if (sort) params.append('sort', sort)
      
      console.log('Fetching products from:', `/api/products?${params}`)
      const response = await api.get(`/api/products?${params}`)
      console.log('Products API response:', response.data)
      return response.data
    } catch (error) {
      console.error('Products API error:', error)
      return rejectWithValue(error.response?.data?.error?.message || error.message)
    }
  }
)

export const fetchProductBySlug = createAsyncThunk(
  'products/fetchProductBySlug',
  async (slug, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/products/${slug}`)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response.data.error.message)
    }
  }
)

export const searchProducts = createAsyncThunk(
  'products/searchProducts',
  async (searchTerm, { rejectWithValue }) => {
    try {
      const response = await api.get(`/api/products/search?q=${encodeURIComponent(searchTerm)}`)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response.data.error.message)
    }
  }
)

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    products: [],
    currentProduct: null,
    searchResults: [],
    categories: [
      'crystals',
      'herbs',
      'essential-oils',
      'supplements',
      'books',
      'accessories'
    ],
    isLoading: false,
    error: null,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalProducts: 0,
      hasNextPage: false,
      hasPrevPage: false
    },
    filters: {
      category: '',
      search: '',
      sort: 'name'
    }
  },
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    clearCurrentProduct: (state) => {
      state.currentProduct = null
    },
    clearSearchResults: (state) => {
      state.searchResults = []
    },
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch products
      .addCase(fetchProducts.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.isLoading = false
        state.products = action.payload.data.products
        state.pagination = action.payload.data.pagination
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      // Fetch product by slug
      .addCase(fetchProductBySlug.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchProductBySlug.fulfilled, (state, action) => {
        state.isLoading = false
        state.currentProduct = action.payload.data.product
      })
      .addCase(fetchProductBySlug.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      // Search products
      .addCase(searchProducts.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(searchProducts.fulfilled, (state, action) => {
        state.isLoading = false
        state.searchResults = action.payload.data.products
      })
      .addCase(searchProducts.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
  }
})

export const { setFilters, clearCurrentProduct, clearSearchResults, clearError } = productsSlice.actions
export default productsSlice.reducer