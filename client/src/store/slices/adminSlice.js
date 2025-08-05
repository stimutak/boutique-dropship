import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  ui: {
    sidebarCollapsed: false,
    currentPage: 'dashboard'
  },
  products: {
    filters: {},
    sortBy: 'createdAt',
    sortOrder: 'desc',
    currentPage: 1,
    itemsPerPage: 10
  },
  orders: {
    filters: {},
    sortBy: 'createdAt',
    sortOrder: 'desc',
    currentPage: 1,
    itemsPerPage: 10
  },
  users: {
    filters: {},
    sortBy: 'createdAt',
    sortOrder: 'desc',
    currentPage: 1,
    itemsPerPage: 10
  },
  settings: {
    categories: [],
    settingsByCategory: {},
    selectedCategory: 'general',
    loading: false,
    error: null,
    changes: {},
    hasUnsavedChanges: false
  }
};

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setSidebarCollapsed: (state, action) => {
      state.ui.sidebarCollapsed = action.payload;
    },
    setCurrentPage: (state, action) => {
      state.ui.currentPage = action.payload;
    },
    setFilters: (state, action) => {
      const { section, filters } = action.payload;
      if (state[section]) {
        state[section].filters = filters;
      }
    },
    setSortBy: (state, action) => {
      const { section, sortBy, sortOrder = 'desc' } = action.payload;
      if (state[section]) {
        state[section].sortBy = sortBy;
        state[section].sortOrder = sortOrder;
      }
    },
    clearFilters: (state, action) => {
      const { section } = action.payload;
      if (state[section]) {
        state[section].filters = {};
      }
    },
    setCurrentPageNumber: (state, action) => {
      const { section, page } = action.payload;
      if (state[section]) {
        state[section].currentPage = page;
      }
    },
    setItemsPerPage: (state, action) => {
      const { section, itemsPerPage } = action.payload;
      if (state[section]) {
        state[section].itemsPerPage = itemsPerPage;
        // Reset to first page when changing items per page
        state[section].currentPage = 1;
      }
    },
    // Settings actions
    setSettingsLoading: (state, action) => {
      state.settings.loading = action.payload;
    },
    setSettingsError: (state, action) => {
      state.settings.error = action.payload;
    },
    setSettingsCategories: (state, action) => {
      state.settings.categories = action.payload;
    },
    setSettingsByCategory: (state, action) => {
      state.settings.settingsByCategory = action.payload;
    },
    setSelectedCategory: (state, action) => {
      state.settings.selectedCategory = action.payload;
    },
    setSettingValue: (state, action) => {
      const { key, value } = action.payload;
      state.settings.changes[key] = value;
      state.settings.hasUnsavedChanges = true;
    },
    commitSettingChange: (state, action) => {
      const { key, value } = action.payload;
      // Update the setting in the category data
      Object.keys(state.settings.settingsByCategory).forEach(category => {
        const settings = state.settings.settingsByCategory[category];
        const settingIndex = settings.findIndex(s => s.key === key);
        if (settingIndex !== -1) {
          settings[settingIndex].value = value;
          settings[settingIndex].updatedAt = new Date().toISOString();
        }
      });
      // Remove from changes
      delete state.settings.changes[key];
      // Check if there are still unsaved changes
      state.settings.hasUnsavedChanges = Object.keys(state.settings.changes).length > 0;
    },
    revertSettingChange: (state, action) => {
      const { key } = action.payload;
      delete state.settings.changes[key];
      state.settings.hasUnsavedChanges = Object.keys(state.settings.changes).length > 0;
    },
    clearAllSettingChanges: (state) => {
      state.settings.changes = {};
      state.settings.hasUnsavedChanges = false;
    },
    updateSettingInCategory: (state, action) => {
      const { category, key, updates } = action.payload;
      if (state.settings.settingsByCategory[category]) {
        const settingIndex = state.settings.settingsByCategory[category].findIndex(s => s.key === key);
        if (settingIndex !== -1) {
          Object.assign(state.settings.settingsByCategory[category][settingIndex], updates);
        }
      }
    }
  }
});

export const {
  setSidebarCollapsed,
  setCurrentPage,
  setFilters,
  setSortBy,
  clearFilters,
  setCurrentPageNumber,
  setItemsPerPage,
  setSettingsLoading,
  setSettingsError,
  setSettingsCategories,
  setSettingsByCategory,
  setSelectedCategory,
  setSettingValue,
  commitSettingChange,
  revertSettingChange,
  clearAllSettingChanges,
  updateSettingInCategory
} = adminSlice.actions;

export default adminSlice.reducer;