// src/hooks/index.js

// Core hooks
export { useApi } from './useApi';
export { useAuth } from './useAuth';
export { useLocalStorage } from './useLocalStorage';
export { useSessionStorage } from './useSessionStorage';
export { useDebounce } from './useDebounce';
export { useThrottle } from './useThrottle';

// UI hooks
// useToast now uses react-hot-toast directly
export { useModal } from './useModal';
export { useDisclosure } from './useDisclosure';
export { useClipboard } from './useClipboard';
export { useToggle } from './useToggle';

// Form hooks
export { useForm } from './useForm';
export { useValidation } from './useValidation';
export { useFormPersist } from './useFormPersist';

// Data hooks
export { usePagination } from './usePagination';
export { useInfiniteScroll } from './useInfiniteScroll';
export { useSearch } from './useSearch';
export { useSort } from './useSort';
export { useFilter } from './useFilter';

// Async hooks
export { useAsync } from './useAsync';
export { useAsyncCallback } from './useAsyncCallback';
export { useRetry } from './useRetry';

// DOM hooks
export { useClickOutside } from './useClickOutside';
export { useKeyPress } from './useKeyPress';
export { useMediaQuery } from './useMediaQuery';
export { useWindowSize } from './useWindowSize';
export { useScroll } from './useScroll';
export { useIntersectionObserver } from './useIntersectionObserver';

// Performance hooks
export { useMemoCompare } from './useMemoCompare';
export { useCallbackRef } from './useCallbackRef';
export { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';

// Feature-specific hooks
export { useChat } from './useChat';
export { useUpload } from './useUpload';
export { useBranding } from './useBranding';
export { useAnalytics } from './useAnalytics';
export { useWebSocket } from './useWebSocket';

// Custom combined hooks for common patterns
export { useAuthGuard } from './useAuthGuard';
export { usePermissions } from './usePermissions';
export { useErrorHandler } from './useErrorHandler';
export { useNetworkStatus } from './useNetworkStatus';

// Export hook utilities
export const hookUtils = {
  // Utility to create a custom hook factory
  createAsyncHook: (asyncFn, deps = []) => {
    return function useCustomAsync(...args) {
      const { useAsync } = require('./useAsync');
      return useAsync(() => asyncFn(...args), deps);
    };
  },
  
  // Utility to combine multiple hooks
  combineHooks: (...hooks) => {
    return function useCombined(props) {
      return hooks.reduce((acc, hook) => {
        const result = hook(props);
        return { ...acc, ...result };
      }, {});
    };
  }
};
