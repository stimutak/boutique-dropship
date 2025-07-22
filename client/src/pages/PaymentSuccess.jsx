import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { clearCart } from '../store/slices/cartSlice'
import { fetchUserOrders } from '../store/slices/ordersSlice'
import api from '../api/config'

const PaymentSuccess = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isAuthenticated } = useSelector(state => state.auth)
  
  const [order, setOrder] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

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
              <p><strong>Total:</strong> ${order.total.toFixed(2)}</p>
              <p><strong>Status:</strong> {order.status}</p>
              
              <div className="order-items">
                <h3>Items Ordered:</h3>
                {order.items.map(item => (
                  <div key={item._id} className="order-item">
                    <span>{item.product?.name || 'Product'} x {item.quantity}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
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