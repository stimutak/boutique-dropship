import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchProducts } from '../store/slices/productsSlice'
import PriceDisplay from '../components/PriceDisplay'
import './Home.css'

const Home = () => {
  const dispatch = useDispatch()
  const { products, isLoading } = useSelector(state => state.products)

  useEffect(() => {
    dispatch(fetchProducts({ limit: 8 }))
  }, [dispatch])

  // Clip video as user scrolls to reveal image
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      const videoContainer = document.querySelector('.hero-video-container')
      
      if (videoContainer) {
        // As user scrolls, clip video from bottom to reveal image
        const clipPercent = Math.min(100, (scrollY / windowHeight) * 100)
        videoContainer.style.clipPath = `inset(0 0 ${clipPercent}% 0)`
      }
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
      {/* Fixed Hero Section */}
      <div className="hero-wrapper">
        {/* Background Image - Always visible */}
        <div className="hero-bg">
          <img src="/images/hero-background.jpg" alt="" />
        </div>
        
        {/* Video on top - gets clipped away to reveal image */}
        <div className="hero-video-container">
          <video autoPlay loop muted playsInline>
            <source src="/videos/hero.mp4" type="video/mp4" />
          </video>
          <div className="video-overlay"></div>
        </div>
        
        {/* Text on top of video */}
        <div className="hero-text">
          <h1>Authentika Holistic Lifestyle</h1>
          <p>Your Gateway to Authentic Wellness</p>
          <Link to="/products" className="hero-btn">Shop Now</Link>
        </div>
      </div>
      
      {/* Spacer for scrolling - no white, just space to scroll */}
      <div className="scroll-spacer"></div>
      
      {/* Content wrapper with solid background */}
      <div className="content-wrapper">
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