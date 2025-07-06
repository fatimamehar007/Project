import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle token expiration
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh token
        const response = await api.post('/auth/refresh-token');
        const { token, user } = response.data;

        // Update auth store with new token
        useAuthStore.getState().setAuth(token, user);

        // Retry the original request
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // If refresh fails, clear auth and redirect to login
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (userData: any) => api.post('/auth/register', userData),
  refreshToken: () => api.post('/auth/refresh-token'),
  logout: () => api.post('/auth/logout'),
};

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.patch('/users/profile', data),
  updateLanguage: (language: string) =>
    api.patch('/users/language', { language }),
};

export const schemeAPI = {
  getSchemes: () => api.get('/schemes'),
  getScheme: (id: string) => api.get(`/schemes/${id}`),
  createScheme: (data: any) => api.post('/schemes', data),
  updateScheme: (id: string, data: any) => api.patch(`/schemes/${id}`, data),
  deleteScheme: (id: string) => api.delete(`/schemes/${id}`),
};

export const chatAPI = {
  startConversation: (schemeId: string) =>
    api.post('/chat/start', { schemeId }),
  sendMessage: (conversationId: string, message: string) =>
    api.post(`/chat/${conversationId}/message`, { message }),
  getHistory: (conversationId: string) =>
    api.get(`/chat/${conversationId}/history`),
};

export const formAPI = {
  submitForm: (conversationId: string, formData: any) =>
    api.post(`/forms/${conversationId}/submit`, formData),
  getSubmissions: () => api.get('/forms/submissions'),
  getSubmission: (id: string) => api.get(`/forms/submissions/${id}`),
};

export const analyticsAPI = {
  getOverview: () => api.get('/analytics/overview'),
  getConversationMetrics: () => api.get('/analytics/conversations'),
  getFormMetrics: () => api.get('/analytics/forms'),
  getLanguageMetrics: () => api.get('/analytics/languages'),
};

export const aiConfigAPI = {
  getConfig: () => api.get('/ai/config'),
  updateConfig: (data: any) => api.patch('/ai/config', data),
  testConfig: () => api.post('/ai/test'),
};

export default api; 