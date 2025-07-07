import axios from 'axios';

const API_BASE_URL = 'https://openbackend-rvvs.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false, // usually false for token-based auth
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// 🔐 Request Interceptor – Automatically attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// 🛑 Response Interceptor – Error handling
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ API Response Error:', error);

    if (error.code === 'ERR_NETWORK') {
      console.error('🚫 CORS/Network Error');
    } else if (error.response?.status === 401) {
      console.error('🔐 Authentication Error - Token may be invalid');
    } else if (error.response?.status === 403) {
      console.error('🚫 Authorization Error');
    } else if (error.response?.status === 404) {
      console.error('🔍 Not Found Error');
    }

    return Promise.reject(error);
  }
);

// === Auth API ===
export const authAPI = {
  login: (credentials) => {
    console.log('🔑 Attempting login...');
    return api.post('/login', credentials);
  },
  logout: () => {
    console.log('👋 Logging out...');
    localStorage.removeItem('token');
    return api.get('/logout');
  },
  register: (userData) => {
    console.log('📝 Registering user...');
    return api.post('/register', userData);
  },
};

// === Admin API ===
export const adminAPI = {
  getDashboard: () => api.get('/admin'),
  getProjects: () => api.get('/admin/projects'),
  createProject: (data) => api.post('/admin/projects', data),
  updateProject: (id, data) => api.put(`/admin/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/admin/projects/${id}`),
  getUsers: () => api.get('/admin/users'),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  logout: () => api.get('/logout'),
};

// === User API ===
export const userAPI = {
  getDashboard: () => api.get('/user/dashboard'),
  getProject: (id) => api.get(`/user/project/${id}`),
  uploadPDF: (id, file) => {
    const formData = new FormData();
    formData.append('pdf', file);
    return api.post(`/user/project/${id}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// === Chat API ===
export const chatAPI = {
  sendMessage: (projectId, message) => api.post(`/user/chat/${projectId}/message`, { message }),
  getChatHistory: (projectId) => api.get(`/user/chat/${projectId}/history`),
};

// === Health Check ===
export const healthAPI = {
  check: () => api.get('/health'),
  corsTest: () => api.get('/cors-test'),
};

// === Test Tools ===
export const testConnection = async () => {
  try {
    const res = await healthAPI.check();
    console.log('✅ API is live:', res.data);
    return true;
  } catch (err) {
    console.error('❌ API is not reachable:', err);
    return false;
  }
};

export const testCORS = async () => {
  try {
    const res = await healthAPI.corsTest();
    console.log('✅ CORS passed:', res.data);
    return true;
  } catch (err) {
    console.error('❌ CORS failed:', err);
    return false;
  }
};

export default api;
