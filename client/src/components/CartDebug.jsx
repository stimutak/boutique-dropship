import { useDispatch, useSelector } from 'react-redux'
import { hardResetCart, clearCart, fetchCart } from '../store/slices/cartSlice'
import api from '../api/config'
import { useState } from 'react'

const CartDebug = () => {
  const dispatch = useDispatch()
  const { items, totalItems, syncStatus } = useSelector(state => state.cart)
  const { isAuthenticated } = useSelector(state => state.auth)
  const [debugInfo, setDebugInfo] = useState(null)

  const handleHardReset = () => {
    dispatch(hardResetCart())
  }

  const handleClearCart = () => {
    dispatch(clearCart())
  }

  const handleFetchCart = () => {
    dispatch(fetchCart())
  }

  const handleDebugInfo = async () => {
    try {
      const response = await api.get('/api/cart/debug')
      setDebugInfo(response.data.data)
    } catch (error) {
      console.error('Debug info failed:', error)
      setDebugInfo({ error: error.message })
    }
  }

  const handleClearSession = () => {
    window.sessionStorage.clear()
    window.location.reload()
  }

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px', 
      background: 'rgba(240, 240, 240, 0.95)', 
      padding: '8px', 
      border: '1px solid #ccc',
      borderRadius: '5px',
      fontSize: '11px',
      zIndex: 1000,
      maxWidth: '250px',
      maxHeight: '300px',
      overflow: 'auto'
    }}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '12px' }}>Cart Debug</h4>
      
      <div>
        <strong>Status:</strong> {isAuthenticated ? 'Authenticated' : 'Guest'}<br/>
        <strong>Items:</strong> {totalItems}<br/>
        <strong>Sync:</strong> {syncStatus}<br/>
        <strong>Session ID:</strong> {window.sessionStorage.getItem('guestSessionId')?.substring(0, 20)}...
      </div>

      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
        <button onClick={handleFetchCart} style={{ fontSize: '9px', padding: '2px 4px' }}>
          Refresh
        </button>
        <button onClick={handleClearCart} style={{ fontSize: '9px', padding: '2px 4px' }}>
          Clear
        </button>
        <button onClick={handleHardReset} style={{ fontSize: '9px', padding: '2px 4px' }}>
          Reset
        </button>
        <button onClick={handleDebugInfo} style={{ fontSize: '9px', padding: '2px 4px' }}>
          Debug
        </button>
        <button onClick={handleClearSession} style={{ fontSize: '9px', padding: '2px 4px' }}>
          Session
        </button>
      </div>

      {debugInfo && (
        <div style={{ marginTop: '10px', fontSize: '10px', maxHeight: '200px', overflow: 'auto' }}>
          <strong>Debug Info:</strong>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}

      <div style={{ marginTop: '10px', fontSize: '10px' }}>
        <strong>Current Cart Items:</strong>
        {items.map((item, index) => (
          <div key={index}>
            {item.product?.name || 'Unknown'} x{item.quantity}
          </div>
        ))}
      </div>
    </div>
  )
}

export default CartDebug