import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSearchParams, Link } from 'react-router-dom'
import { fetchProducts, setFilters } from '../store/slices/productsSlice'
import { addToCart } from '../store/slices/cartSlice'
import PriceDisplay from '../components/PriceDisplay'
import ReviewSummary from '../components/reviews/ReviewSummary'

const Products = () => {
  const dispatch = useDispatch()
  const [searchParams, setSearchParams] = useSearchParams()
  const { products, isLoading, pagination, categories, filters } = useSelector(state => state.products)
  const { isAuthenticated } = useSelector(state => state.auth)
  
  const [localFilters, setLocalFilters] = useState({
    category: searchParams.get('category') || '',
    search: searchParams.get('search') || '',
    sort: searchParams.get('sort') || 'name'
  })

  useEffect(() => {
    const params = {
      page: parseInt(searchParams.get('page')) || 1,
      category: searchParams.get('category') || '',
      search: searchParams.get('search') || '',
      sort: searchParams.get('sort') || 'name'
    }
    
    dispatch(setFilters(params))
    dispatch(fetchProducts(params))
  }, [dispatch, searchParams])

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value }
    setLocalFilters(newFilters)
    
    const newParams = new URLSearchParams()
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) newParams.set(k, v)
    })
    setSearchParams(newParams)
  }

  const handleAddToCart = (product) => {
    // Always use API endpoints - backend handles both authenticated and guest carts
    dispatch(addToCart({ productId: product._id, quantity: 1 }))
  }

  const handlePageChange = (page) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('page', page.toString())
    setSearchParams(newParams)
  }

  return (
    <div className="products-page">
      <div className="container">
        <h1>Products</h1>
        
        {/* Filters */}
        <div className="filters">
          <div className="filter-group">
            <label>Category:</label>
            <select 
              value={localFilters.category} 
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Sort by:</label>
            <select 
              value={localFilters.sort} 
              onChange={(e) => handleFilterChange('sort', e.target.value)}
            >
              <option value="name">Name</option>
              <option value="price">Price: Low to High</option>
              <option value="-price">Price: High to Low</option>
              <option value="-createdAt">Newest First</option>
            </select>
          </div>
          
          <div className="filter-group">
            <input
              type="text"
              placeholder="Search products..."
              value={localFilters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="loading">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="no-products">
            <p>No products found.</p>
          </div>
        ) : (
          <>
            <div className="products-grid grid grid-4">
              {products.map(product => (
                <div key={product._id} className="product-card">
                  <Link to={`/products/${product.slug}`}>
                    <div className="product-image">
                      {product.images && product.images.length > 0 ? (
                        <img src={product.images[0].url} alt={product.images[0].alt || product.name} />
                      ) : (
                        <div className="placeholder-image">No Image</div>
                      )}
                    </div>
                  </Link>
                  
                  <div className="product-info">
                    <Link to={`/products/${product.slug}`}>
                      <h3>{product.name}</h3>
                    </Link>
                    <PriceDisplay 
                      price={product.priceInCurrency || product.price} 
                      displayPrice={product.displayPrice}
                      currency={product.displayCurrency}
                    />
                    <p className="category">{product.category}</p>
                    
                    {/* Review Summary */}
                    {product.reviewStats && (
                      <ReviewSummary 
                        averageRating={product.reviewStats.averageRating}
                        totalReviews={product.reviewStats.totalReviews}
                        size="small"
                      />
                    )}
                    
                    {/* Spiritual Properties */}
                    {product.properties && (
                      <div className="spiritual-properties">
                        {product.properties.chakra && product.properties.chakra.length > 0 && 
                          product.properties.chakra.map((chakra, index) => (
                            <span key={`chakra-${index}`} className="property">
                              {chakra}
                            </span>
                          ))
                        }
                        {product.properties.element && product.properties.element.length > 0 && 
                          product.properties.element.map((element, index) => (
                            <span key={`element-${index}`} className="property">
                              {element}
                            </span>
                          ))
                        }
                      </div>
                    )}
                    
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleAddToCart(product)}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="pagination">
                {pagination.hasPrevPage && (
                  <button 
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    className="btn btn-secondary"
                  >
                    Previous
                  </button>
                )}
                
                <span className="page-info">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                
                {pagination.hasNextPage && (
                  <button 
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    className="btn btn-secondary"
                  >
                    Next
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Products