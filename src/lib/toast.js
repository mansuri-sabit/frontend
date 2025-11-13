import { toast as sonnerToast } from 'sonner';

// Re-export toast from sonner for easy migration
export const toast = {
  // Success notification
  success: (message, options) => sonnerToast.success(message, options),
  
  // Error notification
  error: (message, options) => sonnerToast.error(message, options),
  
  // Info notification
  info: (message, options) => sonnerToast.info(message, options),
  
  // Warning notification
  warning: (message, options) => sonnerToast.warning(message, options),
  
  // Loading notification (returns a toastId)
  loading: (message, options) => sonnerToast.loading(message, options),
  
  // Promise-based notifications
  promise: (promise, options) => sonnerToast.promise(promise, options),
  
  // Custom toast
  custom: (message, options) => sonnerToast(message, options),
  
  // Dismiss a toast
  dismiss: (toastId) => sonnerToast.dismiss(toastId),
  
  // Dismiss all toasts
  dismissAll: () => sonnerToast.dismiss(),
};

export default toast;

