import { createSlice, createSelector } from '@reduxjs/toolkit'
import {getProducts} from '../thunks/getProductsThunk'
import {deleteProductThunk} from '../thunks/deleteProductThunk'
import {createProductThunk} from '../thunks/createProductThunk'
import {updateProductThunk} from '../thunks/updateProductThunk'

const productSlice = createSlice({
  name: 'products',
  initialState: {
    list: [],
    loading: false,
    error: null,
    sortOption: 'newest',
  },
  reducers: {
    setSortOption: (state, action) => {
      state.sortOption = action.payload
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getProducts.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(getProducts.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload.map((product) => ({
          ...product,
          image: product.image?.trim() || '/logo.png',
        }))
      })
      .addCase(getProducts.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(createProductThunk.fulfilled, (state, action) => {
        state.list.unshift({
          ...action.payload,
          image: action.payload.image?.trim() || '/logo.png',
        })
      })
      .addCase(updateProductThunk.fulfilled, (state, action) => {
        const index = state.list.findIndex((p) => String(p.id) === String(action.payload.id))
        if (index !== -1) {
          state.list[index] = {
            ...action.payload,
            image: action.payload.image?.trim() || '/logo.png',
          }
        }
      })
      .addCase(deleteProductThunk.fulfilled, (state, action) => {
        state.list = state.list.filter((product) => String(product.id) !== String(action.payload))
      })
  },
})

export const { setSortOption } = productSlice.actions
export const selectAllProducts = (state) => state.products?.list || []
export const selectProductsLoading = (state) => state.products?.loading
export const selectProductsError = (state) => state.products?.error
export const selectProductsSortOption = (state) => state.products?.sortOption || 'newest'

export const selectSortedProducts = createSelector(
  [selectAllProducts, selectProductsSortOption],
  (products, sortOption) => {
    return [...products].sort((a, b) => {
      switch (sortOption) {
        case 'price-asc':
          return a.price - b.price
        case 'price-desc':
          return b.price - a.price
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'newest':
        default:
          return Number(b.id) - Number(a.id)
      }
    })
  }
)

export default productSlice.reducer