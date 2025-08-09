import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/config';

export const createBlogPost = createAsyncThunk(
  'adminBlog/createBlogPost',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/api/admin/blog', payload);
      return res.data.post;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || err.message);
    }
  }
);

export const updateBlogPost = createAsyncThunk(
  'adminBlog/updateBlogPost',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/api/admin/blog/${id}`, updates);
      return res.data.post;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || err.message);
    }
  }
);

export const deleteBlogPost = createAsyncThunk(
  'adminBlog/deleteBlogPost',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/api/admin/blog/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || err.message);
    }
  }
);

export const fetchAdminBlogPosts = createAsyncThunk(
  'adminBlog/fetchAdminBlogPosts',
  async ({ page = 1, limit = 20 } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', limit);
      const res = await api.get(`/api/admin/blog?${params}`);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || err.message);
    }
  }
);

export const uploadBlogImages = createAsyncThunk(
  'adminBlog/uploadBlogImages',
  async (files, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      Array.from(files).forEach(f => formData.append('images', f));
      const res = await api.post('/api/admin/blog/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data.images;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error?.message || err.message);
    }
  }
);

const adminBlogSlice = createSlice({
  name: 'adminBlog',
  initialState: {
    posts: [],
    isLoading: false,
    error: null,
    uploadProgress: 0,
    uploadedImages: [],
    pagination: { page: 1, limit: 20, total: 0 }
  },
  reducers: {
    clearAdminBlogError: (state) => { state.error = null; },
    clearUploadedBlogImages: (state) => { state.uploadedImages = []; state.uploadProgress = 0; }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminBlogPosts.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(fetchAdminBlogPosts.fulfilled, (s, a) => { s.isLoading = false; s.posts = a.payload.posts || []; s.pagination = a.payload.pagination; })
      .addCase(fetchAdminBlogPosts.rejected, (s, a) => { s.isLoading = false; s.error = a.payload; })

      .addCase(createBlogPost.pending, (s) => { s.isLoading = true; s.error = null; })
      .addCase(createBlogPost.fulfilled, (s, a) => { s.isLoading = false; s.posts.unshift(a.payload); })
      .addCase(createBlogPost.rejected, (s, a) => { s.isLoading = false; s.error = a.payload; })

      .addCase(updateBlogPost.fulfilled, (s, a) => {
        const idx = s.posts.findIndex(p => p._id === a.payload._id);
        if (idx !== -1) s.posts[idx] = a.payload;
      })
      .addCase(deleteBlogPost.fulfilled, (s, a) => {
        s.posts = s.posts.filter(p => p._id !== a.payload);
      })

      .addCase(uploadBlogImages.pending, (s) => { s.error = null; s.uploadProgress = 0; })
      .addCase(uploadBlogImages.fulfilled, (s, a) => { s.uploadedImages = a.payload; s.uploadProgress = 100; })
      .addCase(uploadBlogImages.rejected, (s, a) => { s.error = a.payload; s.uploadProgress = 0; });
  }
});

export const { clearAdminBlogError, clearUploadedBlogImages } = adminBlogSlice.actions;
export default adminBlogSlice.reducer;

