// src/lib/api.js
import axios from 'axios';
import { authManager } from './auth';

// Use a RELATIVE base so Vite proxy handles CORS in dev.
// In .env set: VITE_API_URL=/api  and proxy rewrites /api -> http://localhost:8080
// In PRODUCTION: VITE_API_URL must be set to full backend URL (e.g., https://backend.onrender.com)
const baseURL = import.meta.env.VITE_API_URL || '/api';

// ✅ PRODUCTION CHECK: Warn if API URL is relative in production
if (import.meta.env.PROD && baseURL.startsWith('/')) {
  console.error(
    '❌ CRITICAL: VITE_API_URL is not set or not properly configured! ' +
    'Current baseURL: ' + baseURL + ' ' +
    'Frontend will try to call API on same domain which will fail. ' +
    'Please set VITE_API_URL to your backend URL in Render dashboard: ' +
    'Settings → Environment Variables → Add VITE_API_URL=https://backendoffice.onrender.com ' +
    'Then redeploy the frontend service to rebuild with the new environment variable.'
  );
} else if (import.meta.env.PROD) {
  console.log('✅ API URL configured:', baseURL);
}

const api = axios.create({
  baseURL,
  timeout: Number(import.meta.env.VITE_API_TIMEOUT) || 600000, // 10 minutes for large file uploads
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required for httpOnly cookies to be sent
});

// ----- Interceptors -----
api.interceptors.request.use(
  (config) => {
    const token = authManager.getToken?.();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    const user = authManager.getUser?.();
    if (user?.client_id) config.headers['X-Client-ID'] = user.client_id;

    config.headers['X-Request-Time'] = new Date().toISOString();
    config.headers['X-Correlation-ID'] = `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    // For FormData, remove Content-Type to let axios set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    // Add request ID for tracking
    config.metadata = { startTime: Date.now() };

    if (import.meta.env.DEV) {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.baseURL || ''}${config.url}`, config.data || config.params);
    }
    return config;
  },
  (error) => {
    if (import.meta.env.DEV) console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Global refresh lock to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise = null;

api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    if (response.config.metadata?.startTime) {
      const duration = Date.now() - response.config.metadata.startTime;
      response.duration = duration;
    }

    if (import.meta.env.DEV) {
      console.log(
        `✅ ${response.config.method?.toUpperCase()} ${response.config.baseURL || ''}${response.config.url}`,
        response.data,
        response.duration ? `(${response.duration}ms)` : ''
      );
    }
    return response;
  },
  async (error) => {
    const original = error.config;

    if (import.meta.env.DEV) {
      console.error(
        `❌ ${original?.method?.toUpperCase()} ${original?.url}`,
        error.response?.data || error.message,
        error.response?.status ? `[${error.response.status}]` : ''
      );
    }

    // 401 -> try refresh ONCE using Authorization header
    // SKIP token refresh for auth endpoints (login, register, etc.) - these are expected to fail with 401
    const isAuthEndpoint = original?.url && (
      original.url.includes('/auth/login') ||
      original.url.includes('/auth/register') ||
      original.url.includes('/auth/forgot-password') ||
      original.url.includes('/auth/reset-password') ||
      original.url.includes('/auth/verify-email')
    );

    if (error.response?.status === 401 && !original?._retry && !isAuthEndpoint) {
      original._retry = true;
      
      // If already refreshing, wait for the existing refresh to complete
      if (isRefreshing) {
        try {
          await refreshPromise;
          // Retry the original request with the new token
          original.headers.Authorization = `Bearer ${authManager.getToken?.()}`;
          return api(original);
        } catch (e) {
          // Refresh failed, redirect to login
          authManager.clearAuth?.();
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
            window.location.href = '/login';
          }
          return Promise.reject(e);
        }
      }

      // Start refresh process
      isRefreshing = true;
      refreshPromise = (async () => {
        try {
          const refreshRes = await api.post('/auth/refresh');
          const { access_token, refresh_token } = refreshRes.data || {};
          if (access_token && typeof access_token === 'string') {
            authManager.setTokens?.(access_token, refresh_token);
            return { access_token, refresh_token };
          }
          throw new Error('Invalid refresh response');
        } catch (e) {
          authManager.clearAuth?.();
          throw e;
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      })();

      try {
        await refreshPromise;
        // Retry the original request with the new token
        original.headers.Authorization = `Bearer ${authManager.getToken?.()}`;
        return api(original);
      } catch (e) {
        if (typeof window !== 'undefined') {
          // Store the current URL for redirect after login
          sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
          window.location.href = '/login';
        }
        return Promise.reject(e);
      }
    }

    // 429 -> honor Retry-After once
    if (error.response?.status === 429 && !original?._rateLimited) {
      original._rateLimited = true;
      const retryAfter = Number(error.response.headers['retry-after'] || error.response.headers['Retry-After'] || 1);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return api(original);
    }

    // 5xx -> retry with exponential backoff
    if (error.response?.status >= 500 && !original?._serverRetry) {
      original._serverRetry = true;
      const retryCount = original._retryCount || 0;
      const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Max 5 second delay
      original._retryCount = retryCount + 1;
      
      if (retryCount < 2) { // Max 2 retries for server errors
        await new Promise((resolve) => setTimeout(resolve, delay));
        return api(original);
      }
    }

    return Promise.reject(error);
  }
);

// ----- API methods that MATCH your Go backend -----
export const apiClient = {
  // ========== AUTH ENDPOINTS ==========
  login: (credentials) => api.post('/auth/login', credentials).then((r) => r.data),
  register: (userData) => api.post('/auth/register', userData).then((r) => r.data),
  logout: () => api.post('/auth/logout').then((r) => r.data),
  refreshToken: () => api.post('/auth/refresh').then((r) => r.data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }).then((r) => r.data),
  verifyResetToken: (email, token) => api.get('/auth/reset/verify', { params: { email, token } }).then((r) => r.data),
  resetPassword: (email, token, password) => api.post('/auth/reset', { email, token, password }).then((r) => r.data),
  verifyEmail: (token) => api.post('/auth/verify-email', { token }).then((r) => r.data),
  
  // User profile management
  getProfile: () => api.get('/auth/profile').then((r) => r.data),
  updateProfile: (profileData) => api.patch('/auth/profile', profileData).then((r) => r.data),
  changePassword: (passwordData) => api.patch('/auth/change-password', passwordData).then((r) => r.data),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/auth/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((r) => r.data);
  },
  deleteAccount: () => api.delete('/auth/account').then((r) => r.data),

  // ========== ADMIN ENDPOINTS ==========
  // Client management
  getClients: (params = {}) => api.get('/admin/clients', { params }).then((r) => r.data),
  getClient: (clientId) => api.get(`/admin/client/${clientId}`).then((r) => r.data),
  validateClient: (clientData) => api.post('/admin/client/validate', clientData).then((r) => r.data).catch((err) => {
    // Return validation errors in a consistent format
    if (err.response?.status === 409) {
      return Promise.reject(err);
    }
    throw err;
  }),
  createClient: (clientData) => api.post('/admin/client', clientData).then((r) => r.data),
  updateClient: (clientId, updates) => api.put(`/admin/client/${clientId}`, updates).then((r) => r.data),
deleteClient: (clientId) => api.delete(`/admin/client/${clientId}`).then((r) => r.data),

  // Token reset for clients
  resetClientTokens: (clientId, data) => api.post(`/admin/client/${clientId}/token-reset`, data).then((r) => r.data),
  
  // Domain management for clients
  getClientDomains: (clientId) => api.get(`/admin/client/${clientId}/domains`).then((r) => r.data),
  updateClientDomains: (clientId, domainData) => api.put(`/admin/client/${clientId}/domains`, domainData).then((r) => r.data),
  
  // Permission management for clients
  getClientPermissions: (clientId) => api.get(`/admin/client/${clientId}/permissions`).then((r) => r.data),
  updateClientPermissions: (clientId, permissions) => api.put(`/admin/client/${clientId}/permissions`, { permissions }).then((r) => r.data),

  // Client user credentials management
  getClientUser: (clientId) => api.get(`/admin/client/${clientId}/user`).then((r) => r.data),
  updateClientUser: (clientId, credentials) => api.put(`/admin/client/${clientId}/user`, credentials).then((r) => r.data),

  // Embed code for clients
  getClientEmbedCode: (clientId) => api.get(`/admin/client/${clientId}/embed-snippet`).then((r) => r.data),
  
  // AI Persona management for clients
  uploadAIPersona: (clientId, file) => {
    const formData = new FormData();
    formData.append('persona_file', file);
    // Don't set Content-Type header - let axios set it automatically with boundary
    return api.post(`/admin/client/${clientId}/ai-persona`, formData).then((r) => r.data);
  },
  getAIPersona: (clientId) => api.get(`/admin/client/${clientId}/ai-persona`).then((r) => r.data),
  deleteAIPersona: (clientId) => api.delete(`/admin/client/${clientId}/ai-persona`).then((r) => r.data),
  
  // Document management for clients
  getClientDocuments: (clientId, params = {}) => api.get(`/admin/client/${clientId}/documents`, { params }).then((r) => r.data),
  deleteClientDocument: (clientId, docId) => api.delete(`/admin/client/${clientId}/documents/${docId}`).then((r) => r.data),
  uploadClientDocument: (clientId, file, onProgress = null) => {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('document', file);
    
    const config = {
      headers: { 'Content-Type': 'multipart/form-data' },
    };
    
    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        if (progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentage, progressEvent);
        }
      };
    }
    
    return api.post(`/admin/client/${clientId}/documents/upload`, formData, config).then((r) => r.data);
  },
  
  // Default Persona management (Layer 1)
  uploadDefaultPersona: (file) => {
    const formData = new FormData();
    formData.append('persona_file', file);
    return api.post(`/admin/default-persona`, formData).then((r) => r.data);
  },
  getDefaultPersona: () => api.get(`/admin/default-persona`).then((r) => r.data),
  deleteDefaultPersona: () => api.delete(`/admin/default-persona`).then((r) => r.data),
  
  // Suspicious activity alerts
  getAlerts: (params = {}) => api.get('/admin/alerts', { params }).then((r) => r.data),
  resolveAlert: (alertId) => api.put(`/admin/alerts/${alertId}/resolve`).then((r) => r.data),
  
  // System analytics and stats
  getSystemStats: () => api.get('/admin/stats').then((r) => r.data),
  getUsageAnalytics: (params = {}) => api.get('/admin/usage', { params }).then((r) => r.data),
  getSystemHealth: () => api.get('/admin/health').then((r) => r.data),
  
  // Admin user management
  getUsers: (params = {}) => api.get('/admin/users', { params }).then((r) => r.data),
  updateUserRole: (userId, role) => api.patch(`/admin/users/${userId}/role`, { role }).then((r) => r.data),
  suspendUser: (userId) => api.patch(`/admin/users/${userId}/suspend`).then((r) => r.data),
  unsuspendUser: (userId) => api.patch(`/admin/users/${userId}/unsuspend`).then((r) => r.data),


  // ========== CLIENT (TENANT) ENDPOINTS ==========
  // Dashboard data
  getDashboardData: () => api.get('/client/dashboard').then((r) => r.data),
  getClientAnalytics: (params = {}) => api.get('/client/analytics', { params }).then((r) => r.data),
  
  // Get client permissions (for client users)
  getClientSidePermissions: () => api.get('/client/permissions').then((r) => r.data),
  
  // Branding management
  getBranding: () => api.get('/client/branding').then((r) => r.data?.branding ?? r.data),
  updateBranding: (branding) => api.post('/client/branding', branding).then((r) => r.data?.branding ?? r.data),
  resetBranding: () => api.delete('/client/branding').then((r) => r.data),
  
  // Token management
  getTokenUsage: () => api.get('/client/tokens').then((r) => r.data),
  updateTokenLimit: (limit) => api.patch('/client/tokens/limit', { limit }).then((r) => r.data),
  getTokenHistory: (params = {}) => api.get('/client/tokens/history', { params }).then((r) => r.data),

  // ========== DOCUMENT MANAGEMENT ==========
  uploadPDF: (file, onProgress = null, options = {}) => {
    const formData = new FormData();
    // Support both field names for backward compatibility
    formData.append('pdf', file);
    // Also append as 'document' for broader file type support
    formData.append('document', file);
    
    // Calculate timeout based on file size (optimized for large files up to 100MB)
    // Assuming conservative 1Mbps upload speed: (size in MB) / 0.125 = seconds
    const fileSizeMB = file.size / (1024 * 1024);
    const estimatedUploadTime = Math.ceil(fileSizeMB / 0.125); // seconds
    // For large files (100MB), give more time: up to 15 minutes
    const timeout = Math.max(60000, Math.min(900000, estimatedUploadTime * 1000));
    
    // Configure retry options
    const retryOptions = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      retryCondition: options.retryCondition || (error => {
        // Retry on network errors, timeouts, and 5xx errors
        return !error.response || error.response.status >= 500 || error.code === 'ECONNABORTED';
      })
    };

    let retryCount = 0;
    
    const attemptUpload = () => {
      return api.post('/client/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            const speed = progressEvent.speed || 0;
            const remaining = progressEvent.total - progressEvent.loaded;
            const timeRemaining = speed > 0 ? remaining / speed : 0;
            
            onProgress(percentage, progressEvent, {
              speed,
              timeRemaining,
              retryCount
            });
          }
        },
        timeout: timeout,
      }).then((r) => r.data)
        .catch((error) => {
          retryCount++;
          
          // Check if we should retry
          if (retryCount <= retryOptions.maxRetries && retryOptions.retryCondition(error)) {
            console.log(`Upload failed, retrying... (${retryCount}/${retryOptions.maxRetries})`);
            
            // Exponential backoff
            const delay = retryOptions.retryDelay * Math.pow(2, retryCount - 1);
            
            return new Promise((resolve) => setTimeout(resolve, delay))
              .then(() => attemptUpload());
          }
          
          // No more retries or non-retryable error
          throw error;
        });
    };
    
    return attemptUpload();
  },

  // OCR Upload with enhanced processing
  uploadPDFWithOCR: (file, onProgress = null, options = {}) => {
    const formData = new FormData();
    formData.append('pdf', file);
    
    // Add OCR options
    if (options.languages) {
      formData.append('languages', options.languages);
    }
    if (options.confidenceThreshold) {
      formData.append('confidence_threshold', options.confidenceThreshold);
    }
    if (options.extractTables !== undefined) {
      formData.append('extract_tables', options.extractTables);
    }
    if (options.extractImages !== undefined) {
      formData.append('extract_images', options.extractImages);
    }
    if (options.preserveLayout !== undefined) {
      formData.append('preserve_layout', options.preserveLayout);
    }
    
    // Calculate timeout based on file size for OCR processing
    const estimatedUploadTime = Math.ceil((file.size / (1024 * 1024)) / 0.125);
    const timeout = Math.max(60000, Math.min(120000, estimatedUploadTime * 1000));
    
    return api.post('/client/ocr/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentage, progressEvent);
        }
      },
      timeout: timeout, // Dynamic timeout
    }).then((r) => r.data);
  },

  // Get OCR processing status
  getOCRStatus: (pdfId) => api.get(`/client/ocr/status/${pdfId}`).then((r) => r.data),

  // Get OCR chunks
  getOCRChunks: (pdfId, params = {}) => api.get(`/client/ocr/chunks/${pdfId}`, { params }).then((r) => r.data),

  getUploads: (params = {}) => api.get('/client/pdfs', { params }).then((r) => r.data),
  getUpload: (uploadId) => api.get(`/client/pdfs/${uploadId}`).then((r) => r.data),
  deleteUpload: (uploadId) => api.delete(`/client/pdfs/${uploadId}`).then((r) => r.data),
  bulkDeleteUploads: (pdfIds) => api.delete('/client/pdfs/bulk', { data: { pdf_ids: pdfIds } }).then((r) => r.data),
  updateUploadStatus: (uploadId, status) => api.patch(`/client/pdfs/${uploadId}/status`, { status }).then((r) => r.data),
  
  uploadMultiplePDFs: async (files, onProgress = null) => {
    const results = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await apiClient.uploadPDF(files[i], (percentage) => {
          onProgress?.(i, percentage, files[i].name);
        });
        results.push({ success: true, file: files[i].name, data: result });
      } catch (error) {
        results.push({ success: false, file: files[i].name, error: error.message });
      }
    }
    return results;
  },

  // ========== CHAT ENDPOINTS ==========
  sendMessage: (message, conversationId = null) => {
    const payload = conversationId ? { message, conversation_id: conversationId } : { message };
    return api.post('/chat/send', payload).then((r) => r.data);
  },
  
  getConversations: (params = {}) => api.get('/chat/conversations', { params }).then((r) => r.data),
  getConversation: (conversationId, params = {}) => api.get(`/chat/conversations/${conversationId}`, { params }).then((r) => r.data),
  
  // Embed chat history with IP tracking
  getEmbedChatHistory: (params = {}) => api.get('/client/embed-chat-history', { params }).then((r) => r.data),
  getEmbedConversationMessages: (conversationId) => api.get(`/client/embed-conversations/${conversationId}/messages`).then((r) => r.data),
  getProposals: (params = {}) => api.get('/client/proposals', { params }).then((r) => r.data),
  bulkDeleteEmbedConversations: (conversationIds) => {
    // Use POST for bulk delete as DELETE with body can have issues with some HTTP clients
    return api.post('/client/embed-conversations/bulk-delete', { conversation_ids: conversationIds }).then((r) => r.data);
  },
  
  // Real users chat history (completed contact collection)
  getRealUsersChatHistory: (params = {}) => api.get('/client/real-users-chat-history', { params }).then((r) => r.data),
  deleteConversation: (conversationId) => api.delete(`/chat/conversations/${conversationId}`).then((r) => r.data),
  updateConversation: (conversationId, updates) => api.patch(`/chat/conversations/${conversationId}`, updates).then((r) => r.data),

  // ========== CHAT EXPORT ENDPOINTS ==========
  exportChats: (exportData) => api.post('/client/export/chats', exportData).then((r) => r.data),
  downloadChatExport: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `/client/export/chats/download${queryString ? `?${queryString}` : ''}`;
    return api.get(url, { responseType: 'blob' }).then((response) => {
      // Check if response is actually a blob
      if (!response.data || response.data.size === 0) {
        throw new Error('No data received from server');
      }

      // Create blob and download
      const blob = new Blob([response.data], { 
        type: response.headers['content-type'] || 'application/octet-stream' 
      });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      
      // Determine filename based on format
      const format = params.format || 'json';
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `chat_export_${timestamp}.${format === 'excel' ? 'xlsx' : format === 'both' ? 'zip' : 'json'}`;
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Clean up after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 1000);
      
      return { success: true, filename: link.download, size: blob.size };
    });
  },
  
  // Advanced chat features
  searchMessages: (query, params = {}) => api.get('/chat/search', { params: { q: query, ...params } }).then((r) => r.data),
  exportConversation: (conversationId, format = 'json') => api.get(`/chat/conversations/${conversationId}/export`, { params: { format } }).then((r) => r.data),
  getConversationStats: (conversationId) => api.get(`/chat/conversations/${conversationId}/stats`).then((r) => r.data),
  
  // Message operations
  retryMessage: (messageId) => api.post(`/chat/messages/${messageId}/retry`).then((r) => r.data),
  deleteMessage: (messageId) => api.delete(`/chat/messages/${messageId}`).then((r) => r.data),
  editMessage: (messageId, content) => api.patch(`/chat/messages/${messageId}`, { content }).then((r) => r.data),

  // ========== PUBLIC/EMBED ENDPOINTS ==========
  getPublicBranding: (clientId) => api.get(`/public/branding/${clientId}`).then((r) => r.data),
  sendPublicMessage: (clientId, message, sessionId) => {
    return api.post('/public/chat', {
      client_id: clientId,
      message,
      session_id: sessionId,
    }).then((r) => r.data);
  },
  getPublicConversation: (sessionId) => api.get(`/public/chat/${sessionId}`).then((r) => r.data),
  sendQuoteProposal: (clientId, data) => {
    return api.post(`/public/quote/${clientId}`, {
      company_name: data.companyName,
      company_description: data.companyDescription,
      client_email: data.clientEmail,
    }).then((r) => r.data);
  },

  // ========== WEBSOCKET HELPERS ==========
  createWebSocketConnection: (endpoint = '/ws') => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = import.meta.env.VITE_WEBSOCKET_URL || `${wsProtocol}//${window.location.host}`;
    const token = authManager.getToken?.();
    const wsUrl = `${wsHost}${endpoint}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      if (import.meta.env.DEV) console.log('🔌 WebSocket connected');
    };
    
    ws.onerror = (error) => {
      console.error('🔌 WebSocket error:', error);
    };
    
    ws.onclose = (event) => {
      if (import.meta.env.DEV) {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
      }
    };
    
    return ws;
  },

  // ========== SYSTEM ENDPOINTS ==========
  healthCheck: () => api.get('/health').then((r) => r.data),
  getVersion: () => api.get('/version').then((r) => r.data),
  getConfig: () => api.get('/config').then((r) => r.data),

  // ========== UTILITY METHODS ==========
  // File download helper
  downloadFile: async (url, filename) => {
    try {
      const response = await api.get(url, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      return true;
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  },

  // Bulk operations helper
  bulkOperation: async (operations, onProgress = null) => {
    const results = [];
    const total = operations.length;
    
    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await operations[i]();
        results.push({ index: i, success: true, data: result });
      } catch (error) {
        results.push({ index: i, success: false, error: error.message });
      }
      
      if (onProgress) {
        onProgress(i + 1, total, results);
      }
    }
    
    return results;
  },

  // Request cancellation helper
  createCancelToken: () => axios.CancelToken.source(),
  
  // Generic CRUD helpers with better error handling
  get: (endpoint, params = {}, config = {}) => {
    return api.get(endpoint, { params, ...config }).then((r) => r.data);
  },
  
  post: (endpoint, data = {}, config = {}) => {
    return api.post(endpoint, data, config).then((r) => r.data);
  },
  
  patch: (endpoint, data = {}, config = {}) => {
    return api.patch(endpoint, data, config).then((r) => r.data);
  },
  
  put: (endpoint, data = {}, config = {}) => {
    return api.put(endpoint, data, config).then((r) => r.data);
  },
  
  delete: (endpoint, config = {}) => {
    return api.delete(endpoint, config).then((r) => r.data);
  },

  // ========== ADVANCED FEATURES ==========
  // Request queue for handling rate limits
  requestQueue: [],
  processQueue: async function() {
    if (this.requestQueue.length === 0) return;
    
    const request = this.requestQueue.shift();
    try {
      const result = await request.execute();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    }
    
    // Process next request after a small delay
    setTimeout(() => this.processQueue(), 100);
  },

  queueRequest: function(requestFn) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        execute: requestFn,
        resolve,
        reject,
      });
      
      if (this.requestQueue.length === 1) {
        this.processQueue();
      }
    });
  },

  // Response caching for GET requests
  cache: new Map(),
  
  getCached: function(endpoint, params = {}, ttl = 300000) { // 5 minutes default
    const cacheKey = `${endpoint}?${JSON.stringify(params)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return Promise.resolve(cached.data);
    }
    
    return this.get(endpoint, params).then((data) => {
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });
      return data;
    });
  },

  clearCache: function(pattern) {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  },
};

// ========== DEVELOPMENT HELPERS ==========
if (import.meta.env.DEV) {
  // Add global access for debugging
  window.__API_DEBUG__ = {
    api,
    apiClient,
    authManager,
    clearCache: () => apiClient.clearCache(),
    getQueueSize: () => apiClient.requestQueue.length,
    getCacheSize: () => apiClient.cache.size,
    testEndpoint: (method, endpoint, data) => {
      return api[method.toLowerCase()](endpoint, data).then(r => r.data);
    },
  };

  // Performance monitoring
  let requestCount = 0;
  let totalDuration = 0;
  
  const originalRequest = api.request;
  api.request = function(config) {
    requestCount++;
    return originalRequest.call(this, config).then((response) => {
      if (response.duration) {
        totalDuration += response.duration;
        console.log(`📊 API Stats: ${requestCount} requests, avg: ${Math.round(totalDuration / requestCount)}ms`);
      }
      return response;
    });
  };
}

// ========== ERROR TYPES ==========
export class APIError extends Error {
  constructor(message, status, code, data) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

// Wrap axios errors in our custom error type
const wrapAxiosError = (error) => {
  if (error.response) {
    return new APIError(
      error.response.data?.message || error.message,
      error.response.status,
      error.response.data?.code,
      error.response.data
    );
  }
  return error;
};

// Add error wrapper to interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(wrapAxiosError(error))
);

// Export everything
export const axiosInstance = api;
export default apiClient;
