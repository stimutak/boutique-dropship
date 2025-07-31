import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { loadUser } from './store/slices/authSlice'
import { fetchCart } from './store/slices/cartSlice'
import csrfService from './services/csrf'
import { supportedLanguages } from './i18n/i18n'

// Components
import Header from './components/Layout/Header'
import Footer from './components/Layout/Footer'
import CartDebug from './components/CartDebug'

// Pages
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Payment from './pages/Payment'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import PaymentSuccess from './pages/PaymentSuccess'
import NotFound from './pages/NotFound'

// Protected Route Components
import ProtectedRoute from './components/Auth/ProtectedRoute'
import AdminRoute from './components/Auth/AdminRoute'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts from './pages/admin/AdminProducts'

function App() {
  const dispatch = useDispatch()
  const { i18n } = useTranslation()

  useEffect(() => {
    // Initialize CSRF token for all users (including guests)
    csrfService.fetchToken().catch(err => {
      console.warn('Failed to initialize CSRF token:', err)
    })
    
    // Try to load user from cookie-based auth
    dispatch(loadUser())
      .unwrap()
      .then(() => {
        // User is authenticated, refresh CSRF token
        csrfService.fetchToken().catch(err => {
          console.warn('Failed to refresh CSRF token after user load:', err)
        })
      })
      .catch(() => {
        // User is not authenticated, fetch guest cart
        dispatch(fetchCart()).catch(err => {
          console.warn('Failed to initialize guest cart:', err)
        })
      })
  }, [dispatch])

  // Update document direction when language changes
  useEffect(() => {
    const currentLang = i18n.language
    const langConfig = supportedLanguages[currentLang]
    const direction = langConfig?.dir || 'ltr'
    
    document.documentElement.dir = direction
    document.documentElement.lang = currentLang
  }, [i18n.language])

  return (
    <div className="App">
      <Header />
      {process.env.NODE_ENV === 'development' && <CartDebug />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment/:orderId" element={<Payment />} />
          <Route path="/payment/success/:orderId" element={<PaymentSuccess />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/orders" 
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/orders/:id" 
            element={
              <ProtectedRoute>
                <OrderDetail />
              </ProtectedRoute>
            } 
          />
          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/dashboard" 
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/products" 
            element={
              <AdminRoute>
                <AdminProducts />
              </AdminRoute>
            } 
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App