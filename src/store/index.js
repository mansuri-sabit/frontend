// src/store/index.js
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

// Import all stores
export { useAuthStore, initializeAuth } from './authStore';
export { useChatStore } from './chatStore';
export { useBrandingStore } from './brandingStore';
export { useAnalyticsStore } from './analyticsStore';
export { useUploadStore } from './uploadStore';

// Global app store for UI state and cross-cutting concerns
export const useAppStore = create(
  devtools(
    subscribeWithSelector((set, get) => ({
      // UI State
      sidebarCollapsed: false,
      notifications: [],
      modals: {},
      loading: {},
      
      // Network state
      isOnline: navigator.onLine,
      lastOnline: Date.now(),
      
      // Performance tracking
      performanceMetrics: {},
      
      // Feature flags
      features: {
        embedWidget: true,
        realTimeChat: true,
        analytics: true,
        fileUpload: true,
        multiLanguage: false,
        betaFeatures: import.meta.env.DEV,
      },

      // Actions
      
      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),
      
      addNotification: (notification) => set((state) => ({
        notifications: [...state.notifications, {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          type: 'info',
          autoClose: true,
          duration: 5000,
          ...notification
        }]
      })),
      
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
      
      clearNotifications: () => set({ notifications: [] }),
      
      // Modal management
      openModal: (id, props = {}) => set((state) => ({
        modals: { ...state.modals, [id]: { isOpen: true, props } }
      })),
      
      closeModal: (id) => set((state) => ({
        modals: { ...state.modals, [id]: { isOpen: false, props: {} } }
      })),
      
      // Loading states
      setLoading: (key, isLoading) => set((state) => ({
        loading: { ...state.loading, [key]: isLoading }
      })),
      
      isLoading: (key) => get().loading[key] || false,
      
      // Network status
      setOnlineStatus: (isOnline) => set({ 
        isOnline,
        lastOnline: isOnline ? Date.now() : get().lastOnline,
      }),
      
      // Performance tracking
      addPerformanceMetric: (name, duration) => set((state) => ({
        performanceMetrics: {
          ...state.performanceMetrics,
          [name]: {
            duration,
            timestamp: Date.now(),
          }
        }
      })),
      
      // Feature flags
      isFeatureEnabled: (feature) => get().features[feature] || false,
      
      toggleFeature: (feature) => set((state) => ({
        features: {
          ...state.features,
          [feature]: !state.features[feature]
        }
      })),
      
      // Initialize app state
      initialize: () => {
        // Remove any saved theme preference
        localStorage.removeItem('theme');
        document.documentElement.classList.remove('dark');
        
        // Setup online/offline listeners
        const handleOnline = () => get().setOnlineStatus(true);
        const handleOffline = () => get().setOnlineStatus(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Cleanup function (would be called on app unmount)
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      },
    })),
    { name: 'AppStore' }
  )
);

// Initialize all stores
export const initializeStores = () => {
  useAppStore.getState().initialize();
  // Other store initializations would go here
};

// Store selectors for performance
export const selectSidebar = (state) => state.sidebarCollapsed;
export const selectNotifications = (state) => state.notifications;
export const selectModals = (state) => state.modals;
export const selectNetworkStatus = (state) => ({ 
  isOnline: state.isOnline, 
  lastOnline: state.lastOnline 
});

// Cross-store subscriptions and effects
useAppStore.subscribe(
  (state) => state.isOnline,
  (isOnline) => {
    if (isOnline) {
      // Trigger data refresh when coming back online
      console.log('App back online, refreshing data...');
      // You could trigger refreshes in other stores here
    } else {
      console.log('App went offline');
    }
  }
);

// Auto-cleanup notifications
setInterval(() => {
  const state = useAppStore.getState();
  const now = Date.now();
  
  const expiredNotifications = state.notifications.filter(notification => {
    if (!notification.autoClose) return false;
    const created = new Date(notification.timestamp).getTime();
    return now - created > (notification.duration || 5000);
  });
  
  expiredNotifications.forEach(notification => {
    state.removeNotification(notification.id);
  });
}, 1000);

export default useAppStore;
