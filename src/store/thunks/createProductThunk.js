import { createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/api'

export const createProductThunk = createAsyncThunk(
  'products/create',
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post('/products', payload)
      return res.data
    } catch (err) {
      return rejectWithValue(err.messageKey || 'toast.errorSaving')
    }
  },
)
