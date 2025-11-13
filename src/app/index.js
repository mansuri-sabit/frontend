// src/app/index.js
import App from './App';
import { router } from './router';
import { AppProviders } from './providers';

// Export main app components
export default App;
export { router, AppProviders };

// Export app configuration
export const appConfig = {
  name: import.meta.env.VITE_APP_NAME || 'SaaS Chatbot Platform',
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE) || 10485760, // 10MB
  supportedLanguages: ['en', 'es', 'fr', 'de'],
  defaultLanguage: 'en',
  theme: {
    defaultMode: 'light',
    colors: {
      primary: '#3B82F6',
      secondary: '#6B7280',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444'
    }
  },
  features: {
    darkMode: true,
    multiLanguage: false,
    analytics: true,
    embedWidget: true,
    fileUpload: true,
    realTimeChat: true
  }
};

// Export environment helpers
export const isProduction = import.meta.env.PROD;
export const isDevelopment = import.meta.env.DEV;
export const isTest = import.meta.env.MODE === 'test';

// Export app utilities
export const appUtils = {
  getBaseUrl: () => window.location.origin,
  getApiUrl: () => appConfig.apiUrl,
  isFeatureEnabled: (feature) => appConfig.features[feature] || false,
  formatFileSize: (bytes) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  },
  generateId: () => Date.now().toString(36) + Math.random().toString(36).substr(2),
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
};
