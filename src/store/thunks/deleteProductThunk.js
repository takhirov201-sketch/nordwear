import {createAsyncThunk} from '@reduxjs/toolkit';
import api from '../../api/api';

export const deleteProductThunk = createAsyncThunk(
  'products/delete',
  async (id, { rejectWithValue }) => {
    try {
        await api.delete(`/products/${id}`);
        return id; 
    } catch (err) {
        return rejectWithValue(err.messageKey || 'toast.errorDeleting');
    }
    }
)