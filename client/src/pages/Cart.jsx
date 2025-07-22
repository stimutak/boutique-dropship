import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { 
  fetchCart, 
  updateCartItem, 
  removeFromCart, 
  clearCart
} from '../store/slices/cartSlice'

const Cart = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { items, totalItems, totalPrice, isLoading } = useSelector(state => state.cart)
  const { isAuthenticated } = useSelector(state => state.auth)

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchCart())
    }
  }, [dispatch, isAuthenticated])

  const handleUpdateQuantity = (productId, quantity) => {
    if (quantity < 1) return
    
    // Always use API endpoints - backend handles both authenticated and guest carts
    dispatch(updateCartItem({ productId, quantity }))
  }

  const handleRemoveItem = (productId) => {
    // Always use API endpoints - backend handles both authenticated and guest carts
    dispatch(removeFromCart(productId))
  }

  const handleClearCart = () => {
    if (window.confirm('Are you sure you want to clear your cart?')) {
      // Always use API endpoints - backend handles both authenticated and guest carts
      dispatch(clearCart())
    }
  }

  const handleCheckout = () => {
    navigate('/checkout')
  }

  if (isLoading) {
    return <div className="loading">Loading cart...</div>
  }

  return (
    <div className="cart-page">
      <div className="container">
        <h1>Shopping Cart</h1>
        
        {items.length === 0 ? (
          <div className="empty-cart">
            <p>Your cart is empty</p>
            <Link to="/products" className="btn btn-primary">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {items.map(item => (
                <div key={item.product._id} className="cart-item">
                  <div className="item-image">
                    {item.product.images && item.product.images.length > 0 ? (
                      <img src={item.product.images[0].url} alt={item.product.images[0].alt || item.product.name} />
                    ) : (
                      <div className="placeholder-image">No Image</div>
                    )}
                  </div>
                  
                  <div className="item-details">
                    <Link to={`/products/${item.product.slug}`}>
                      <h3>{item.product.name}</h3>
                    </Link>
                    <p className="category">{item.product.category}</p>
                    <p className="price">${item.product.price.toFixed(2)} each</p>
                  </div>
                  
                  <div className="item-quantity">
                    <button 
                      onClick={() => handleUpdateQuantity(item.product._id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                    >
                      -
                    </button>
                    <span>{item.quantity}</span>
                    <button 
                      onClick={() => handleUpdateQuantity(item.product._id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  
                  <div className="item-total">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </div>
                  
                  <button 
                    className="remove-item"
                    onClick={() => handleRemoveItem(item.product._id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <div className="summary-row">
                <span>Total Items: {totalItems}</span>
              </div>
              <div className="summary-row total">
                <span>Total: ${totalPrice.toFixed(2)}</span>
              </div>
              
              <div className="cart-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={handleClearCart}
                >
                  Clear Cart
                </button>
                
                <Link to="/products" className="btn btn-secondary">
                  Continue Shopping
                </Link>
                
                <button 
                  className="btn btn-primary"
                  onClick={handleCheckout}
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Cart