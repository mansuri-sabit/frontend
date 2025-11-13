// src/app/providers.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
// Toast is handled in main.jsx via Sonner
import { initializeStores } from '../store';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors except 408, 429
        if (error?.status >= 400 && error?.status < 500) {
          return error?.status === 408 || error?.status === 429 ? failureCount < 3 : false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: (failureCount, error) => {
        // Retry on network errors and 5xx errors
        if (error?.status >= 500 || error?.name === 'NetworkError') {
          return failureCount < 2;
        }
        return false;
      },
    },
  },
});

// Theme Context
const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    // Check localStorage first
    const stored = localStorage.getItem('theme');
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored;
    }
    // Default to light mode (not system)
    return 'light';
  });

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Update resolved theme based on current theme
    let currentTheme = theme;
    if (theme === 'system') {
      currentTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    setResolvedTheme(currentTheme);

    // Apply theme class
    if (currentTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const newTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(newTheme);
      const root = document.documentElement;
      if (newTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setThemeValue = (newTheme) => {
    if (!['light', 'dark', 'system'].includes(newTheme)) {
      console.warn(`Invalid theme: ${newTheme}. Must be 'light', 'dark', or 'system'`);
      return;
    }
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <ThemeContext.Provider 
      value={{ 
        theme,
        setTheme: setThemeValue,
        resolvedTheme,
        isDark: resolvedTheme === 'dark',
        isLight: resolvedTheme === 'light',
        isSystem: theme === 'system'
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

// Toast Context
const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now().toString();
    const newToast = {
      id,
      type: 'info',
      duration: 4000,
      ...toast
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
    
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearToasts = () => {
    setToasts([]);
  };

  const toast = {
    success: (message, options = {}) => addToast({ type: 'success', message, ...options }),
    error: (message, options = {}) => addToast({ type: 'error', message, duration: 6000, ...options }),
    warning: (message, options = {}) => addToast({ type: 'warning', message, ...options }),
    info: (message, options = {}) => addToast({ type: 'info', message, ...options }),
    loading: (message, options = {}) => addToast({ type: 'loading', message, duration: 0, ...options }),
    custom: (content, options = {}) => addToast({ type: 'custom', content, ...options }),
  };

  return (
    <ToastContext.Provider value={{ toast, toasts, removeToast, clearToasts }}>
      {children}
    </ToastContext.Provider>
  );
};

// Network Status Context
const NetworkContext = createContext();

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

const NetworkProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // Refetch queries when coming back online
        queryClient.resumePausedMutations();
        queryClient.invalidateQueries();
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return (
    <NetworkContext.Provider value={{ isOnline, wasOffline }}>
      {children}
    </NetworkContext.Provider>
  );
};

// Performance Context
const PerformanceContext = createContext();

export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};

const PerformanceProvider = ({ children }) => {
  const [metrics, setMetrics] = useState({});

  const measurePerformance = (name, fn) => {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    setMetrics(prev => ({
      ...prev,
      [name]: {
        duration,
        timestamp: Date.now()
      }
    }));

    return result;
  };

  const measureAsyncPerformance = async (name, fn) => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    setMetrics(prev => ({
      ...prev,
      [name]: {
        duration,
        timestamp: Date.now()
      }
    }));

    return result;
  };

  return (
    <PerformanceContext.Provider 
      value={{ 
        metrics, 
        measurePerformance, 
        measureAsyncPerformance 
      }}
    >
      {children}
    </PerformanceContext.Provider>
  );
};

// Feature Flags Context
const FeatureFlagsContext = createContext();

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagsContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  return context;
};

const FeatureFlagsProvider = ({ children }) => {
  const [flags, setFlags] = useState({
    darkMode: true,
    embedWidget: true,
    realTimeChat: true,
    analytics: true,
    fileUpload: true,
    multiLanguage: false,
    betaFeatures: import.meta.env.DEV,
  });

  const isFeatureEnabled = (feature) => flags[feature] || false;

  const toggleFeature = (feature) => {
    setFlags(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
  };

  return (
    <FeatureFlagsContext.Provider 
      value={{ 
        flags, 
        isFeatureEnabled, 
        toggleFeature 
      }}
    >
      {children}
    </FeatureFlagsContext.Provider>
  );
};

// Main Providers Component
export const AppProviders = ({ children }) => {
  useEffect(() => {
    // Initialize all stores
    initializeStores();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <NetworkProvider>
            <PerformanceProvider>
              <FeatureFlagsProvider>
                {children}
              </FeatureFlagsProvider>
            </PerformanceProvider>
          </NetworkProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

// Export individual providers for flexibility
export {
  ThemeProvider,
  ToastProvider,
  NetworkProvider,
  PerformanceProvider,
  FeatureFlagsProvider,
  queryClient,
  ToastContext
};
