// src/types/index.js

// User and Authentication types
export const UserRole = {
  ADMIN: 'admin',
  CLIENT: 'client',
  VISITOR: 'visitor'
};

export const createUser = (data = {}) => ({
  id: '',
  username: '',
  name: '',
  email: '',
  role: UserRole.CLIENT,
  client_id: '',
  created_at: '',
  updated_at: '',
  ...data
});

export const createAuthResponse = (data = {}) => ({
  token: '',
  user: createUser(),
  expires_in: 0,
  ...data
});

// Client and Branding types
export const createClient = (data = {}) => ({
  id: '',
  name: '',
  token_limit: 50000,
  tokens_used: 0,
  branding: createBranding(),
  created_at: '',
  updated_at: '',
  is_active: true,
  ...data
});

export const createBranding = (data = {}) => ({
  logo_url: '',
  theme_color: '#3B82F6',
  welcome_message: 'Hello! How can I help you today?',
  pre_questions: [],
  allow_embedding: true,
  custom_css: '',
  ...data
});

// Chat and Message types
export const MessageRole = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system'
};

export const createMessage = (data = {}) => ({
  id: '',
  conversation_id: '',
  role: MessageRole.USER,
  content: '',
  timestamp: new Date().toISOString(),
  tokens_used: 0,
  metadata: {},
  ...data
});

export const createConversation = (data = {}) => ({
  id: '',
  client_id: '',
  user_id: '',
  title: '',
  messages: [],
  created_at: '',
  updated_at: '',
  is_active: true,
  total_tokens: 0,
  ...data
});

// Upload and Document types
export const UploadStatus = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

export const createUpload = (data = {}) => ({
  id: '',
  client_id: '',
  filename: '',
  original_filename: '',
  file_size: 0,
  mime_type: '',
  status: UploadStatus.PENDING,
  chunk_count: 0,
  error_message: '',
  created_at: '',
  processed_at: '',
  ...data
});

// Analytics types
export const createUsageStats = (data = {}) => ({
  client_id: '',
  period: 'month',
  total_conversations: 0,
  total_messages: 0,
  total_tokens: 0,
  unique_users: 0,
  avg_conversation_length: 0,
  peak_usage_hour: 0,
  ...data
});

export const createSystemStats = (data = {}) => ({
  total_clients: 0,
  active_clients: 0,
  total_users: 0,
  total_conversations: 0,
  total_messages: 0,
  total_tokens_used: 0,
  avg_response_time: 0,
  uptime_percentage: 100,
  ...data
});

// API Response types
export const createApiResponse = (data = {}) => ({
  success: true,
  data: null,
  message: '',
  errors: [],
  pagination: null,
  ...data
});

export const createPaginationInfo = (data = {}) => ({
  page: 1,
  limit: 10,
  total: 0,
  total_pages: 0,
  has_next: false,
  has_prev: false,
  ...data
});

// Error types
export const ErrorType = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NOT_FOUND: 'not_found',
  RATE_LIMIT: 'rate_limit',
  SERVER: 'server',
  NETWORK: 'network'
};

export const createApiError = (data = {}) => ({
  type: ErrorType.SERVER,
  message: 'An error occurred',
  code: 'UNKNOWN_ERROR',
  status: 500,
  details: null,
  ...data
});

// Form validation types
export const createValidationError = (field, message) => ({
  field,
  message,
  code: 'VALIDATION_ERROR'
});

// Widget configuration types
export const createWidgetConfig = (data = {}) => ({
  client_id: '',
  position: 'bottom-right',
  theme_color: '#3B82F6',
  width: 350,
  height: 500,
  border_radius: 12,
  show_branding: true,
  auto_open: false,
  greeting_delay: 2000,
  ...data
});

// Utility functions for type checking
export const isValidRole = (role) => Object.values(UserRole).includes(role);
export const isValidMessageRole = (role) => Object.values(MessageRole).includes(role);
export const isValidUploadStatus = (status) => Object.values(UploadStatus).includes(status);
export const isValidErrorType = (type) => Object.values(ErrorType).includes(type);

// Constants
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  REFRESH: '/auth/refresh',
  LOGOUT: '/auth/logout',
  
  // Admin
  CREATE_CLIENT: '/admin/client',
  GET_CLIENTS: '/admin/clients',
  GET_USAGE: '/admin/usage',
  GET_SYSTEM_STATS: '/admin/stats',
  
  // Client
  UPDATE_BRANDING: '/client/branding',
  GET_BRANDING: '/client/branding',
  UPLOAD_PDF: '/client/upload',
  GET_UPLOADS: '/client/uploads',
  GET_TOKENS: '/client/tokens',
  
  // Chat
  SEND_MESSAGE: '/chat/send',
  GET_CONVERSATIONS: '/chat/conversations',
  GET_CONVERSATION: (id) => `/chat/conversations/${id}`,
  DELETE_CONVERSATION: (id) => `/chat/conversations/${id}`,
};

export const VALIDATION_RULES = {
  USERNAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z0-9_]+$/
  },
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: false
  },
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  FILE: {
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['application/pdf'],
    ALLOWED_EXTENSIONS: ['.pdf']
  },
  COLOR: {
    HEX_PATTERN: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  },
  URL: {
    PATTERN: /^https?:\/\/.+/
  }
};

export const RATE_LIMITS = {
  AUTH: 10, // per minute
  UPLOAD: 5, // per minute
  CHAT: 60, // per minute
  ADMIN: 100 // per minute
};

// Export all types as default for bulk import
export default {
  UserRole,
  MessageRole,
  UploadStatus,
  ErrorType,
  API_ENDPOINTS,
  VALIDATION_RULES,
  RATE_LIMITS,
  createUser,
  createAuthResponse,
  createClient,
  createBranding,
  createMessage,
  createConversation,
  createUpload,
  createUsageStats,
  createSystemStats,
  createApiResponse,
  createPaginationInfo,
  createApiError,
  createValidationError,
  createWidgetConfig,
  isValidRole,
  isValidMessageRole,
  isValidUploadStatus,
  isValidErrorType
};
