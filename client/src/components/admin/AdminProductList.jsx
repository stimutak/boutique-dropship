import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import PriceDisplay from '../PriceDisplay'
import { setFilters, setSortBy, setCurrentPageNumber } from '../../store/slices/adminSlice'
import { fetchAdminProducts, deleteProduct } from '../../store/slices/adminProductsSlice'

const AdminProductList = () => {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  
  const { items: products, totalItems, isLoading, error, pagination } = useSelector(state => state.adminProducts)
  const { filters, sortBy, sortOrder, currentPage, itemsPerPage } = useSelector(state => state.admin.products)
  
  const [localFilters, setLocalFilters] = useState(filters)

  // Calculate pagination
  const totalPages = pagination?.totalPages || Math.ceil(totalItems / itemsPerPage)
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  // Fetch products when filters or pagination change
  useEffect(() => {
    const fetchParams = {
      page: currentPage,
      limit: itemsPerPage,
      ...localFilters,
      sort: sortBy
    }
    dispatch(fetchAdminProducts(fetchParams))
  }, [dispatch, currentPage, itemsPerPage, localFilters, sortBy])

  // Handle filter changes
  const handleFilterChange = (filterKey, value) => {
    const newFilters = { ...localFilters, [filterKey]: value }
    if (!value) {
      delete newFilters[filterKey]
    }
    setLocalFilters(newFilters)
    dispatch(setFilters({ section: 'products', filters: newFilters }))
  }

  // Handle sorting
  const handleSort = (column) => {
    const newSortOrder = sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc'
    dispatch(setSortBy({ section: 'products', sortBy: column, sortOrder: newSortOrder }))
  }

  // Handle pagination
  const handlePageChange = (page) => {
    dispatch(setCurrentPageNumber({ section: 'products', page }))
  }

  // Handle product deletion
  const handleDelete = async (productId) => {
    if (window.confirm(t('admin.products.confirmDelete'))) {
      try {
        await dispatch(deleteProduct(productId)).unwrap()
        // Refresh the product list after deletion
        const fetchParams = {
          page: currentPage,
          limit: itemsPerPage,
          ...localFilters,
          sort: sortBy
        }
        dispatch(fetchAdminProducts(fetchParams))
      } catch (error) {
        console.error('Failed to delete product:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="admin-products-loading">
        <p>{t('common.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="admin-products-error">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="admin-products-list">
      {/* Header */}
      <div className="admin-products-header">
        <h1>{t('admin.products.title')}</h1>
        <Link to="/admin/products/new" className="btn btn-primary">
          {t('admin.products.add')}
        </Link>
      </div>

      {/* Filters */}
      <div className="admin-products-filters">
        <div className="filter-group">
          <label htmlFor="category-filter">{t('products.categories.all')}</label>
          <select
            id="category-filter"
            value={localFilters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="">{t('products.categories.all')}</option>
            <option value="crystals">{t('products.categories.crystals')}</option>
            <option value="herbs">{t('products.categories.herbs')}</option>
            <option value="oils">{t('products.categories.oils')}</option>
            <option value="books">{t('products.categories.books')}</option>
            <option value="accessories">{t('products.categories.accessories')}</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="status-filter">{t('admin.products.status')}</label>
          <select
            id="status-filter"
            value={localFilters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">{t('admin.common.viewAll')}</option>
            <option value="active">{t('admin.products.active')}</option>
            <option value="inactive">{t('admin.products.inactive')}</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="admin-products-table-container">
        <table className="admin-products-table">
          <thead>
            <tr>
              <th>{t('Image')}</th>
              <th>
                <button 
                  className="sort-button"
                  onClick={() => handleSort('name')}
                  aria-label="Sort by name"
                >
                  {t('products.title')}
                  {sortBy === 'name' && (
                    <span className={`sort-indicator ${sortOrder}`}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  className="sort-button"
                  onClick={() => handleSort('category')}
                  aria-label="Sort by category"
                >
                  Category
                  {sortBy === 'category' && (
                    <span className={`sort-indicator ${sortOrder}`}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>
              <th>
                <button 
                  className="sort-button"
                  onClick={() => handleSort('price')}
                  aria-label="Sort by price"
                >
                  {t('products.price')}
                  {sortBy === 'price' && (
                    <span className={`sort-indicator ${sortOrder}`}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>
              <th>{t('admin.products.status')}</th>
              <th>{t('admin.common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product._id}>
                <td>
                  <div className="product-image">
                    {product.images && product.images.length > 0 ? (
                      <img 
                        src={product.images.find(img => img.isPrimary)?.url || product.images[0].url}
                        alt={product.images.find(img => img.isPrimary)?.alt || product.name}
                        className="product-thumbnail"
                        style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ) : (
                      <div 
                        className="no-image-placeholder"
                        style={{ 
                          width: '50px', 
                          height: '50px', 
                          backgroundColor: '#f5f5f5', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: '#999'
                        }}
                      >
                        No Image
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <div className="product-info">
                    <span className="product-name">{product.name}</span>
                    <small className="product-slug">{product.slug}</small>
                  </div>
                </td>
                <td>{product.category}</td>
                <td>
                  <PriceDisplay 
                    price={product.price}
                    currency={product.currency}
                    displayPrice={product.displayPrice}
                  />
                </td>
                <td>
                  <span className={`status-badge ${product.isActive ? 'active' : 'inactive'}`}>
                    {product.isActive ? t('admin.products.active') : t('admin.products.inactive')}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <Link 
                      to={`/admin/products/${product._id}/edit`}
                      className="btn btn-sm btn-secondary"
                    >
                      {t('common.edit')}
                    </Link>
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(product._id)}
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="admin-pagination">
          <div className="pagination-info">
            {t('Showing')} {startItem}-{endItem} {t('of')} {totalItems} {t('products')}
          </div>
          
          <div className="pagination-controls">
            <button
              className="btn btn-sm"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              {t('common.back')}
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`btn btn-sm ${page === currentPage ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
              >
                {page}
              </button>
            ))}
            
            <button
              className="btn btn-sm"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              {t('common.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminProductList