import axios from 'axios';
import { getToken, clearAuth } from '../utils/auth';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const lang = localStorage.getItem('language') || 'en';
  config.headers['Accept-Language'] = lang;
  return config;
});

class ApiError extends Error {
  constructor(message, serverErrors) {
    super(message);
    this.serverErrors = serverErrors || [];
  }
}

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
      window.location.href = '/login';
    }
    const data = error.response?.data || {};
    const message = data.message || error.message || 'Something went wrong';
    return Promise.reject(new ApiError(message, data.errors));
  }
);

export const auth = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  googleLogin: (credential) => api.post('/auth/google', { credential }),
  verifyEmail: (data) => api.post('/auth/verify-email', data),
  resendOtp: (data) => api.post('/auth/resend-otp', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const items = {
  getAll: (params) => api.get('/items', { params }),
  getById: (id) => api.get(`/items/${id}`),
  create: (data) => api.post('/items', data),
  update: (id, data) => api.patch(`/items/${id}`, data),
  delete: (id) => api.delete(`/items/${id}`),
  runAiMatching: (id) => api.post(`/items/${id}/ai-matches`),
  getNoMatchExplanation: (id) => api.post(`/items/${id}/no-match-explanation`),
  search: (params) => api.get('/items/search', { params }),
};

export const claims = {
  getAll: (params) => api.get('/claims', { params }),
  getById: (id) => api.get(`/claims/${id}`),
  submit: (data) => api.post('/claims', data),
  review: (id, data) => api.patch(`/claims/${id}/review`, data),
};

export const matches = {
  getAll: () => api.get('/matches'),
  getById: (id) => api.get(`/matches/${id}`),
  createManualMatch: (data) => api.post('/matches', data),
  updateStatus: (id, status) => api.patch(`/matches/${id}/status`, { status }),
  getChat: (id) => api.get(`/matches/${id}/chat`),
  askAI: (id, message) => api.post(`/matches/${id}/ask-ai`, { message, matchId: id }),
};

export const notifications = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  deleteAll: () => api.delete('/notifications/clear-all'),
};

export const admin = {
  getUsers: (params) => api.get('/admin/users', { params }),
  getLostFoundUsers: (params) => api.get('/admin/users-lost-found', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  updateUserRole: (id, data) => api.patch(`/admin/users/${id}/role`, data),
  updateUserStatus: (id, data) => api.patch(`/admin/users/${id}/status`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getUserItems: (id, params) => api.get(`/admin/users/${id}/items`, { params }),
  getStats: () => api.get('/admin/dashboard/stats'),
  getReports: () => api.get('/admin/dashboard/reports'),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
  getCmsPages: (params) => api.get('/admin/cms', { params }),
  updateCmsPage: (id, data) => api.patch(`/admin/cms/${id}`, data),
  getAnnouncements: () => api.get('/admin/announcements'),
  createAnnouncement: (data) => api.post('/admin/announcements', data),
  deleteAnnouncement: (id) => api.delete(`/admin/announcements/${id}`),
  getReceivedItems: (params) => api.get('/admin/received-items', { params }),
};

export const security = {
  getDevices: (params) => api.get('/security/devices', { params }),
  registerDevice: (data) => api.post('/security/devices', data),
  getDevice: (id) => api.get(`/security/devices/${id}`),
  deleteDevice: (id) => api.delete(`/security/devices/${id}`),
};

export const chat = {
  getMessages: (chatId) => api.get(`/chat/${chatId}`),
  sendMessage: (chatId, data) => api.post(`/chat/${chatId}`, data),
  markAsRead: (chatId) => api.patch(`/chat/${chatId}/read`),
};

export const publicApi = {
  getCmsPage: (slug) => api.get(`/public/cms/${slug}`),
};

export default api;
