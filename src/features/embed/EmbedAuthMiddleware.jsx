// src/features/embed/EmbedAuthMiddleware.jsx
import React, { useState, useEffect } from 'react';
import { authManager } from '../../lib/auth';
import EmbedAuthPage from './EmbedAuthPage';

const EmbedAuthMiddleware = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = authManager.isAuthenticated();
      const userData = authManager.getUser();
      
      setIsAuthenticated(authenticated);
      setUser(userData);
      setLoading(false);
      
      console.log('🔒 Auth check:', authenticated ? 'Authenticated' : 'Not authenticated');
    };

    checkAuth();

    // Listen for auth state changes
    const handleStorageChange = (e) => {
      if (e.key === 'auth_token' || e.key === 'user_data') {
        checkAuth();
      }
    };

    // Listen for auth events from other components
    const handleAuthEvent = (event) => {
      if (event.detail?.type === 'auth_success') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('embed_auth_event', handleAuthEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('embed_auth_event', handleAuthEvent);
    };
  }, []);

  const handleAuthSuccess = (userData, token) => {
    setIsAuthenticated(true);
    setUser(userData);
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('embed_auth_event', {
      detail: { type: 'auth_success', user: userData, token }
    }));

    // Notify parent window
    try {
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'saas-chatbot-embed',
          action: 'auth-success',
          data: { user: userData }
        }, '*');
      }
    } catch (error) {
      console.error('Failed to notify parent:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <EmbedAuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  // Pass user data to children
  return React.cloneElement(children, { user });
};

export default EmbedAuthMiddleware;
