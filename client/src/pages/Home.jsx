import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchProducts } from '../store/slices/productsSlice'

const Home = () => {
  const dispatch = useDispatch()
  const { products, isLoading } = useSelector(state => state.products)

  useEffect(() => {
    // Fetch featured products for home page
    dispatch(fetchProducts({ limit: 8 }))
  }, [dispatch])

  const categories = [
    { name: 'Crystals', slug: 'crystals', description: 'Healing crystals and gemstones' },
    { name: 'Herbs', slug: 'herbs', description: 'Natural herbs and botanicals' },
    { name: 'Essential Oils', slug: 'essential-oils', description: 'Pure essential oils' },
    { name: 'Supplements', slug: 'supplements', description: 'Natural health supplements' },
    { name: 'Books', slug: 'books', description: 'Spiritual and wellness books' },
    { name: 'Accessories', slug: 'accessories', description: 'Spiritual accessories' }
  ]

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Welcome to Holistic Store</h1>
            <p>Discover spiritual and wellness products to enhance your journey</p>
            <Link to="/products" className="btn btn-primary">
              Shop Now
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories">
        <div className="container">
          <h2>Shop by Category</h2>
          <div className="grid grid-3">
            {categories.map(category => (
              <Link 
                key={category.slug} 
                to={`/products?category=${category.slug}`}
                className="category-card"
              >
                <h3>{category.name}</h3>
                <p>{category.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="featured-products">
        <div className="container">
          <h2>Featured Products</h2>
          {isLoading ? (
            <div className="loading">Loading products...</div>
          ) : (
            <div className="grid grid-4">
              {products.slice(0, 8).map(product => (
                <div key={product._id} className="product-card">
                  <Link to={`/products/${product.slug}`}>
                    <div className="product-image">
                      {product.images && product.images.length > 0 ? (
                        <img src={product.images[0]} alt={product.name} />
                      ) : (
                        <div className="placeholder-image">No Image</div>
                      )}
                    </div>
                    <div className="product-info">
                      <h3>{product.name}</h3>
                      <p className="price">${product.price.toFixed(2)}</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
          <div className="text-center">
            <Link to="/products" className="btn btn-secondary">
              View All Products
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home