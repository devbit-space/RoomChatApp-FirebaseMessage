import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  showSignUp: false,
  user: null,
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    toggleSignUp: (state) => {
      state.showSignUp = !state.showSignUp;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    }
  }
});

export const { toggleSignUp, setUser, setLoading, setError } = authSlice.actions;
export default authSlice.reducer; 