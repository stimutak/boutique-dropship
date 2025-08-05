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

// Protected Route Components (keep immediate - needed for routing logic)
import ProtectedRoute from './components/Auth/ProtectedRoute'
import AdminRoute from './components/Auth/AdminRoute'

// Lazy-loaded Pages
const Home = lazy(() => import('./pages/Home'))
const Products = lazy(() => import('./pages/Products'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const Payment = lazy(() => import('./pages/Payment'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Profile = lazy(() => import('./pages/Profile'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Orders = lazy(() => import('./pages/Orders'))
const OrderDetail = lazy(() => import('./pages/OrderDetail'))
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'))
const MyReviews = lazy(() => import('./pages/MyReviews'))
const NotFound = lazy(() => import('./pages/NotFound'))

// Lazy-loaded Admin Pages (heaviest bundle)
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
        <LazyLoadErrorBoundary>
          <Suspense fallback={<PageLoader />}>
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
            <Route 
              path="/my-reviews" 
              element={
                <ProtectedRoute>
                  <MyReviews />
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
            <Route 
              path="/admin/products/new" 
              element={
                <AdminRoute>
                  <AdminProductNew />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/products/:id/edit" 
              element={
                <AdminRoute>
                  <AdminProductEdit />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/orders" 
              element={
                <AdminRoute>
                  <AdminOrders />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/reviews" 
              element={
                <AdminRoute>
                  <AdminReviews />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/users" 
              element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              } 
            />
            <Route 
              path="/admin/settings" 
              element={
                <AdminRoute>
                  <AdminSettings />
                </AdminRoute>
              } 
            />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </LazyLoadErrorBoundary>
      </main>
      <Footer />
    </div>
  )
}

export default App