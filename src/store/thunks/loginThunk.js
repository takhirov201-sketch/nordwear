import { createAsyncThunk } from '@reduxjs/toolkit'
import api, { setToken } from '../../api/api'

export const login = createAsyncThunk(
    'auth/login',
    async ({ email, password }, { rejectWithValue }) => {
        try {
            const res = await api.post('/auth/login', {
                email: email?.trim()?.toLowerCase(),
                password,
            })
            // the server returns the user without any password field
            setToken(res.data.token)
            return res.data.user
        } catch (err) {
            return rejectWithValue(err.messageKey || 'auth.invalidCredentials')
        }
    },
);
