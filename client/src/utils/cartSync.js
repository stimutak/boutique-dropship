// Cart synchronization utilities for handling authentication state changes

/**
 * Get current guest session ID
 */
export const getGuestSessionId = () => {
  if (!window.sessionStorage.getItem('guestSessionId')) {
    const sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    window.sessionStorage.setItem('guestSessionId', sessionId)
  }
  return window.sessionStorage.getItem('guestSessionId')
}

/**
 * Clear guest session data after successful merge
 */
export const clearGuestSession = () => {
  window.sessionStorage.removeItem('guestSessionId')
}

/**
 * Prepare guest cart data for merging
 */
export const prepareGuestCartForMerge = (cartItems) => {
  return {
    guestCartItems: cartItems.map(item => ({
      productId: item.product._id,
      quantity: item.quantity
    })),
    sessionId: getGuestSessionId()
  }
}

/**
 * Handle cart synchronization after authentication
 */
export const syncCartAfterAuth = async (dispatch, cartActions, authActions, cartItems) => {
  try {
    // Check if we have a valid guest session ID (indicates actual guest cart)
    const guestSessionId = window.sessionStorage.getItem('guestSessionId')
    const hasGuestSession = guestSessionId && guestSessionId.startsWith('guest_')
    
    // Check if we just logged out (flag to prevent immediate re-merge)
    const justLoggedOut = window.sessionStorage.getItem('justLoggedOut') === 'true'
    
    if (cartItems && cartItems.length > 0 && hasGuestSession && !justLoggedOut) {
      // Only merge if we have actual guest cart items AND haven't just logged out
      console.log('Merging guest cart with', cartItems.length, 'items')
      const mergeData = prepareGuestCartForMerge(cartItems)
      await dispatch(cartActions.mergeGuestCart(mergeData)).unwrap()
    } else {
      // Just fetch user's existing cart (no merge needed)
      console.log('Fetching user cart without merge')
      await dispatch(cartActions.fetchCart()).unwrap()
    }
    
    // Clear the logout flag after sync
    window.sessionStorage.removeItem('justLoggedOut')
    
    return { success: true }
  } catch (error) {
    console.error('Cart synchronization failed:', error)
    
    // Fallback: fetch user cart to ensure we have something
    try {
      await dispatch(cartActions.fetchCart()).unwrap()
    } catch (fetchError) {
      console.error('Fallback cart fetch failed:', fetchError)
    }
    
    return { success: false, error }
  }
}

/**
 * Handle cart state on logout
 */
export const handleCartOnLogout = (dispatch, cartActions) => {
  // Clear any user cart data and reset to guest state
  dispatch(cartActions.clearAfterMerge())
  
  // Generate new guest session
  clearGuestSession()
  getGuestSessionId()
}

/**
 * Monitor cart sync status and provide user feedback
 */
export const getCartSyncStatusMessage = (syncStatus, error) => {
  switch (syncStatus) {
    case 'syncing':
      return 'Synchronizing your cart...'
    case 'synced':
      return 'Cart synchronized successfully'
    case 'error':
      return error || 'Cart synchronization failed'
    default:
      return null
  }
}