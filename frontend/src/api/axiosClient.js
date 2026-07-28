import axios from 'axios';

export const axiosClient = axios.create({
  baseURL: '/api/v1',
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
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hpmbs_access_token');
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
