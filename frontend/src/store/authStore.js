import { create } from 'zustand';
import { axiosClient } from '../api/axiosClient';

export const useAuthStore = create((set, get) => ({
  user: (() => {
    try {
      const saved = localStorage.getItem('hpmbs_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  })(),
  token: localStorage.getItem('hpmbs_access_token') || null,
  isAuthenticated: !!localStorage.getItem('hpmbs_access_token'),
  isLoading: !!localStorage.getItem('hpmbs_access_token'),
  error: null,
  activeBranchId: localStorage.getItem('hpmbs_active_branch_id') || null,
  activeBranchName: localStorage.getItem('hpmbs_active_branch_name') || null,

  setActiveBranch: (branchId, branchName) => {
    if (branchId) {
      localStorage.setItem('hpmbs_active_branch_id', branchId);
      localStorage.setItem('hpmbs_active_branch_name', branchName || '');
    } else {
      localStorage.removeItem('hpmbs_active_branch_id');
      localStorage.removeItem('hpmbs_active_branch_name');
    }
    set({
      activeBranchId: branchId || null,
      activeBranchName: branchName || null,
    });
  },

  login: async (email, password, hospitalDomain = null) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosClient.post('/auth/login', { email, password, hospitalDomain });
      const payload = response?.data || response;
      const user = payload?.user || payload?.data?.user;
      const tokens = payload?.tokens || payload?.data?.tokens;

      if (!user || !tokens?.accessToken) {
        throw new Error('The server returned an invalid login response.');
      }

      localStorage.removeItem('hpmbs_super_admin_context');
      localStorage.setItem('hpmbs_access_token', tokens.accessToken);
      localStorage.setItem('hpmbs_user', JSON.stringify(user));

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

  patientLogin: async (mobileNumber, dob, hospitalDomain = null) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosClient.post('/auth/patient-login', { mobileNumber, dob, hospitalDomain });
      const payload = response?.data || response;
      const user = payload?.user || payload?.data?.user;
      const tokens = payload?.tokens || payload?.data?.tokens;

      if (!user || !tokens?.accessToken) {
        throw new Error('The server returned an invalid login response.');
      }

      localStorage.removeItem('hpmbs_super_admin_context');
      localStorage.setItem('hpmbs_access_token', tokens.accessToken);
      localStorage.setItem('hpmbs_user', JSON.stringify(user));

      set({
        user,
        token: tokens.accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return user;
    } catch (err) {
      const message = err.error?.message || err.message || 'Patient login failed';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  guardianLogin: async (guardianMobile, patientMobile, patientNumber, hospitalDomain = null) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axiosClient.post('/auth/guardian-login', { guardianMobile, patientMobile, patientNumber, hospitalDomain });
      const payload = response?.data || response;
      const user = payload?.user || payload?.data?.user;
      const tokens = payload?.tokens || payload?.data?.tokens;

      if (!user || !tokens?.accessToken) {
        throw new Error('The server returned an invalid login response.');
      }

      localStorage.removeItem('hpmbs_super_admin_context');
      localStorage.setItem('hpmbs_access_token', tokens.accessToken);
      localStorage.setItem('hpmbs_user', JSON.stringify(user));

      set({
        user,
        token: tokens.accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      return user;
    } catch (err) {
      const message = err.error?.message || err.message || 'Guardian login failed';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  fetchProfile: async () => {
    if (!get().token) {
      localStorage.removeItem('hpmbs_user');
      localStorage.removeItem('hpmbs_super_admin_context');
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }
    try {
      const response = await axiosClient.get('/auth/me');
      const userData = response?.data || response?.user || response;
      if (userData && (userData.id || userData._id || userData.role)) {
        localStorage.setItem('hpmbs_user', JSON.stringify(userData));
        set({ user: userData, isAuthenticated: true, isLoading: false });
      }
    } catch (err) {
      localStorage.removeItem('hpmbs_access_token');
      localStorage.removeItem('hpmbs_user');
      localStorage.removeItem('hpmbs_super_admin_context');
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
      localStorage.removeItem('hpmbs_user');
      localStorage.removeItem('hpmbs_super_admin_context');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
