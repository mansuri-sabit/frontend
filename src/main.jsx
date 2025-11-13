// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/sonner';
import App from './app/App';
import { AppProviders } from './app/providers';
import { initializeStores } from './store';
import './styles/globals.css';

// Create React Query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors except 408, 429
        if (error?.status >= 400 && error?.status < 500) {
          return error?.status === 408 || error?.status === 429 ? failureCount < 3 : false;
        }
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
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

// Initialize all Zustand stores
initializeStores();

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to monitoring service in production
    if (import.meta.env.PROD) {
      console.error('Application Error:', error, errorInfo);
      // You could send this to Sentry or similar service here
      // window.Sentry?.captureException(error, { extra: errorInfo });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg 
                  className="h-8 w-8 text-red-500" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Something went wrong
                </h3>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                We're sorry, but something unexpected happened. Please try refreshing the page.
              </p>
            </div>
            
            {import.meta.env.DEV && this.state.error && (
              <details className="mb-4">
                <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                  Error Details (Development)
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 overflow-auto max-h-32">
                  <div className="text-red-600 font-semibold mb-2">
                    {this.state.error.toString()}
                  </div>
                  <div className="text-gray-600">
                    {this.state.errorInfo.componentStack}
                  </div>
                </div>
              </details>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading Component
const AppLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">SC</span>
          </div>
        </div>
      </div>
      <h2 className="text-lg font-medium text-gray-900 mb-2">
        {import.meta.env.VITE_APP_NAME || 'SaaS Chatbot Platform'}
      </h2>
      <p className="text-gray-600">Loading application...</p>
      <div className="mt-4 w-32 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
        <div className="h-full bg-primary-600 rounded-full animate-pulse" style={{ width: '60%' }}></div>
      </div>
    </div>
  </div>
);

// Performance monitoring
if (import.meta.env.PROD) {
  // Web Vitals monitoring
  import('web-vitals')
    .then((webVitals) => {
      const sendToAnalytics = (metric) => {
        console.log('Web Vital:', metric);
        // Send to analytics service
      };

      // Use available functions from web-vitals v5
      // Note: getFID is deprecated in v5, use getINP instead
      if (typeof webVitals.onCLS === 'function') {
        webVitals.onCLS(sendToAnalytics);
      } else if (webVitals.getCLS) {
        webVitals.getCLS(sendToAnalytics);
      }

      if (typeof webVitals.onINP === 'function') {
        webVitals.onINP(sendToAnalytics);
      } else if (webVitals.getINP) {
        webVitals.getINP(sendToAnalytics);
      } else if (webVitals.getFID) {
        webVitals.getFID(sendToAnalytics);
      }

      if (typeof webVitals.onFCP === 'function') {
        webVitals.onFCP(sendToAnalytics);
      } else if (webVitals.getFCP) {
        webVitals.getFCP(sendToAnalytics);
      }

      if (typeof webVitals.onLCP === 'function') {
        webVitals.onLCP(sendToAnalytics);
      } else if (webVitals.getLCP) {
        webVitals.getLCP(sendToAnalytics);
      }

      if (typeof webVitals.onTTFB === 'function') {
        webVitals.onTTFB(sendToAnalytics);
      } else if (webVitals.getTTFB) {
        webVitals.getTTFB(sendToAnalytics);
      }
    })
    .catch((error) => {
      // Silently fail - web vitals is optional
      if (import.meta.env.DEV) {
        console.warn('Web Vitals monitoring failed:', error);
      }
    });
}

// Theme initialization - will be handled by ThemeProvider
// No need to force theme here, let ThemeProvider handle it

// Global error handlers
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  
  // Ignore known errors that are expected
  if (error?.message?.includes('Authentication session ended')) {
    event.preventDefault();
    return;
  }
  
  // Ignore service worker errors if service worker doesn't exist
  if (error?.message?.includes('ServiceWorker') || error?.message?.includes('sw.js')) {
    event.preventDefault();
    return;
  }
  
  // Only log unexpected errors
  if (error && !(error instanceof Error && error.message === 'Authentication session ended')) {
    console.error('Unhandled promise rejection:', error);
  }
  
  if (import.meta.env.PROD) {
    // Send to error reporting service
    // window.Sentry?.captureException(error);
  }
  
  // Prevent default browser behavior
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  // Ignore 404 errors for resources like favicons, images, etc.
  if (event.target && event.target.tagName) {
    const tagName = event.target.tagName.toLowerCase();
    const src = event.target.src || event.target.href || '';
    
    // Ignore 404s for images, favicons, and other non-critical resources
    if ((tagName === 'img' || tagName === 'link' || tagName === 'script') && 
        (event.message?.includes('404') || 
         src.includes('favicon') || 
         src.includes('login'))) {
      return; // Silently ignore these errors
    }
  }
  
  // Only log actual JavaScript errors
  if (event.error) {
    console.error('Global error:', event.error);
  }
  
  if (import.meta.env.PROD) {
    // Send to error reporting service
    // window.Sentry?.captureException(event.error);
  }
});

// Development helpers
if (import.meta.env.DEV) {
  window.__DEV_HELPERS__ = {
    queryClient,
    clearQueryCache: () => queryClient.clear(),
    invalidateQueries: (queryKey) => queryClient.invalidateQueries(queryKey),
    getQueryData: (queryKey) => queryClient.getQueryData(queryKey),
    stores: {
      auth: () => import('./store/authStore').then(m => m.useAuthStore.getState()),
      chat: () => import('./store/chatStore').then(m => m.useChatStore.getState()),
      branding: () => import('./store/brandingStore').then(m => m.useBrandingStore.getState()),
      analytics: () => import('./store/analyticsStore').then(m => m.useAnalyticsStore.getState()),
      upload: () => import('./store/uploadStore').then(m => m.useUploadStore.getState()),
    },
    clearAllStores: () => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    },
  };
  
  console.log('Development helpers available at window.__DEV_HELPERS__');
}

// Main App Wrapper
const AppWrapper = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AppProviders>
          <React.Suspense fallback={<AppLoading />}>
            <App />
          </React.Suspense>
          
          {/* Global Toast Container */}
          <Toaster />
        </AppProviders>
        
        {/* React Query Dev Tools */}
        {import.meta.env.DEV && (
          <ReactQueryDevtools 
            initialIsOpen={false}
            position="bottom-right"
          />
        )}
      </QueryClientProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

// Render the application
const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>
);

// Hot Module Replacement for development
if (import.meta.env.DEV && import.meta.hot) {
  import.meta.hot.accept('./app/App', () => {
    console.log('Hot reloading App component');
  });
  
  import.meta.hot.accept('./app/providers', () => {
    console.log('Hot reloading Providers');
  });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  // Cancel any pending queries
  queryClient.cancelQueries();
  
  // Persist important data if needed
  try {
    const authState = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    if (authState.state?.token) {
      console.log('Persisting auth state on unload');
    }
  } catch (error) {
    console.error('Error persisting state on unload:', error);
  }
});

// Online/Offline handling
window.addEventListener('online', () => {
  console.log('Application back online');
  // Resume paused mutations and refetch queries
  queryClient.resumePausedMutations();
  queryClient.invalidateQueries();
});

window.addEventListener('offline', () => {
  console.log('Application is offline');
  // You could show an offline notification here
});

// Accessibility enhancements
document.addEventListener('DOMContentLoaded', () => {
  // Add skip link for keyboard navigation
  const skipLink = document.createElement('a');
  skipLink.href = '#main-content';
  skipLink.textContent = 'Skip to main content';
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-primary-600 text-white p-2 z-50 rounded-br focus:outline-none focus:ring-2 focus:ring-primary-300';
  skipLink.style.transform = 'translateY(-100%)';
  skipLink.addEventListener('focus', () => {
    skipLink.style.transform = 'translateY(0)';
  });
  skipLink.addEventListener('blur', () => {
    skipLink.style.transform = 'translateY(-100%)';
  });
  document.body.insertBefore(skipLink, document.body.firstChild);
  
  // Create announcement region for screen readers
  const announcer = document.createElement('div');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.id = 'route-announcer';
  document.body.appendChild(announcer);
});

// Security headers check (development warning)
if (import.meta.env.DEV) {
  console.log('🔒 Security Checklist for Production:');
  console.log('- Set Content-Security-Policy headers');
  console.log('- Enable HTTPS only');
  console.log('- Set secure cookie flags');
  console.log('- Configure CORS properly');
  console.log('- Enable security headers (HSTS, X-Frame-Options, etc.)');
}

export default AppWrapper;
