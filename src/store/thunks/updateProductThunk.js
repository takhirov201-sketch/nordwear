import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const updateProductThunk = createAsyncThunk(
  'products/update',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.put(`/products/${payload.id}`, payload)
      return res.data
    } catch (err) {
      return rejectWithValue(err.messageKey || 'toast.errorSaving')
    }
  },
)
