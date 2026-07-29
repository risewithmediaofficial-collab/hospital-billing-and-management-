import { create } from 'zustand';
import { axiosClient } from '../api/axiosClient';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('hpmbs_access_token') || null,
  isAuthenticated: !!localStorage.getItem('hpmbs_access_token'),
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosClient.post('/auth/login', { email, password });
      const payload = response.data?.data || response.data;
      const { user, tokens } = payload;

      localStorage.setItem('hpmbs_access_token', tokens.accessToken);

      set({
        user,
        token: tokens.accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return user;
    } catch (err) {
      const message = err.error?.message || err.message || 'Login failed';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  fetchProfile: async () => {
    if (!get().token) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }
    try {
      const response = await axiosClient.get('/auth/me');
      const userData = response.data?.data || response.data;
      set({ user: userData, isAuthenticated: true, isLoading: false });
    } catch (err) {
      localStorage.removeItem('hpmbs_access_token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  logout: async () => {
    try {
      await axiosClient.post('/auth/logout');
    } catch (err) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('hpmbs_access_token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
