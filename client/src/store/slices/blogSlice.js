import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/config';

export const fetchBlogPosts = createAsyncThunk(
  'blog/fetchBlogPosts',
  async ({ page = 1, limit = 2 } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      const res = await api.get(`/api/blog?${params}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || err.message);
    }
  }
);

export const fetchBlogPostBySlug = createAsyncThunk(
  'blog/fetchBlogPostBySlug',
  async (slug, { rejectWithValue }) => {
    try {
      const res = await api.get(`/api/blog/${slug}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || err.message);
    }
  }
);

const blogSlice = createSlice({
  name: 'blog',
  initialState: {
    posts: [],
    currentPost: null,
    isLoading: false,
    error: null,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalItems: 0,
      perPage: 2,
      hasNextPage: false,
      hasPrevPage: false
    }
  },
  reducers: {
    clearCurrentPost: (state) => { state.currentPost = null; },
    clearBlogError: (state) => { state.error = null; }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBlogPosts.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchBlogPosts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.posts = action.payload.data.posts;
        state.pagination = action.payload.data.pagination;
      })
      .addCase(fetchBlogPosts.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })

      .addCase(fetchBlogPostBySlug.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchBlogPostBySlug.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentPost = action.payload.data.post;
      })
      .addCase(fetchBlogPostBySlug.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; });
  }
});

export const { clearCurrentPost, clearBlogError } = blogSlice.actions;
export default blogSlice.reducer;

