import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchOrderById, clearCurrentOrder } from '../store/slices/ordersSlice'
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

const OrderDetail = () => {
  const { id } = useParams()
  const dispatch = useDispatch()
  const { i18n } = useTranslation()
  const { currentOrder: order, isLoading, error } = useSelector(state => state.orders)
  const orderCurrency = order?.currency || localeCurrencies[i18n.language] || 'USD'

  useEffect(() => {
    if (id) {
      dispatch(fetchOrderById(id))
    }
    
    return () => {
      dispatch(clearCurrentOrder())
    }
  }, [dispatch, id])


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
    return <div className="loading">Loading order...</div>
  }

  if (error) {
    return (
      <div className="order-detail-page">
        <div className="container">
          <h1>Order Details</h1>
          <div className="error">Error: {error}</div>
          <Link to="/orders" className="btn btn-primary">
            Back to Orders
          </Link>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="order-detail-page">
        <div className="container">
          <h1>Order Details</h1>
          <div className="error">Order not found</div>
          <Link to="/orders" className="btn btn-primary">
            Back to Orders
          </Link>
        </div>
      </div>
    )
  }

  try {
    return (
      <div className="order-detail-page">
      <div className="container">
        <div className="order-header">
          <div>
            <h1>Order #{order.orderNumber}</h1>
            <p>Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
          </div>
          <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>

        <div className="order-detail-grid">
          {/* Order Information */}
          <div className="order-info-section">
            <h2>Order Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span>Order Number:</span>
                <span>{order.orderNumber}</span>
              </div>
              <div className="info-item">
                <span>Status:</span>
                <span>{order.status}</span>
              </div>
              <div className="info-item">
                <span>Order Date:</span>
                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="info-item">
                <span>Total Amount:</span>
                <span>{formatPrice(order.total, orderCurrency, i18n.language)}</span>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="customer-info-section">
            <h2>Customer Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span>Name:</span>
                <span>
                  {order.customer 
                    ? `${order.customer.firstName} ${order.customer.lastName}`
                    : `${order.guestInfo.firstName} ${order.guestInfo.lastName}`
                  }
                </span>
              </div>
              <div className="info-item">
                <span>Email:</span>
                <span>
                  {order.customer 
                    ? order.customer.email
                    : order.guestInfo.email
                  }
                </span>
              </div>
              {(order.customer?.phone || order.guestInfo?.phone) && (
                <div className="info-item">
                  <span>Phone:</span>
                  <span>{order.customer?.phone || order.guestInfo?.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Shipping Address */}
          <div className="address-section">
            <h2>Shipping Address</h2>
            <div className="address">
              <p>{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
              <p>{order.shippingAddress.country}</p>
            </div>
          </div>

          {/* Order Items */}
          <div className="order-items-section">
            <h2>Order Items</h2>
            <div className="items-list">
              {(order.items || []).map(item => (
                <div key={item._id} className="order-item">
                  <div className="item-image">
                    {item.product.images && item.product.images.length > 0 ? (
                      <img src={item.product.images[0]} alt={item.product.name} />
                    ) : (
                      <div className="placeholder-image">No Image</div>
                    )}
                  </div>
                  
                  <div className="item-details">
                    <Link to={`/products/${item.product.slug}`}>
                      <h3>{item.product.name}</h3>
                    </Link>
                    <p>Category: {item.product.category}</p>
                    <p>Quantity: {item.quantity}</p>
                    <p>Price: {formatPrice(item.price, orderCurrency, i18n.language)} each</p>
                  </div>
                  
                  <div className="item-total">
                    {formatPrice(item.price * item.quantity, orderCurrency, i18n.language)}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="order-total">
              <strong>Total: {formatPrice(order.total, orderCurrency, i18n.language)}</strong>
            </div>
          </div>
        </div>

        <div className="order-actions">
          <Link to="/orders" className="btn btn-secondary">
            Back to Orders
          </Link>
          
          {order.status === 'pending' && (
            <button className="btn btn-secondary">
              Cancel Order
            </button>
          )}
        </div>
      </div>
    </div>
    )
  } catch (renderError) {
    return (
      <div className="order-detail-page">
        <div className="container">
          <h1>Order Details</h1>
          <div className="error">
            <p>An error occurred while loading the order details.</p>
            <Link to="/orders" className="btn btn-primary">
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    )
  }
}

export default OrderDetail