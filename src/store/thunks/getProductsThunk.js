import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const getProducts = createAsyncThunk(
  'products/getAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/products')
      return Array.isArray(res.data) ? res.data : []
    } catch (error) {
      return rejectWithValue(error.messageKey || 'products.error')
    }
  },
)
