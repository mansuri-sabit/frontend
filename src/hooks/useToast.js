// src/hooks/useToast.js
import { useContext, useState, useCallback } from 'react';
import { ToastContext } from '../app/providers';

export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
};

// Alternative standalone hook if not using context
export const useToastStandalone = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now().toString();
    const newToast = {
      id,
      type: 'info',
      duration: 4000,
      ...toast,
    };
    
    setToasts(prev => [...prev, newToast]);
    
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const toast = {
    success: (message, options) => addToast({ type: 'success', message, ...options }),
    error: (message, options) => addToast({ type: 'error', message, duration: 6000, ...options }),
    warning: (message, options) => addToast({ type: 'warning', message, ...options }),
    info: (message, options) => addToast({ type: 'info', message, ...options }),
    loading: (message, options) => addToast({ type: 'loading', message, duration: 0, ...options }),
  };

  return { toast, toasts, removeToast, clearToasts };
};
