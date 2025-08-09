import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import productsReducer from './slices/productsSlice';
import cartReducer from './slices/cartSlice';
import ordersReducer from './slices/ordersSlice';
import reviewsReducer from './slices/reviewsSlice';
import adminReducer from './slices/adminSlice';
import adminProductsReducer from './slices/adminProductsSlice';
import blogReducer from './slices/blogSlice';
import adminBlogReducer from './slices/adminBlogSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productsReducer,
    cart: cartReducer,
    orders: ordersReducer,
    reviews: reviewsReducer,
    admin: adminReducer,
    adminProducts: adminProductsReducer,
    blog: blogReducer,
    adminBlog: adminBlogReducer
  }
});
