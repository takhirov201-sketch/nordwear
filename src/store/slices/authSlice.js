import {createSlice} from '@reduxjs/toolkit'
import {register} from '../thunks/registerThunk'
import {login} from '../thunks/loginThunk'

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    loading: false,
    error: null
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload
    },
    logout: (state) => {
      state.user = null
    },
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    [login,register].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.loading = false;
          state.user = action.payload;
        })
        .addCase(thunk.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload;
        });
    });
  }
});

export const { setUser, logout, clearError } = authSlice.actions
export const selectUser = (state) => state.auth.user
export const selectIsLoggedIn = (state) => !!state.auth.user
export const selectIsAdmin = (state) => state.auth.user?.role === 'admin'
export default authSlice.reducer