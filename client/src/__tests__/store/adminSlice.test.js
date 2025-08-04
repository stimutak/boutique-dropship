import { configureStore } from '@reduxjs/toolkit';
import adminReducer, { 
  setSidebarCollapsed, 
  setCurrentPage, 
  setFilters,
  setSortBy,
  clearFilters
} from '../../store/slices/adminSlice';

describe('adminSlice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        admin: adminReducer
      }
    });
  });

  test('should have correct initial state', () => {
    const state = store.getState().admin;
    
    expect(state.ui.sidebarCollapsed).toBe(false);
    expect(state.ui.currentPage).toBe('dashboard');
    expect(state.products.filters).toEqual({});
    expect(state.products.sortBy).toBe('createdAt');
    expect(state.orders.filters).toEqual({});
    expect(state.orders.sortBy).toBe('createdAt');
  });

  test('setSidebarCollapsed should toggle sidebar state', () => {
    const initialState = store.getState().admin.ui.sidebarCollapsed;
    
    store.dispatch(setSidebarCollapsed(true));
    expect(store.getState().admin.ui.sidebarCollapsed).toBe(true);
    
    store.dispatch(setSidebarCollapsed(false));
    expect(store.getState().admin.ui.sidebarCollapsed).toBe(false);
  });

  test('setCurrentPage should update current page', () => {
    store.dispatch(setCurrentPage('products'));
    expect(store.getState().admin.ui.currentPage).toBe('products');
    
    store.dispatch(setCurrentPage('orders'));
    expect(store.getState().admin.ui.currentPage).toBe('orders');
  });

  test('setFilters should update filters for products', () => {
    const filters = { category: 'crystals', status: 'active' };
    
    store.dispatch(setFilters({ section: 'products', filters }));
    expect(store.getState().admin.products.filters).toEqual(filters);
  });

  test('setFilters should update filters for orders', () => {
    const filters = { status: 'pending', dateRange: '30days' };
    
    store.dispatch(setFilters({ section: 'orders', filters }));
    expect(store.getState().admin.orders.filters).toEqual(filters);
  });

  test('setSortBy should update sort for products', () => {
    store.dispatch(setSortBy({ section: 'products', sortBy: 'name' }));
    expect(store.getState().admin.products.sortBy).toBe('name');
  });

  test('setSortBy should update sort for orders', () => {
    store.dispatch(setSortBy({ section: 'orders', sortBy: 'total' }));
    expect(store.getState().admin.orders.sortBy).toBe('total');
  });

  test('clearFilters should reset filters for products', () => {
    // First set some filters
    store.dispatch(setFilters({ section: 'products', filters: { category: 'crystals' } }));
    expect(store.getState().admin.products.filters).toEqual({ category: 'crystals' });
    
    // Then clear them
    store.dispatch(clearFilters({ section: 'products' }));
    expect(store.getState().admin.products.filters).toEqual({});
  });

  test('clearFilters should reset filters for orders', () => {
    // First set some filters
    store.dispatch(setFilters({ section: 'orders', filters: { status: 'pending' } }));
    expect(store.getState().admin.orders.filters).toEqual({ status: 'pending' });
    
    // Then clear them
    store.dispatch(clearFilters({ section: 'orders' }));
    expect(store.getState().admin.orders.filters).toEqual({});
  });
});