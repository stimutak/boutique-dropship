import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '../../store/slices/authSlice'
import { searchProducts } from '../../store/slices/productsSlice'

const Header = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  
  const navigate = useNavigate()
  const dispatch = useDispatch()
  
  const { isAuthenticated, user } = useSelector(state => state.auth)
  const { totalItems } = useSelector(state => state.cart)

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      dispatch(searchProducts(searchTerm))
      navigate(`/products?search=${encodeURIComponent(searchTerm)}`)
      setSearchTerm('')
    }
  }

  const handleLogout = () => {
    dispatch(logout())
    navigate('/')
  }

  return (
    <header style={{ backgroundColor: '#7c3aed', color: 'white', padding: '1rem 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Logo */}
          <Link to="/" style={{ color: 'white', textDecoration: 'none', fontSize: '1.5rem', fontWeight: 'bold' }}>
            Holistic Store
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} style={{ display: 'flex', flex: '1', maxWidth: '400px', margin: '0 2rem' }}>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: '1',
                padding: '0.5rem',
                border: 'none',
                borderRadius: '4px 0 0 4px',
                fontSize: '1rem'
              }}
            />
            <button
              type="submit"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#6d28d9',
                color: 'white',
                border: 'none',
                borderRadius: '0 4px 4px 0',
                cursor: 'pointer'
              }}
            >
              Search
            </button>
          </form>

          {/* Navigation */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/products" style={{ color: 'white', textDecoration: 'none' }}>
              Products
            </Link>
            
            <Link to="/cart" style={{ color: 'white', textDecoration: 'none', position: 'relative' }}>
              Cart
              {totalItems > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem'
                }}>
                  {totalItems}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  {user?.firstName || 'Account'} ▼
                </button>
                
                {isMenuOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: '0',
                    backgroundColor: 'white',
                    color: 'black',
                    minWidth: '150px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    borderRadius: '4px',
                    zIndex: 1000
                  }}>
                    <Link
                      to="/profile"
                      style={{ display: 'block', padding: '0.5rem 1rem', textDecoration: 'none', color: 'black' }}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      to="/orders"
                      style={{ display: 'block', padding: '0.5rem 1rem', textDecoration: 'none', color: 'black' }}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Orders
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout()
                        setIsMenuOpen(false)
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.5rem 1rem',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" style={{ color: 'white', textDecoration: 'none' }}>
                  Login
                </Link>
                <Link to="/register" style={{ color: 'white', textDecoration: 'none' }}>
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}

export default Header