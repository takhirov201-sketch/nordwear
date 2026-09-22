import { createAsyncThunk } from '@reduxjs/toolkit'
import api, { setToken } from '../../api/api'

export const register = createAsyncThunk(
  'auth/register',
  async ({ name, email, password }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/register', {
        name,
        email: email?.trim()?.toLowerCase(),
        password,
      })
      setToken(res.data.token)
      return res.data.user
    } catch (err) {
      return rejectWithValue(err.messageKey || 'auth.registerError')
    }
  },
)
