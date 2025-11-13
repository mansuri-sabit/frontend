// src/pages/Unauthorized.jsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { Button } from '../ui/Button';
import { CardContent } from '../ui/Card';
import { Card } from '../ui/Card';
import { Alert } from '../ui/Alert';

const Unauthorized = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [countdown, setCountdown] = useState(10);
  const [autoRedirect, setAutoRedirect] = useState(true);

  // Get error details from location state
  const errorDetails = location.state || {};
  const {
    requiredRole = null,
    userRole = user?.role,
    requiredPermissions = null,
    userPermissions = user?.permissions || [],
    message = null,
    redirectTo = isAuthenticated ? '/dashboard' : '/login',
  } = errorDetails;

  // Auto-redirect countdown
  useEffect(() => {
    if (!autoRedirect) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate(redirectTo, { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate, redirectTo, autoRedirect]);

  const handleStopRedirect = () => {
    setAutoRedirect(false);
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(isAuthenticated ? '/dashboard' : '/', { replace: true });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getErrorMessage = () => {
    if (message) return message;

    if (!isAuthenticated) {
      return 'You need to sign in to access this page.';
    }

    if (requiredRole) {
      return `This page requires ${requiredRole} access. Your current role: ${userRole || 'none'}.`;
    }

    if (requiredPermissions) {
      const missing = Array.isArray(requiredPermissions) 
        ? requiredPermissions.filter(p => !userPermissions.includes(p))
        : [requiredPermissions].filter(p => !userPermissions.includes(p));
      
      return `You don't have the required permissions: ${missing.join(', ')}.`;
    }

    return 'You don\'t have permission to access this page.';
  };

  const getSuggestions = () => {
    const suggestions = [];

    if (!isAuthenticated) {
      suggestions.push({
        title: 'Sign In',
        description: 'Sign in to your account to access this content',
        action: () => navigate('/login'),
        icon: 'login',
        primary: true,
      });
    } else {
      if (requiredRole && requiredRole !== userRole) {
        if (requiredRole === 'admin') {
          suggestions.push({
            title: 'Request Admin Access',
            description: 'Contact support to request administrator privileges',
            action: () => window.open('mailto:support@example.com?subject=Admin Access Request'),
            icon: 'mail',
          });
        } else if (requiredRole === 'client' && userRole === 'visitor') {
          suggestions.push({
            title: 'Upgrade Account',
            description: 'Upgrade to a client account to access this feature',
            action: () => navigate('/upgrade'),
            icon: 'upgrade',
          });
        }
      }

      suggestions.push({
        title: 'Go to Dashboard',
        description: 'Return to your main dashboard',
        action: () => navigate('/dashboard'),
        icon: 'dashboard',
      });

      suggestions.push({
        title: 'Sign Out',
        description: 'Sign out and sign in with a different account',
        action: handleLogout,
        icon: 'logout',
      });
    }

    suggestions.push({
      title: 'Go Back',
      description: 'Return to the previous page',
      action: handleGoBack,
      icon: 'back',
    });

    return suggestions;
  };

  const getIcon = (iconName) => {
    const icons = {
      login: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      ),
      mail: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      upgrade: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      ),
      dashboard: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        </svg>
      ),
      logout: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      ),
      back: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      ),
    };
    return icons[iconName] || icons.back;
  };

  const suggestions = getSuggestions();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          {/* Error Icon */}
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-red-100 dark:bg-red-900/20">
            <svg
              className="h-12 w-12 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          
          <h1 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            Access Denied
          </h1>
          
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Error 403 - Unauthorized
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardContent className="px-6 py-8">
            <div className="space-y-6">
              {/* Error Message */}
              <Alert variant="error">
                <div className="text-sm">
                  {getErrorMessage()}
                </div>
              </Alert>

              {/* User Info */}
              {isAuthenticated && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Current Session
                  </h3>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">User:</dt>
                      <dd className="text-gray-900 dark:text-white font-medium">
                        {user?.name || user?.username}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">Role:</dt>
                      <dd className="text-gray-900 dark:text-white font-medium capitalize">
                        {userRole || 'none'}
                      </dd>
                    </div>
                    {userPermissions.length > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500 dark:text-gray-400">Permissions:</dt>
                        <dd className="text-gray-900 dark:text-white font-medium">
                          {userPermissions.slice(0, 2).join(', ')}
                          {userPermissions.length > 2 && ` +${userPermissions.length - 2} more`}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Auto-redirect Notice */}
              {autoRedirect && (
                <Alert variant="info">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      Redirecting in {countdown} seconds...
                    </span>
                    <Button
                      onClick={handleStopRedirect}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </Alert>
              )}

              {/* Action Suggestions */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  What would you like to do?
                </h3>
                
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={suggestion.action}
                      className={`w-full flex items-center justify-between p-3 text-left rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        suggestion.primary 
                          ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-600' 
                          : 'bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`flex-shrink-0 ${
                          suggestion.primary 
                            ? 'text-primary-600 dark:text-primary-400' 
                            : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {getIcon(suggestion.icon)}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${
                            suggestion.primary 
                              ? 'text-primary-900 dark:text-primary-100' 
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {suggestion.title}
                          </p>
                          <p className={`text-xs ${
                            suggestion.primary 
                              ? 'text-primary-600 dark:text-primary-400' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {suggestion.description}
                          </p>
                        </div>
                      </div>
                      <svg 
                        className={`w-4 h-4 ${
                          suggestion.primary 
                            ? 'text-primary-400' 
                            : 'text-gray-300 dark:text-gray-600'
                        }`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* Help Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Need help? Contact support at{' '}
                  <a
                    href="mailto:support@example.com"
                    className="text-primary-600 hover:text-primary-500 dark:text-primary-400"
                  >
                    support@example.com
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accessibility */}
      <div className="sr-only" aria-live="polite">
        {autoRedirect && `Redirecting in ${countdown} seconds`}
      </div>
    </div>
  );
};

export { Unauthorized };
export default Unauthorized;
