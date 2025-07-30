import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchUserOrders } from '../store/slices/ordersSlice'
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

const Orders = () => {
  const dispatch = useDispatch()
  const { i18n } = useTranslation()
  const { orders, isLoading, error } = useSelector(state => state.orders)
  const userCurrency = order => order.currency || localeCurrencies[i18n.language] || 'USD'

  useEffect(() => {
    dispatch(fetchUserOrders())
  }, [dispatch])


  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'pending': return 'status-pending'
      case 'processing': return 'status-processing'
      case 'shipped': return 'status-shipped'
      case 'delivered': return 'status-delivered'
      case 'cancelled': return 'status-cancelled'
      default: return 'status-pending'
    }
  }

  if (isLoading) {
    return <div className="loading">Loading orders...</div>
  }

  if (error) {
    return (
      <div className="orders-page">
        <div className="container">
          <h1>My Orders</h1>
          <div className="error">Error: {error}</div>
          <button onClick={() => dispatch(fetchUserOrders())} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    )
  }

  try {
    return (
      <div className="orders-page">
        <div className="container">
          <h1>My Orders</h1>
          
          {(!orders || orders.length === 0 || orders.filter(order => order.items.some(item => item.product !== null)).length === 0) ? (
            <div className="no-orders">
              <p>You haven't placed any orders yet</p>
              <Link to="/products" className="btn btn-primary">
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="orders-list">
              {(orders || []).filter(order => 
                // Only show orders that have at least one valid product
                order.items.some(item => item.product !== null)
              ).map(order => (
                <div key={order._id} className="order-card">
                  <div className="order-header">
                    <div>
                      <h3>Order #{order.orderNumber}</h3>
                      <p>Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  
                  <div className="order-items">
                    {order.items
                      .filter(item => item.product !== null)
                      .slice(0, 3)
                      .map(item => (
                        <div key={item._id} className="order-item">
                          <span>{item.product.name} x {item.quantity}</span>
                          <span>{formatPrice(item.price * item.quantity, userCurrency(order), i18n.language)}</span>
                        </div>
                      ))}
                    {order.items.length > 3 && (
                      <p>... and {order.items.length - 3} more items</p>
                    )}
                  </div>
                  
                  <div className="order-footer">
                    <div className="order-total">
                      <strong>Total: {formatPrice(order.total, userCurrency(order), i18n.language)}</strong>
                    </div>
                    <Link 
                      to={`/orders/${order._id}`} 
                      className="btn btn-secondary"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  } catch (renderError) {
    return (
      <div className="orders-page">
        <div className="container">
          <h1>My Orders</h1>
          <div className="error">
            <p>An error occurred while loading your orders.</p>
            <button onClick={() => window.location.reload()} className="btn btn-primary">
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    )
  }
}

export default Orders