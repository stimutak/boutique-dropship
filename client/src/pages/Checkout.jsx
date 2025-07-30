import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { createOrder } from '../store/slices/ordersSlice'
import { clearCart } from '../store/slices/cartSlice'
import PriceDisplay from '../components/PriceDisplay'

const Checkout = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items, totalPrice } = useSelector(state => state.cart)
  const { isAuthenticated, user } = useSelector(state => state.auth)
  const { isLoading, error } = useSelector(state => state.orders)
  
  const [formData, setFormData] = useState({
    // Customer Info
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    
    // Shipping Address
    shippingAddress: {
      street: user?.addresses?.[0]?.street || '',
      city: user?.addresses?.[0]?.city || '',
      state: user?.addresses?.[0]?.state || '',
      zipCode: user?.addresses?.[0]?.zipCode || '',
      country: user?.addresses?.[0]?.country || 'US'
    },
    
    // Billing Address
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    },
    
    // Options
    sameAsShipping: true,
    
    // Cross-site integration
    referralSource: ''
  })

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart')
    }
  }, [items, navigate])

  // Update form data when user data becomes available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        shippingAddress: {
          street: user.addresses?.[0]?.street || prev.shippingAddress.street,
          city: user.addresses?.[0]?.city || prev.shippingAddress.city,
          state: user.addresses?.[0]?.state || prev.shippingAddress.state,
          zipCode: user.addresses?.[0]?.zipCode || prev.shippingAddress.zipCode,
          country: user.addresses?.[0]?.country || prev.shippingAddress.country || 'US'
        }
      }))
    }
  }, [user])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const billingAddr = formData.sameAsShipping ? {
      firstName: formData.firstName,
      lastName: formData.lastName,
      street: formData.shippingAddress.street,
      city: formData.shippingAddress.city,
      state: formData.shippingAddress.state,
      zipCode: formData.shippingAddress.zipCode,
      country: formData.shippingAddress.country
    } : formData.billingAddress;

    const orderData = {
      items: items.map(item => ({
        productId: item.product._id,
        quantity: item.quantity,
        price: item.product.price
      })),
      guestInfo: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        ...(formData.phone && formData.phone.trim() && { phone: formData.phone.trim() })
      },
      shippingAddress: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        street: formData.shippingAddress.street,
        city: formData.shippingAddress.city,
        state: formData.shippingAddress.state,
        zipCode: formData.shippingAddress.zipCode,
        country: formData.shippingAddress.country || 'US'
      },
      billingAddress: billingAddr,
      referralSource: formData.referralSource || ''
    }

    try {
      const result = await dispatch(createOrder(orderData)).unwrap()
      
      // Don't clear cart yet - wait until payment is complete
      
      // Redirect to payment page instead of order confirmation
      navigate(`/payment/${result.order._id}`)
    } catch (error) {
      // Error is handled by the order slice
    }
  }

  return (
    <div className="checkout-page">
      <div className="container">
        <h1>Checkout</h1>
        
        <div className="checkout-grid">
          {/* Order Form */}
          <div className="checkout-form">
            <form onSubmit={handleSubmit}>
              {/* Customer Information */}
              <section className="form-section">
                <h2>Customer Information</h2>
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>
              </section>

              {/* Shipping Address */}
              <section className="form-section">
                <h2>Shipping Address</h2>
                <div className="form-group">
                  <label>Street Address *</label>
                  <input
                    type="text"
                    name="shippingAddress.street"
                    value={formData.shippingAddress.street}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>City *</label>
                    <input
                      type="text"
                      name="shippingAddress.city"
                      value={formData.shippingAddress.city}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>State *</label>
                    <input
                      type="text"
                      name="shippingAddress.state"
                      value={formData.shippingAddress.state}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>ZIP Code *</label>
                    <input
                      type="text"
                      name="shippingAddress.zipCode"
                      value={formData.shippingAddress.zipCode}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
              </section>

              {/* Billing Address */}
              <section className="form-section">
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      name="sameAsShipping"
                      checked={formData.sameAsShipping}
                      onChange={handleInputChange}
                    />
                    Billing address same as shipping
                  </label>
                </div>
                
                {!formData.sameAsShipping && (
                  <>
                    <h2>Billing Address</h2>
                    <div className="form-group">
                      <label>Street Address *</label>
                      <input
                        type="text"
                        name="billingAddress.street"
                        value={formData.billingAddress.street}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>City *</label>
                        <input
                          type="text"
                          name="billingAddress.city"
                          value={formData.billingAddress.city}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>State *</label>
                        <input
                          type="text"
                          name="billingAddress.state"
                          value={formData.billingAddress.state}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>ZIP Code *</label>
                        <input
                          type="text"
                          name="billingAddress.zipCode"
                          value={formData.billingAddress.zipCode}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}
              </section>

              {/* Referral Source */}
              <section className="form-section">
                <div className="form-group">
                  <label>How did you hear about us?</label>
                  <select
                    name="referralSource"
                    value={formData.referralSource}
                    onChange={handleInputChange}
                  >
                    <option value="">Select...</option>
                    <option value="school-site">School Website</option>
                    <option value="travel-site">Travel Website</option>
                    <option value="company-site">Company Website</option>
                    <option value="search-engine">Search Engine</option>
                    <option value="social-media">Social Media</option>
                    <option value="friend">Friend/Family</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </section>

              {error && <div className="error">{error}</div>}

              <button 
                type="submit" 
                className="btn btn-primary checkout-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Place Order'}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="order-summary">
            <h2>Order Summary</h2>
            <div className="summary-items">
              {items.map(item => (
                <div key={item.product._id} className="summary-item">
                  <span>{item.product.name} x {item.quantity}</span>
                  <span>
                    <PriceDisplay 
                      price={(item.product.priceInCurrency || item.product.price) * item.quantity} 
                      currency={item.product.displayCurrency || 'USD'}
                    />
                  </span>
                </div>
              ))}
            </div>
            
            <div className="summary-total">
              <strong>Total: <PriceDisplay 
                price={totalPrice} 
                currency={items[0]?.product?.displayCurrency || 'USD'}
              /></strong>
            </div>
            
            <div className="payment-info">
              <p>Payment will be processed securely via Mollie</p>
              <p>Supports cards and cryptocurrency</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Checkout