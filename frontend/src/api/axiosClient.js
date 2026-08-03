import axios from 'axios';

export const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hpmbs_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const stored = localStorage.getItem('hpmbs_super_admin_context');
      if (stored) {
        const parsed = JSON.parse(stored);
        const hospitalId = parsed?.state?.selectedHospitalId;
        if (hospitalId) {
          config.headers['X-Hospital-Context'] = hospitalId;
        }
      }
    } catch {
      // ignore parse errors
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401 || (error.response?.status === 403 && error.response?.data?.error?.message?.includes('Required role'))) {
      localStorage.removeItem('hpmbs_access_token');
      localStorage.removeItem('hpmbs_user');
      localStorage.removeItem('hpmbs_super_admin_context');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const errorResponse = error.response?.data || {
      success: false,
      statusCode: error.response?.status || 500,
      error: {
        code: 'NETWORK_ERROR',
        message: error.message || 'Server connection failed',
      },
    };
    return Promise.reject(errorResponse);
  }
);
