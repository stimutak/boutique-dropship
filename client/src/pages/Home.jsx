import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchProducts } from '../store/slices/productsSlice'
import PriceDisplay from '../components/PriceDisplay'
// Import the page level styles for the home page. This file defines the
// hero video container and overlay used on the landing section. Without
// importing the CSS here Vite may tree-shake the file and the classes
// defined in Home.css will not be applied.
import './Home.css'

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
        {/* The video container uses sticky positioning so that the video
            scrolls with the page until it reaches the top of the viewport. */}
        <div className="hero-video-container">
          <video
            className="hero-video"
            src="/videos/hero.mp4"
            autoPlay
            loop
            muted
            playsInline
          />
        </div>
        {/* Text overlay displayed on top of the video */}
        <div className="hero-content">
          <h1>Authentika Holistic Lifestyle</h1>
          <p>Your Gateway to Authentic Wellness</p>
          <Link to="/products" className="btn btn-primary btn-luxury">
            Shop Now
          </Link>
        </div>
      </section>

      {/* Categories Section */}
      <section className="categories">
        <div className="container">
          <h2 className="luxury-title">Shop by Category</h2>
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
                        <img src={product.images[0].url} alt={product.images[0].alt || product.name} />
                      ) : (
                        <div className="placeholder-image">No Image</div>
                      )}
                    </div>
                    <div className="product-info">
                      <h3>{product.name}</h3>
                      <PriceDisplay 
                        price={product.priceInCurrency || product.price} 
                        displayPrice={product.displayPrice}
                        currency={product.displayCurrency}
                      />
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
