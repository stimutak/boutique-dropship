import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { clearCart } from '../store/slices/cartSlice'
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

const Payment = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { i18n } = useTranslation()
  const { isAuthenticated } = useSelector(state => state.auth)
  
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('card')
  
  const orderCurrency = order?.currency || localeCurrencies[i18n.language] || 'USD'

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get(`/api/orders/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      setOrder(response.data.data.order)
    } catch (error) {
      setError(`Order not found: ${error.response?.data?.error?.message || error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayment = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      
      // Create Mollie payment
      const token = localStorage.getItem('token')
      const paymentRequest = {
        orderId: order._id,
        method: paymentMethod,
        redirectUrl: `${window.location.origin}/payment/success/${order._id}`,
        webhookUrl: `http://localhost:5001/api/payments/webhook`
      }
      
      
      const response = await api.post('/api/payments/create', paymentRequest, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })


      if (response.data.success && response.data.data.checkoutUrl) {
        // Redirect to Mollie payment page
        window.location.href = response.data.data.checkoutUrl
      } else {
        throw new Error('Failed to create payment - no checkout URL received')
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to process payment'
      setError(`Payment Error: ${errorMessage}`)
      setIsLoading(false)
    }
  }

  const handleSkipPayment = async () => {
    // For demo purposes - mark as paid and clear cart
    try {
      setError(null)
      
      const token = localStorage.getItem('token')
      const response = await api.post(`/api/payments/demo-complete/${order._id}`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      
      // Navigate to payment success page (cart will be cleared there)
      navigate(`/payment/success/${order._id}`)
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to complete demo payment'
      setError(`Demo Payment Error: ${errorMessage}`)
    }
  }

  if (isLoading) {
    return <div className="loading">Loading payment details...</div>
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

  if (!order) {
    return <div className="error">Order not found</div>
  }

  return (
    <div className="payment-page">
      <div className="container">
        <h1>Complete Your Payment</h1>
        
        <div className="payment-grid">
          {/* Order Summary */}
          <div className="order-summary">
            <h2>Order Summary</h2>
            <p><strong>Order Number:</strong> {order.orderNumber}</p>
            
            <div className="summary-items">
              {order.items.map(item => (
                <div key={item._id} className="summary-item">
                  <span>{item.product?.name || 'Product'} x {item.quantity}</span>
                  <span>{formatPrice(item.price * item.quantity, orderCurrency, i18n.language)}</span>
                </div>
              ))}
            </div>
            
            <div className="summary-breakdown">
              <div className="summary-line">
                <span>Subtotal:</span>
                <span>${order.subtotal.toFixed(2)}</span>
              </div>
              {order.tax > 0 && (
                <div className="summary-line">
                  <span>Tax:</span>
                  <span>${order.tax.toFixed(2)}</span>
                </div>
              )}
              {order.shipping > 0 && (
                <div className="summary-line">
                  <span>Shipping:</span>
                  <span>${order.shipping.toFixed(2)}</span>
                </div>
              )}
              <div className="summary-total">
                <strong>Total: {formatPrice(order.total, orderCurrency, i18n.language)}</strong>
              </div>
            </div>
          </div>

          {/* Payment Options */}
          <div className="payment-options">
            <h2>Payment Method</h2>
            
            <div className="payment-methods">
              <label className="payment-method">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>Credit/Debit Card</span>
              </label>
              
              <label className="payment-method">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="crypto"
                  checked={paymentMethod === 'crypto'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <span>Cryptocurrency</span>
              </label>
            </div>

            <div className="payment-actions">
              <button 
                onClick={handlePayment}
                className="btn btn-primary payment-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : `Pay $${order.total.toFixed(2)}`}
              </button>
              
              {/* Demo/Testing button */}
              <button 
                onClick={handleSkipPayment}
                className="btn btn-secondary demo-btn"
                style={{ marginTop: '10px' }}
              >
                Skip Payment (Demo)
              </button>
            </div>

            <div className="payment-security">
              <p>🔒 Secure payment powered by Mollie</p>
              <p>Your payment information is encrypted and secure</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Payment