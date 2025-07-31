import { createSlice } from '@reduxjs/toolkit'

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
  }
}

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setSidebarCollapsed: (state, action) => {
      state.ui.sidebarCollapsed = action.payload
    },
    setCurrentPage: (state, action) => {
      state.ui.currentPage = action.payload
    },
    setFilters: (state, action) => {
      const { section, filters } = action.payload
      if (state[section]) {
        state[section].filters = filters
      }
    },
    setSortBy: (state, action) => {
      const { section, sortBy, sortOrder = 'desc' } = action.payload
      if (state[section]) {
        state[section].sortBy = sortBy
        state[section].sortOrder = sortOrder
      }
    },
    clearFilters: (state, action) => {
      const { section } = action.payload
      if (state[section]) {
        state[section].filters = {}
      }
    },
    setCurrentPageNumber: (state, action) => {
      const { section, page } = action.payload
      if (state[section]) {
        state[section].currentPage = page
      }
    },
    setItemsPerPage: (state, action) => {
      const { section, itemsPerPage } = action.payload
      if (state[section]) {
        state[section].itemsPerPage = itemsPerPage
        // Reset to first page when changing items per page
        state[section].currentPage = 1
      }
    }
  }
})

export const {
  setSidebarCollapsed,
  setCurrentPage,
  setFilters,
  setSortBy,
  clearFilters,
  setCurrentPageNumber,
  setItemsPerPage
} = adminSlice.actions

export default adminSlice.reducer