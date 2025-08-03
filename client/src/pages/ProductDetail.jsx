import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchProductBySlug, clearCurrentProduct } from '../store/slices/productsSlice'
import { addToCart } from '../store/slices/cartSlice'
import PriceDisplay from '../components/PriceDisplay'
import { localeCurrencies } from '../i18n/i18n'
import { useTranslation } from 'react-i18next'

// Helper function to format price
function formatPrice(amount, currency, locale) {
  try {
    return new Intl.NumberFormat(locale || 'en', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2
    }).format(amount)
  } catch (error) {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      CNY: '¥',
      JPY: '¥',
      SAR: 'ر.س',
      CAD: 'C$'
    }
    const symbol = symbols[currency] || currency
    return `${symbol}${amount.toFixed(currency === 'JPY' ? 0 : 2)}`
  }
}

const ProductDetail = () => {
  const { slug } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { i18n } = useTranslation()
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  
  const { currentProduct: product, isLoading, error } = useSelector(state => state.products)
  const { isAuthenticated } = useSelector(state => state.auth)

  useEffect(() => {
    if (slug) {
      dispatch(fetchProductBySlug(slug))
    }
    
    return () => {
      dispatch(clearCurrentProduct())
    }
  }, [dispatch, slug])

  const handleAddToCart = () => {
    if (!product) return
    
    // Always use API endpoints - backend handles both authenticated and guest carts
    dispatch(addToCart({ productId: product._id, quantity }))
    
    // Show success message or redirect to cart
    navigate('/cart')
  }

  if (isLoading) {
    return <div className="loading">Loading product...</div>
  }

  if (error) {
    return <div className="error">Error: {error}</div>
  }

  if (!product) {
    return <div className="error">Product not found</div>
  }

  return (
    <div className="product-detail">
      <div className="container">
        <div className="product-detail-grid">
          {/* Product Images */}
          <div className="product-images">
            <div className="main-image">
              {product.images && product.images.length > 0 ? (
                <img 
                  src={product.images[selectedImage].url} 
                  alt={product.images[selectedImage].alt || product.name}
                />
              ) : (
                <div className="placeholder-image">No Image Available</div>
              )}
            </div>
            
            {product.images && product.images.length > 1 && (
              <div className="image-thumbnails">
                {product.images.map((image, index) => (
                  <img
                    key={index}
                    src={image.url}
                    alt={image.alt || `${product.name} ${index + 1}`}
                    className={selectedImage === index ? 'active' : ''}
                    onClick={() => setSelectedImage(index)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="product-info">
            <h1>{product.name}</h1>
            <PriceDisplay 
              price={product.priceInCurrency || product.price} 
              displayPrice={product.displayPrice}
              currency={product.displayCurrency}
            />
            <p className="category">Category: {product.category}</p>
            
            {/* Spiritual Properties */}
            {product.properties && (
              <div className="spiritual-properties">
                <h3>Spiritual Properties</h3>
                <div className="properties-tags">
                  {product.properties.chakra && product.properties.chakra.length > 0 && (
                    <div className="property-group">
                      <strong>Chakra:</strong>
                      {product.properties.chakra.map((chakra, index) => (
                        <span key={`chakra-${index}`} className="property-tag">
                          {chakra}
                        </span>
                      ))}
                    </div>
                  )}
                  {product.properties.element && product.properties.element.length > 0 && (
                    <div className="property-group">
                      <strong>Element:</strong>
                      {product.properties.element.map((element, index) => (
                        <span key={`element-${index}`} className="property-tag">
                          {element}
                        </span>
                      ))}
                    </div>
                  )}
                  {product.properties.zodiac && product.properties.zodiac.length > 0 && (
                    <div className="property-group">
                      <strong>Zodiac:</strong>
                      {product.properties.zodiac.map((zodiac, index) => (
                        <span key={`zodiac-${index}`} className="property-tag">
                          {zodiac}
                        </span>
                      ))}
                    </div>
                  )}
                  {product.properties.healing && product.properties.healing.length > 0 && (
                    <div className="property-group">
                      <strong>Healing:</strong>
                      {product.properties.healing.map((healing, index) => (
                        <span key={`healing-${index}`} className="property-tag">
                          {healing}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="description">
              <h3>Description</h3>
              <p>{product.description}</p>
            </div>

            {/* Add to Cart */}
            <div className="add-to-cart">
              <div className="quantity-selector">
                <label>Quantity:</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                />
              </div>
              
              <button 
                className="btn btn-primary add-to-cart-btn"
                onClick={handleAddToCart}
              >
                Add to Cart - {formatPrice((product.priceInCurrency || product.price) * quantity, product.displayCurrency || 'USD', i18n.language)}
              </button>
            </div>

            {/* Product Details */}
            <div className="product-details">
              <h3>Product Details</h3>
              {product.weight && <p><strong>Weight:</strong> {product.weight}</p>}
              {product.dimensions && <p><strong>Dimensions:</strong> {product.dimensions}</p>}
              {product.origin && <p><strong>Origin:</strong> {product.origin}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetail