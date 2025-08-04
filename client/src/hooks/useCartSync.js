import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCart, mergeGuestCart, setSyncStatus } from '../store/slices/cartSlice';
import { syncCartAfterAuth, handleCartOnLogout, getCartSyncStatusMessage } from '../utils/cartSync';

/**
 * Custom hook for managing cart synchronization across authentication states
 */
export const useCartSync = () => {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector(state => state.auth);
  const { items: cartItems, syncStatus, error: cartError } = useSelector(state => state.cart);
  const [syncMessage, setSyncMessage] = useState('');

  // Update sync message when status changes
  useEffect(() => {
    const message = getCartSyncStatusMessage(syncStatus, cartError);
    setSyncMessage(message || '');
  }, [syncStatus, cartError]);

  // Handle cart sync on authentication changes
  const syncCart = async (authChanged = false) => {
    if (isAuthenticated && authChanged) {
      const cartActions = { mergeGuestCart, fetchCart };
      const result = await syncCartAfterAuth(dispatch, cartActions, null, cartItems);
      return result;
    } else if (isAuthenticated) {
      // Just fetch current cart
      try {
        await dispatch(fetchCart()).unwrap();
        return { success: true };
      } catch (error) {
        return { success: false, error };
      }
    }
    return { success: true };
  };

  // Handle logout cart cleanup
  const handleLogout = () => {
    const cartActions = { clearAfterMerge: () => ({ type: 'cart/clearAfterMerge' }) };
    handleCartOnLogout(dispatch, cartActions);
  };

  // Manual sync trigger
  const triggerSync = () => {
    dispatch(setSyncStatus('syncing'));
    return syncCart(false);
  };

  return {
    syncStatus,
    syncMessage,
    syncCart,
    handleLogout,
    triggerSync,
    isAuthenticated
  };
};

/**
 * Hook specifically for authentication flows (login/register)
 */
export const useAuthCartSync = () => {
  const dispatch = useDispatch();
  const { items: cartItems, totalItems } = useSelector(state => state.cart);
  const [syncMessage, setSyncMessage] = useState('');

  const prepareForAuth = () => {
    if (totalItems > 0) {
      // Prepare cart data for merge
      return {
        guestCartItems: cartItems.map(item => ({
          productId: item.product._id,
          quantity: item.quantity
        })),
        sessionId: window.sessionStorage.getItem('guestSessionId')
      };
    }
    return null;
  };

  const syncAfterAuth = async () => {
    const cartActions = { mergeGuestCart, fetchCart };
    const result = await syncCartAfterAuth(dispatch, cartActions, null, cartItems);
    
    if (result.success) {
      setSyncMessage('Cart synchronized successfully!');
    } else {
      setSyncMessage('Cart sync completed with some issues.');
    }
    
    return result;
  };

  return {
    prepareForAuth,
    syncAfterAuth,
    syncMessage,
    setSyncMessage,
    hasGuestItems: totalItems > 0
  };
};