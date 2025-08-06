import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { logoutUser } from '../../store/slices/authSlice'
import { clearAfterMerge } from '../../store/slices/cartSlice'
import SearchAutocomplete from '../SearchAutocomplete'
import LanguageSelector from '../LanguageSelector'
import { supportedLanguages } from '../../i18n/i18n'
import './Header.css'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const logoutTimeoutRef = useRef(null)
  
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  
  const { isAuthenticated, user } = useSelector(state => state.auth)
  const { totalItems } = useSelector(state => state.cart)
  
  const isRTL = supportedLanguages[i18n.language]?.dir === 'rtl'

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current)
        logoutTimeoutRef.current = null
      }
    }
  }, [])

  const handleLogout = async () => {
    // Call backend logout endpoint to clear httpOnly cookie
    await dispatch(logoutUser())
    
    // Clear any existing timeout
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current)
    }
    
    // Clear the flag after 5 seconds to allow normal operation
    logoutTimeoutRef.current = setTimeout(() => {
      window.sessionStorage.removeItem('justLoggedOut')
      logoutTimeoutRef.current = null
    }, 5000)
    
    // Clear cart state and reset to fresh guest session
    dispatch(clearAfterMerge())
    
    // Navigate to home
    navigate('/')
  }

  return (
    <header className={`header ${isRTL ? 'rtl' : ''}`}>
      <div className="header-content">
        {/* Logo */}
        <Link to="/" className="logo">
          Authentika Holistic Lifestyle
        </Link>

        {/* Search Bar with Autocomplete */}
        <SearchAutocomplete />

        {/* Mobile Menu Toggle */}
        <button 
          className="mobile-menu-toggle"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>

        {/* Navigation */}
        <nav className="nav-menu">
          <Link to="/products" className="nav-link">
            {t('navigation.products')}
          </Link>
          
          <Link to="/cart" className="nav-link cart-link">
            {t('navigation.cart')}
            {totalItems > 0 && (
              <span className="cart-badge">
                {totalItems}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="user-menu">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="user-menu-toggle"
              >
                {user?.firstName || 'Account'} {isRTL ? '▲' : '▼'}
              </button>
              
              {isMenuOpen && (
                <div className="user-dropdown">
                  <Link
                    to="/profile"
                    className="dropdown-link"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('navigation.profile')}
                  </Link>
                  {user?.isAdmin && (
                    <Link
                      to="/admin"
                      className="dropdown-link admin-link"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  <Link
                    to="/orders"
                    className="dropdown-link"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('navigation.orders')}
                  </Link>
                  <Link
                    to="/my-reviews"
                    className="dropdown-link"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {t('navigation.myReviews')}
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsMenuOpen(false)
                    }}
                    className="dropdown-link logout-button"
                  >
                    {t('navigation.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                {t('navigation.login')}
              </Link>
              <Link to="/register" className="nav-link">
                {t('navigation.register')}
              </Link>
            </>
          )}
          
          {/* Language Selector */}
          <LanguageSelector />
        </nav>

        {/* Mobile Menu */}
        <div className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}>
          <div className="mobile-menu-content">
            <Link 
              to="/products" 
              className="mobile-nav-link"
              onClick={() => setIsMenuOpen(false)}
            >
              {t('navigation.products')}
            </Link>
            
            <Link 
              to="/cart" 
              className="mobile-nav-link"
              onClick={() => setIsMenuOpen(false)}
            >
              {t('navigation.cart')} ({totalItems})
            </Link>

            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="mobile-nav-link"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('navigation.profile')}
                </Link>
                {user?.isAdmin && (
                  <Link
                    to="/admin"
                    className="mobile-nav-link"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Admin Dashboard
                  </Link>
                )}
                <Link
                  to="/orders"
                  className="mobile-nav-link"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('navigation.orders')}
                </Link>
                <Link
                  to="/my-reviews"
                  className="mobile-nav-link"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('navigation.myReviews')}
                </Link>
                <button
                  onClick={() => {
                    handleLogout()
                    setIsMenuOpen(false)
                  }}
                  className="mobile-nav-link logout-button"
                >
                  {t('navigation.logout')}
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="mobile-nav-link"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('navigation.login')}
                </Link>
                <Link 
                  to="/register" 
                  className="mobile-nav-link"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('navigation.register')}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header