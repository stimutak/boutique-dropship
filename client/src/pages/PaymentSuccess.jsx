import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { clearCart } from '../store/slices/cartSlice'
import { fetchUserOrders } from '../store/slices/ordersSlice'
import api from '../api/config'
import { useTranslation } from 'react-i18next'
import { localeCurrencies } from '../i18n/i18n'

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

const PaymentSuccess = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { i18n } = useTranslation()
  const { isAuthenticated } = useSelector(state => state.auth)
  
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const orderCurrency = order?.currency || localeCurrencies[i18n.language] || 'USD'

  useEffect(() => {
    fetchOrderAndClearCart()
  }, [orderId])

  const fetchOrderAndClearCart = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get(`/api/orders/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      const orderData = response.data.data.order
      setOrder(orderData)
      
      // Clear cart after successful payment
      // Always use API endpoints - backend handles both authenticated and guest carts
      dispatch(clearCart())
      
    } catch (error) {
      setError('Order not found')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="loading">Processing your payment...</div>
  }

  if (error) {
    return (
      <div className="error-page">
        <div className="container">
          <h1>Payment Error</h1>
          <p>{error}</p>
          <button onClick={() => navigate('/cart')} className="btn btn-primary">
            Return to Cart
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="payment-success-page">
      <div className="container">
        <div className="success-content">
          <div className="success-icon">✅</div>
          <h1>Payment Successful!</h1>
          <p>Thank you for your order. Your payment has been processed successfully.</p>
          
          {order && (
            <div className="order-details">
              <h2>Order Details</h2>
              <p><strong>Order Number:</strong> {order.orderNumber}</p>
              <p><strong>Total:</strong> {formatPrice(order.total, orderCurrency, i18n.language)}</p>
              <p><strong>Status:</strong> {order.status}</p>
              
              <div className="order-items">
                <h3>Items Ordered:</h3>
                {order.items.map(item => (
                  <div key={item._id} className="order-item">
                    <span>{item.product?.name || 'Product'} x {item.quantity}</span>
                    <span>{formatPrice(item.price * item.quantity, orderCurrency, i18n.language)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="success-actions">
            {isAuthenticated ? (
              <button 
                onClick={() => {
                  dispatch(fetchUserOrders())
                  navigate('/orders')
                }} 
                className="btn btn-primary"
              >
                View My Orders
              </button>
            ) : (
              <button 
                onClick={() => navigate('/products')} 
                className="btn btn-primary"
              >
                Continue Shopping
              </button>
            )}
            <button 
              onClick={() => navigate('/')} 
              className="btn btn-secondary"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentSuccess