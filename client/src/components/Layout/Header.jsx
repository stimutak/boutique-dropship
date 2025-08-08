import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { logoutUser } from '../../store/slices/authSlice'
import { clearAfterMerge } from '../../store/slices/cartSlice'
import SearchAutocomplete from '../SearchAutocomplete'
import LanguageSelector from '../LanguageSelector'
import DarkModeToggle from '../DarkModeToggle'
import { supportedLanguages } from '../../i18n/i18n'
import './Header.css'

// Import a couple of simple icons from the Lucide icon set.  These
// lightweight SVG components are used for the compact sub–menu that
// appears on the home page once the main navigation scrolls away.
import { ShoppingCart, User } from 'lucide-react'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const logoutTimeoutRef = useRef(null)
  
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  
  const { isAuthenticated, user } = useSelector(state => state.auth)
  const { totalItems } = useSelector(state => state.cart)
  
  const isRTL = supportedLanguages[i18n.language]?.dir === 'rtl'

  // Determine if the current route is the home page.  When on the
  // landing page we enhance the header with a transparent overlay and
  // scrolling behaviour.
  const location = useLocation()
  const isHome = location.pathname === '/'

  // Track whether the main navigation (logo, search bar, nav links)
  // should be visible.  When the user scrolls down past a threshold
  // the header collapses and only the compact sub–menu remains.  The
  // header reappears on upward scroll.  Defaults to true so the
  // navigation is visible on initial load.
  const [showMainNav, setShowMainNav] = useState(true)

  // When on the home page attach a scroll listener.  We use the
  // viewport height as a threshold for when the hero video has
  // scrolled sufficiently.  On other routes we always show the
  // navigation.
  useEffect(() => {
    if (!isHome) {
      // Ensure the nav is always shown when not on home
      setShowMainNav(true)
      return
    }
    const handleScroll = () => {
      const threshold = window.innerHeight * 0.6
      if (window.scrollY > threshold) {
        if (showMainNav) setShowMainNav(false)
      } else {
        if (!showMainNav) setShowMainNav(true)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isHome, showMainNav])

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
    <>
      {/* Sub menu bar visible on the home page once the user scrolls past the hero.  */}
      {isHome && (
        <div
          className="sub-menu"
          style={{ transform: showMainNav ? 'translateY(-100%)' : 'translateY(0)' }}
        >
          {/* Cart icon */}
          <Link to="/cart" className="icon-link" aria-label="Cart">
            <ShoppingCart size={20} />
            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </Link>
          {/* Account icon directs to profile when authenticated, login otherwise */}
          {isAuthenticated ? (
            <Link to="/profile" className="icon-link" aria-label="Profile">
              <User size={20} />
            </Link>
          ) : (
            <Link to="/login" className="icon-link" aria-label="Login">
              <User size={20} />
            </Link>
          )}
        </div>
      )}
      <header
        className={`header ${isRTL ? 'rtl' : ''} ${isHome ? 'header-overlay' : ''} ${
          showMainNav ? '' : 'header-hidden'
        }`}
      >
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
          
          {/* Dark Mode Toggle */}
          <DarkModeToggle />
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
    </>
  )
}

export default Header