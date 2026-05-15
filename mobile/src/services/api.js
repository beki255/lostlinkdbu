import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  // Token would be retrieved from AsyncStorage in production
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  googleLogin: (credential) => api.post('/auth/google', { credential }),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  getMe: () => api.get('/auth/me'),
};

export const itemsAPI = {
  getAll: (params) => api.get('/items', { params }),
  getById: (id) => api.get(`/items/${id}`),
  create: (data) => api.post('/items', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const claimsAPI = {
  getAll: (params) => api.get('/claims', { params }),
  submit: (data) => api.post('/claims', data),
};

export default api;
