import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/config';

// Fetch reviews for a product
export const fetchProductReviews = createAsyncThunk(
  'reviews/fetchProductReviews',
  async ({ productId, page = 1, limit = 10 }) => {
    const response = await api.get(`/reviews/${productId}?page=${page}&limit=${limit}`);
    return response.data;
  }
);

// Submit a new review
export const submitReview = createAsyncThunk(
  'reviews/submitReview',
  async ({ productId, rating, comment }) => {
    const response = await api.post('/reviews', { productId, rating, comment });
    return response.data;
  }
);

// Mark review as helpful
export const markReviewHelpful = createAsyncThunk(
  'reviews/markHelpful',
  async ({ reviewId, helpful }) => {
    const response = await api.put(`/reviews/${reviewId}/helpful`, { helpful });
    return response.data;
  }
);

// Fetch user's own reviews
export const fetchMyReviews = createAsyncThunk(
  'reviews/fetchMyReviews',
  async ({ page = 1, limit = 10 }) => {
    const response = await api.get(`/reviews/user/my-reviews?page=${page}&limit=${limit}`);
    return response.data;
  }
);

// Admin: Fetch all reviews
export const fetchAllReviews = createAsyncThunk(
  'reviews/fetchAllReviews',
  async ({ page = 1, limit = 20, status, productId, userId }) => {
    const params = new URLSearchParams({ page, limit });
    if (status) params.append('status', status);
    if (productId) params.append('productId', productId);
    if (userId) params.append('userId', userId);
    
    const response = await api.get(`/admin/reviews?${params}`);
    return response.data;
  }
);

// Admin: Approve review
export const approveReview = createAsyncThunk(
  'reviews/approveReview',
  async ({ reviewId, adminNotes }) => {
    const response = await api.put(`/admin/reviews/${reviewId}/approve`, { adminNotes });
    return response.data;
  }
);

// Admin: Reject review
export const rejectReview = createAsyncThunk(
  'reviews/rejectReview',
  async ({ reviewId, adminNotes }) => {
    const response = await api.put(`/admin/reviews/${reviewId}/reject`, { adminNotes });
    return response.data;
  }
);

// Admin: Delete review
export const deleteReview = createAsyncThunk(
  'reviews/deleteReview',
  async (reviewId) => {
    await api.delete(`/admin/reviews/${reviewId}`);
    return reviewId;
  }
);

// Admin: Fetch review stats
export const fetchReviewStats = createAsyncThunk(
  'reviews/fetchStats',
  async () => {
    const response = await api.get('/admin/reviews/stats');
    return response.data;
  }
);

const initialState = {
  // Product reviews
  productReviews: {},
  productReviewsLoading: {},
  productReviewsError: {},
  
  // User's reviews
  myReviews: [],
  myReviewsLoading: false,
  myReviewsError: null,
  myReviewsPagination: null,
  
  // Admin reviews
  allReviews: [],
  allReviewsLoading: false,
  allReviewsError: null,
  allReviewsPagination: null,
  
  // Review stats
  stats: null,
  statsLoading: false,
  statsError: null,
  
  // Submit review state
  submitLoading: false,
  submitError: null,
  submitSuccess: false,
};

const reviewsSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {
    clearSubmitState: (state) => {
      state.submitLoading = false;
      state.submitError = null;
      state.submitSuccess = false;
    },
    clearErrors: (state) => {
      state.productReviewsError = {};
      state.myReviewsError = null;
      state.allReviewsError = null;
      state.statsError = null;
      state.submitError = null;
    },
    clearProductError: (state, action) => {
      const productId = action.payload;
      if (state.productReviewsError[productId]) {
        state.productReviewsError[productId] = null;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch product reviews
    builder
      .addCase(fetchProductReviews.pending, (state, action) => {
        const { productId } = action.meta.arg;
        state.productReviewsLoading[productId] = true;
        state.productReviewsError[productId] = null;
      })
      .addCase(fetchProductReviews.fulfilled, (state, action) => {
        const { productId } = action.meta.arg;
        state.productReviewsLoading[productId] = false;
        state.productReviews[productId] = action.payload;
        state.productReviewsError[productId] = null;
      })
      .addCase(fetchProductReviews.rejected, (state, action) => {
        const { productId } = action.meta.arg;
        state.productReviewsLoading[productId] = false;
        state.productReviewsError[productId] = action.error.message || 'Failed to load reviews';
      });

    // Submit review
    builder
      .addCase(submitReview.pending, (state) => {
        state.submitLoading = true;
        state.submitError = null;
        state.submitSuccess = false;
      })
      .addCase(submitReview.fulfilled, (state) => {
        state.submitLoading = false;
        state.submitSuccess = true;
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.submitLoading = false;
        state.submitError = action.error.message;
      });

    // Mark helpful
    builder
      .addCase(markReviewHelpful.fulfilled, (state, action) => {
        const { reviewId } = action.meta.arg;
        const { helpfulCount, unhelpfulCount, userVote } = action.payload;
        
        // Update the review in product reviews
        Object.values(state.productReviews).forEach(productData => {
          if (productData.reviews) {
            const review = productData.reviews.find(r => r._id === reviewId);
            if (review) {
              review.helpfulCount = helpfulCount;
              review.unhelpfulCount = unhelpfulCount;
              review.userVote = userVote;
            }
          }
        });
      });

    // Fetch my reviews
    builder
      .addCase(fetchMyReviews.pending, (state) => {
        state.myReviewsLoading = true;
        state.myReviewsError = null;
      })
      .addCase(fetchMyReviews.fulfilled, (state, action) => {
        state.myReviewsLoading = false;
        state.myReviews = action.payload.reviews;
        state.myReviewsPagination = action.payload.pagination;
      })
      .addCase(fetchMyReviews.rejected, (state, action) => {
        state.myReviewsLoading = false;
        state.myReviewsError = action.error.message;
      });

    // Admin: Fetch all reviews
    builder
      .addCase(fetchAllReviews.pending, (state) => {
        state.allReviewsLoading = true;
        state.allReviewsError = null;
      })
      .addCase(fetchAllReviews.fulfilled, (state, action) => {
        state.allReviewsLoading = false;
        state.allReviews = action.payload.reviews;
        state.allReviewsPagination = action.payload.pagination;
      })
      .addCase(fetchAllReviews.rejected, (state, action) => {
        state.allReviewsLoading = false;
        state.allReviewsError = action.error.message;
      });

    // Admin: Approve review
    builder
      .addCase(approveReview.fulfilled, (state, action) => {
        const review = state.allReviews.find(r => r._id === action.payload._id);
        if (review) {
          review.status = 'approved';
          review.moderatedBy = action.payload.moderatedBy;
          review.moderatedAt = action.payload.moderatedAt;
          review.adminNotes = action.payload.adminNotes;
        }
      });

    // Admin: Reject review
    builder
      .addCase(rejectReview.fulfilled, (state, action) => {
        const review = state.allReviews.find(r => r._id === action.payload._id);
        if (review) {
          review.status = 'rejected';
          review.moderatedBy = action.payload.moderatedBy;
          review.moderatedAt = action.payload.moderatedAt;
          review.adminNotes = action.payload.adminNotes;
        }
      });

    // Admin: Delete review
    builder
      .addCase(deleteReview.fulfilled, (state, action) => {
        state.allReviews = state.allReviews.filter(r => r._id !== action.payload);
      });

    // Admin: Fetch stats
    builder
      .addCase(fetchReviewStats.pending, (state) => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(fetchReviewStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchReviewStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.error.message;
      });
  },
});

export const { clearSubmitState, clearErrors, clearProductError } = reviewsSlice.actions;

export default reviewsSlice.reducer;