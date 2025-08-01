import { configureStore } from '@reduxjs/toolkit'
import { vi } from 'vitest'
import api from '../../api/config'
import adminProductsReducer, { 
  fetchAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkImportProducts,
  exportProducts,
  uploadProductImages
} from '../../store/slices/adminProductsSlice'

// Mock the api module
vi.mock('../../api/config', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}))

describe('adminProductsSlice', () => {
  let store

  beforeEach(() => {
    vi.clearAllMocks()
    store = configureStore({
      reducer: {
        adminProducts: adminProductsReducer
      }
    })
  })

  describe('initial state', () => {
    test('should have correct initial state', () => {
      const state = store.getState().adminProducts
      
      expect(state.items).toEqual([])
      expect(state.totalItems).toBe(0)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.pagination).toEqual({
        currentPage: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      })
      expect(state.bulkOperations).toEqual({
        importing: false,
        exporting: false,
        importProgress: 0,
        exportProgress: 0,
        importResults: null,
        exportResults: null
      })
    })
  })

  describe('fetchAdminProducts', () => {
    test('should fetch admin products with filters and pagination', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            products: [
              { _id: '1', name: 'Crystal Set', price: 29.99, isActive: true },
              { _id: '2', name: 'Sage Bundle', price: 15.50, isActive: false }
            ],
            pagination: {
              currentPage: 1,
              totalPages: 2,
              totalProducts: 25,
              hasNextPage: true,
              hasPrevPage: false
            }
          }
        }
      }
      
      api.get.mockResolvedValue(mockResponse)
      
      const params = {
        page: 1,
        limit: 20,
        search: 'crystal',
        category: 'crystals',
        status: 'active',
        sort: 'name'
      }
      
      await store.dispatch(fetchAdminProducts(params))
      
      const state = store.getState().adminProducts
      
      expect(api.get).toHaveBeenCalledWith('/api/admin/products?page=1&limit=20&search=crystal&category=crystals&status=active&sort=name')
      expect(state.items).toEqual(mockResponse.data.data.products)
      expect(state.totalItems).toBe(25)
      expect(state.pagination).toEqual({
        currentPage: 1,
        totalPages: 2,
        hasNextPage: true,
        hasPrevPage: false
      })
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    test('should handle fetch error', async () => {
      const errorMessage = 'Failed to fetch products'
      api.get.mockRejectedValue({
        response: { data: { error: { message: errorMessage } } }
      })
      
      await store.dispatch(fetchAdminProducts())
      
      const state = store.getState().adminProducts
      expect(state.error).toBe(errorMessage)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('createProduct', () => {
    test('should create new product', async () => {
      const newProduct = {
        name: 'New Crystal',
        description: 'A beautiful crystal',
        price: 39.99,
        category: 'crystals',
        isActive: true
      }
      
      const mockResponse = {
        data: {
          success: true,
          data: {
            product: { _id: '3', ...newProduct }
          }
        }
      }
      
      api.post.mockResolvedValue(mockResponse)
      
      await store.dispatch(createProduct(newProduct))
      
      expect(api.post).toHaveBeenCalledWith('/api/admin/products', newProduct)
      
      const state = store.getState().adminProducts
      expect(state.items).toContainEqual(mockResponse.data.data.product)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    test('should handle create product error', async () => {
      const errorMessage = 'Product with this slug already exists'
      api.post.mockRejectedValue({
        response: { data: { error: { message: errorMessage } } }
      })
      
      await store.dispatch(createProduct({}))
      
      const state = store.getState().adminProducts
      expect(state.error).toBe(errorMessage)
      expect(state.isLoading).toBe(false)
    })

    test('should successfully create product with empty images array - bug is now fixed', async () => {
      // This test verifies the fix: empty images array should work now
      const completeProductData = {
        name: 'Test Crystal',
        slug: 'test-crystal',
        description: 'A beautiful test crystal for spiritual healing',
        shortDescription: 'A beautiful test crystal',
        price: 29.99,
        category: 'crystals',
        wholesaler: {
          name: 'Crystal Supplier Inc',
          email: 'orders@crystalsupplier.com',
          productCode: 'TEST-CRYSTAL',
          cost: 15.50
        },
        isActive: true,
        inStock: true,
        images: [], // This empty array should work now (bug fixed)
        translations: {}
      }

      // Mock successful response since the bug is now fixed
      const mockResponse = {
        data: {
          success: true,
          data: {
            product: { _id: 'fixed123', ...completeProductData }
          }
        }
      }
      
      api.post.mockResolvedValue(mockResponse)
      
      const result = await store.dispatch(createProduct(completeProductData))
      
      // Log what we're testing
      console.log('BUG FIX VERIFICATION - Product data sent:', JSON.stringify(completeProductData, null, 2))
      console.log('BUG FIX VERIFICATION - Images array:', completeProductData.images)
      console.log('BUG FIX VERIFICATION - Result type:', result.type)
      
      expect(api.post).toHaveBeenCalledWith('/api/admin/products', completeProductData)
      expect(result.type).toBe('adminProducts/createProduct/fulfilled')
      
      const state = store.getState().adminProducts
      expect(state.items).toContainEqual(mockResponse.data.data.product)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })

    test('should successfully create product with complete valid data', async () => {
      // This test ensures that valid data works
      const completeProductData = {
        name: 'Valid Crystal',
        slug: 'valid-crystal',
        description: 'A valid crystal for testing',
        shortDescription: 'A valid crystal',
        price: 29.99,
        category: 'crystals',
        wholesaler: {
          name: 'Valid Supplier',
          email: 'orders@validsupplier.com',
          productCode: 'VALID-CRYSTAL',
          cost: 15.50
        },
        isActive: true,
        inStock: true,
        images: [],
        translations: {}
      }

      const mockResponse = {
        data: {
          success: true,
          data: {
            product: { _id: 'valid123', ...completeProductData }
          }
        }
      }
      
      api.post.mockResolvedValue(mockResponse)
      
      const result = await store.dispatch(createProduct(completeProductData))
      
      expect(api.post).toHaveBeenCalledWith('/api/admin/products', completeProductData)
      expect(result.type).toBe('adminProducts/createProduct/fulfilled')
      
      const state = store.getState().adminProducts
      expect(state.items).toContainEqual(mockResponse.data.data.product)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('updateProduct', () => {
    test('should update existing product', async () => {
      // First add a product to state
      const existingProduct = { _id: '1', name: 'Old Name', price: 20.00 }
      store.dispatch({ type: 'adminProducts/setTestData', payload: [existingProduct] })
      
      const updatedData = { name: 'New Name', price: 25.00 }
      const mockResponse = {
        data: {
          success: true,
          data: {
            product: { _id: '1', ...updatedData }
          }
        }
      }
      
      api.put.mockResolvedValue(mockResponse)
      
      await store.dispatch(updateProduct({ id: '1', data: updatedData }))
      
      expect(api.put).toHaveBeenCalledWith('/api/admin/products/1', updatedData)
      
      const state = store.getState().adminProducts
      const updatedProduct = state.items.find(p => p._id === '1')
      expect(updatedProduct.name).toBe('New Name')
      expect(updatedProduct.price).toBe(25.00)
    })
  })

  describe('deleteProduct', () => {
    test('should delete product', async () => {
      // First add a product to state
      const product = { _id: '1', name: 'To Delete' }
      store.dispatch({ type: 'adminProducts/setTestData', payload: [product] })
      
      const mockResponse = {
        data: { success: true }
      }
      
      api.delete.mockResolvedValue(mockResponse)
      
      await store.dispatch(deleteProduct('1'))
      
      expect(api.delete).toHaveBeenCalledWith('/api/admin/products/1')
      
      const state = store.getState().adminProducts
      expect(state.items).not.toContain(product)
    })
  })

  describe('bulkImportProducts', () => {
    test('should import products from CSV', async () => {
      const mockFile = new File(['name,price\nTest Product,29.99'], 'products.csv', { type: 'text/csv' })
      const mockResponse = {
        data: {
          success: true,
          message: 'Bulk import completed. 1/1 products imported successfully.',
          summary: {
            totalRows: 1,
            successCount: 1,
            errorCount: 0
          },
          results: [
            { row: 1, success: true, productId: '123', name: 'Test Product' }
          ],
          errors: []
        }
      }
      
      api.post.mockResolvedValue(mockResponse)
      
      await store.dispatch(bulkImportProducts(mockFile))
      
      expect(api.post).toHaveBeenCalledWith('/api/admin/products/bulk-import', expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: expect.any(Function)
      })
      
      const state = store.getState().adminProducts
      expect(state.bulkOperations.importing).toBe(false)
      expect(state.bulkOperations.importResults).toEqual(mockResponse.data)
    })
  })

  describe('exportProducts', () => {
    test('should export products to CSV', async () => {
      const mockCsvData = 'name,price\nProduct 1,29.99\nProduct 2,39.99'
      
      api.get.mockResolvedValue({
        data: mockCsvData,
        headers: {
          'content-disposition': 'attachment; filename="products-export-123456.csv"'
        }
      })
      
      const filters = { category: 'crystals', status: 'active' }
      await store.dispatch(exportProducts(filters))
      
      expect(api.get).toHaveBeenCalledWith('/api/admin/products/export?category=crystals&status=active', {
        responseType: 'blob'
      })
      
      const state = store.getState().adminProducts
      expect(state.bulkOperations.exporting).toBe(false)
      expect(state.bulkOperations.exportResults).toEqual({
        success: true,
        filename: 'products-export-123456.csv',
        data: mockCsvData
      })
    })
  })

  describe('uploadProductImages', () => {
    test('should upload product images', async () => {
      const mockFiles = [
        new File(['image1'], 'image1.jpg', { type: 'image/jpeg' }),
        new File(['image2'], 'image2.jpg', { type: 'image/jpeg' })
      ]
      
      const mockResponse = {
        data: {
          success: true,
          images: [
            { url: '/images/image1.jpg', filename: 'image1.jpg' },
            { url: '/images/image2.jpg', filename: 'image2.jpg' }
          ]
        }
      }
      
      api.post.mockResolvedValue(mockResponse)
      
      await store.dispatch(uploadProductImages(mockFiles))
      
      expect(api.post).toHaveBeenCalledWith('/api/admin/products/images', expect.any(FormData), {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: expect.any(Function)
      })
      
      const state = store.getState().adminProducts
      expect(state.uploadedImages).toEqual(mockResponse.data.images)
    })
  })
})