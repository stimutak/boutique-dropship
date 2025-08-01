import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/config'

// Async thunks for admin product operations
export const fetchAdminProducts = createAsyncThunk(
  'adminProducts/fetchAdminProducts',
  async (params = {}, { rejectWithValue }) => {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        category,
        status = 'all',
        sort = 'newest'
      } = params

      const searchParams = new URLSearchParams()
      searchParams.append('page', page)
      searchParams.append('limit', limit)
      if (search) searchParams.append('search', search)
      if (category) searchParams.append('category', category)
      searchParams.append('status', status)
      searchParams.append('sort', sort)

      const response = await api.get(`/api/admin/products?${searchParams}`)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || error.message)
    }
  }
)

export const createProduct = createAsyncThunk(
  'adminProducts/createProduct',
  async (productData, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/admin/products', productData)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || error.message)
    }
  }
)

export const updateProduct = createAsyncThunk(
  'adminProducts/updateProduct',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/api/admin/products/${id}`, data)
      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || error.message)
    }
  }
)

export const deleteProduct = createAsyncThunk(
  'adminProducts/deleteProduct',
  async (productId, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/api/admin/products/${productId}`)
      return { productId, ...response.data }
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || error.message)
    }
  }
)

export const bulkImportProducts = createAsyncThunk(
  'adminProducts/bulkImportProducts',
  async (csvFile, { rejectWithValue, dispatch }) => {
    try {
      const formData = new FormData()
      formData.append('csvFile', csvFile)

      const response = await api.post('/api/admin/products/bulk-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          dispatch(setImportProgress(progress))
        }
      })

      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || error.message)
    }
  }
)

export const exportProducts = createAsyncThunk(
  'adminProducts/exportProducts',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const searchParams = new URLSearchParams()
      if (filters.category) searchParams.append('category', filters.category)
      if (filters.status) searchParams.append('status', filters.status)

      const response = await api.get(`/api/admin/products/export?${searchParams}`, {
        responseType: 'blob'
      })

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition']
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
        : `products-export-${Date.now()}.csv`

      return {
        success: true,
        filename,
        data: response.data
      }
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || error.message)
    }
  }
)

export const uploadProductImages = createAsyncThunk(
  'adminProducts/uploadProductImages',
  async (files, { rejectWithValue, dispatch }) => {
    try {
      const formData = new FormData()
      files.forEach((file, index) => {
        formData.append(`images`, file)
      })

      const response = await api.post('/api/admin/products/images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          dispatch(setUploadProgress(progress))
        }
      })

      return response.data
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || error.message)
    }
  }
)

const adminProductsSlice = createSlice({
  name: 'adminProducts',
  initialState: {
    items: [],
    totalItems: 0,
    isLoading: false,
    error: null,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false
    },
    bulkOperations: {
      importing: false,
      exporting: false,
      importProgress: 0,
      exportProgress: 0,
      importResults: null,
      exportResults: null
    },
    uploadedImages: [],
    uploadProgress: 0
  },
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    clearBulkResults: (state) => {
      state.bulkOperations.importResults = null
      state.bulkOperations.exportResults = null
    },
    setImportProgress: (state, action) => {
      state.bulkOperations.importProgress = action.payload
    },
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload
    },
    clearUploadedImages: (state) => {
      state.uploadedImages = []
      state.uploadProgress = 0
    },
    // Test helper - not used in production
    setTestData: (state, action) => {
      state.items = action.payload
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch admin products
      .addCase(fetchAdminProducts.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(fetchAdminProducts.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = action.payload.data.products
        state.totalItems = action.payload.data.pagination.totalProducts
        state.pagination = {
          currentPage: action.payload.data.pagination.currentPage,
          totalPages: action.payload.data.pagination.totalPages,
          hasNextPage: action.payload.data.pagination.hasNextPage,
          hasPrevPage: action.payload.data.pagination.hasPrevPage
        }
      })
      .addCase(fetchAdminProducts.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      
      // Create product
      .addCase(createProduct.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.isLoading = false
        state.items.unshift(action.payload.data.product)
        state.totalItems += 1
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      
      // Update product
      .addCase(updateProduct.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.isLoading = false
        const index = state.items.findIndex(item => item._id === action.payload.data.product._id)
        if (index !== -1) {
          state.items[index] = action.payload.data.product
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      
      // Delete product
      .addCase(deleteProduct.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.isLoading = false
        state.items = state.items.filter(item => item._id !== action.payload.productId)
        state.totalItems -= 1
      })
      .addCase(deleteProduct.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload
      })
      
      // Bulk import
      .addCase(bulkImportProducts.pending, (state) => {
        state.bulkOperations.importing = true
        state.bulkOperations.importProgress = 0
        state.error = null
      })
      .addCase(bulkImportProducts.fulfilled, (state, action) => {
        state.bulkOperations.importing = false
        state.bulkOperations.importProgress = 100
        state.bulkOperations.importResults = action.payload
      })
      .addCase(bulkImportProducts.rejected, (state, action) => {
        state.bulkOperations.importing = false
        state.bulkOperations.importProgress = 0
        state.error = action.payload
      })
      
      // Export products
      .addCase(exportProducts.pending, (state) => {
        state.bulkOperations.exporting = true
        state.error = null
      })
      .addCase(exportProducts.fulfilled, (state, action) => {
        state.bulkOperations.exporting = false
        state.bulkOperations.exportResults = action.payload
      })
      .addCase(exportProducts.rejected, (state, action) => {
        state.bulkOperations.exporting = false
        state.error = action.payload
      })
      
      // Upload images
      .addCase(uploadProductImages.pending, (state) => {
        state.isLoading = true
        state.uploadProgress = 0
        state.error = null
      })
      .addCase(uploadProductImages.fulfilled, (state, action) => {
        state.isLoading = false
        state.uploadProgress = 100
        state.uploadedImages = action.payload.images
      })
      .addCase(uploadProductImages.rejected, (state, action) => {
        state.isLoading = false
        state.uploadProgress = 0
        state.error = action.payload
      })
  }
})

export const { 
  clearError, 
  clearBulkResults, 
  setImportProgress, 
  setUploadProgress,
  clearUploadedImages 
} = adminProductsSlice.actions

export default adminProductsSlice.reducer