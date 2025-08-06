import { useEffect, Suspense, lazy } from 'react'
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
import PageLoader from './components/Loading/PageLoader'
import LazyLoadErrorBoundary from './components/ErrorBoundary/LazyLoadErrorBoundary'
import CookieConsentBanner from './components/GDPR/CookieConsentBanner'

// Protected Route Components (keep immediate - needed for routing logic)
import ProtectedRoute from './components/Auth/ProtectedRoute'
import AdminRoute from './components/Auth/AdminRoute'

// Core shopping experience - keep in main bundle for best UX
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'

// Authentication pages - used frequently, keep in main bundle
import Login from './pages/Login'
import Register from './pages/Register'

// Lazy-loaded Pages - less frequently accessed
const Checkout = lazy(() => import('./pages/Checkout'))
const Payment = lazy(() => import('./pages/Payment'))
const Profile = lazy(() => import('./pages/Profile'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Orders = lazy(() => import('./pages/Orders'))
const OrderDetail = lazy(() => import('./pages/OrderDetail'))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'))
const MyReviews = lazy(() => import('./pages/MyReviews'))
const NotFound = lazy(() => import('./pages/NotFound'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const PrivacyCenter = lazy(() => import('./pages/PrivacyCenter'))

// Lazy-loaded Admin Pages (heaviest bundle - highest splitting priority)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'))
const AdminProductNew = lazy(() => import('./pages/admin/AdminProductNew'))
const AdminProductEdit = lazy(() => import('./pages/admin/AdminProductEdit'))
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))


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
          {/* Core shopping experience - no lazy loading for instant navigation */}
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Lazy-loaded routes with Suspense boundary */}
          <Route path="/checkout" element={
            <LazyLoadErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Checkout />
              </Suspense>
            </LazyLoadErrorBoundary>
          } />
          <Route path="/payment/:orderId" element={
            <LazyLoadErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Payment />
              </Suspense>
            </LazyLoadErrorBoundary>
          } />
          <Route path="/payment/success/:orderId" element={
            <LazyLoadErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <PaymentSuccess />
              </Suspense>
            </LazyLoadErrorBoundary>
          } />
          <Route path="/forgot-password" element={
            <LazyLoadErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <ForgotPassword />
              </Suspense>
            </LazyLoadErrorBoundary>
          } />
          <Route path="/reset-password" element={
            <LazyLoadErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <ResetPassword />
              </Suspense>
            </LazyLoadErrorBoundary>
          } />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <LazyLoadErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Profile />
                  </Suspense>
                </LazyLoadErrorBoundary>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/orders" 
            element={
              <ProtectedRoute>
                <LazyLoadErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Orders />
                  </Suspense>
                </LazyLoadErrorBoundary>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/orders/:id" 
            element={
              <ProtectedRoute>
                <LazyLoadErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <OrderDetail />
                  </Suspense>
                </LazyLoadErrorBoundary>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/my-reviews" 
            element={
              <ProtectedRoute>
                <LazyLoadErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <MyReviews />
                  </Suspense>
                </LazyLoadErrorBoundary>
              </ProtectedRoute>
            } 
          />
          
          {/* GDPR Routes */}
          <Route path="/privacy-policy" element={
            <LazyLoadErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <PrivacyPolicy />
              </Suspense>
            </LazyLoadErrorBoundary>
          } />
          <Route path="/privacy-center" element={
            <ProtectedRoute>
              <LazyLoadErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <PrivacyCenter />
                </Suspense>
              </LazyLoadErrorBoundary>
            </ProtectedRoute>
          } />
          {/* Admin Routes - highest priority for code splitting */}
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <LazyLoadErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <AdminDashboard />
                  </Suspense>
                </LazyLoadErrorBoundary>
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/dashboard" 
            element={
              <AdminRoute>
                <LazyLoadErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <AdminDashboard />
                  </Suspense>
                </LazyLoadErrorBoundary>
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/products" 
            element={
              <AdminRoute>
                <LazyLoadErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <AdminProducts />
                  </Suspense>
                </LazyLoadErrorBoundary>
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/products/new" 
            element={
              <AdminRoute>
                <LazyLoadErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <AdminProductNew />
                  </Suspense>
                </LazyLoadErrorBoundary>
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/products/:id/edit" 
            element={
              <AdminRoute>
                <LazyLoadErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <AdminProductEdit />
                  </Suspense>
                </LazyLoadErrorBoundary>
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/orders" 
            element={
              <AdminRoute>
                <LazyLoadErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <AdminOrders />
                  </Suspense>
                </LazyLoadErrorBoundary>
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/reviews" 
            element={
              <AdminRoute>
                <LazyLoadErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <AdminReviews />
                  </Suspense>
                </LazyLoadErrorBoundary>
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <AdminRoute>
                <LazyLoadErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <AdminUsers />
                  </Suspense>
                </LazyLoadErrorBoundary>
              </AdminRoute>
            } 
          />
          <Route 
            path="/admin/settings" 
            element={
              <AdminRoute>
                <LazyLoadErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <AdminSettings />
                  </Suspense>
                </LazyLoadErrorBoundary>
              </AdminRoute>
            } 
          />
          
          {/* 404 Page */}
          <Route path="*" element={
            <LazyLoadErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <NotFound />
              </Suspense>
            </LazyLoadErrorBoundary>
          } />
        </Routes>
      </main>
      <Footer />
      <CookieConsentBanner />
    </div>
  )
}

export default App