import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { clearCart, clearCartLocally } from '../store/slices/cartSlice'
import api from '../api/config'

const Payment = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isAuthenticated } = useSelector(state => state.auth)
  
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('card')

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await api.get(`/api/orders/${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      console.log('Order fetched:', response.data)
      setOrder(response.data.data.order)
    } catch (error) {
      console.error('Failed to fetch order:', error)
      setError(`Order not found: ${error.response?.data?.error?.message || error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePayment = async () => {
    try {
      setIsLoading(true)
      
      // Create Mollie payment
      const token = localStorage.getItem('token')
      const response = await api.post('/api/payments/create', {
        orderId: order._id,
        method: paymentMethod,
        redirectUrl: `${window.location.origin}/payment/success/${order._id}`,
        webhookUrl: `${window.location.origin}/api/payments/webhook`
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (response.data.success && response.data.data.checkoutUrl) {
        // Redirect to Mollie payment page
        window.location.href = response.data.data.checkoutUrl
      } else {
        throw new Error('Failed to create payment')
      }
    } catch (error) {
      console.error('Payment creation failed:', error)
      setError('Failed to process payment. Please try again.')
      setIsLoading(false)
    }
  }

  const handleSkipPayment = async () => {
    // For demo purposes - mark as paid and clear cart
    try {
      const token = localStorage.getItem('token')
      await api.post(`/api/payments/demo-complete/${order._id}`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      // Clear cart after successful payment
      if (isAuthenticated) {
        dispatch(clearCart())
      } else {
        dispatch(clearCartLocally())
      }
      
      navigate(`/orders/${order._id}`)
    } catch (error) {
      console.error('Demo payment failed:', error)
      setError('Failed to complete demo payment')
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
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
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
                <strong>Total: ${order.total.toFixed(2)}</strong>
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