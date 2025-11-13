// src/pages/ServerError.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store';
import { Button } from '../ui/Button';
import { CardContent } from '../ui/Card';
import { Card } from '../ui/Card';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import toast from '@/lib/toast';

const ServerError = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [errorDetails, setErrorDetails] = useState({});

  // Get error details from location state or URL params
  useEffect(() => {
    const state = location.state || {};
    const urlParams = new URLSearchParams(location.search);
    
    setErrorDetails({
      status: state.status || urlParams.get('status') || '500',
      message: state.message || urlParams.get('message') || 'Internal Server Error',
      timestamp: state.timestamp || new Date().toISOString(),
      errorId: state.errorId || urlParams.get('errorId') || generateErrorId(),
      path: state.path || urlParams.get('path') || window.location.pathname,
      userAgent: navigator.userAgent,
      ...state,
    });
  }, [location]);

  const generateErrorId = () => {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const getErrorTitle = (status) => {
    const titles = {
      '500': 'Internal Server Error',
      '502': 'Bad Gateway',
      '503': 'Service Unavailable',
      '504': 'Gateway Timeout',
      '507': 'Insufficient Storage',
      '508': 'Loop Detected',
      '510': 'Not Extended',
      '511': 'Network Authentication Required',
    };
    return titles[status] || 'Server Error';
  };

  const getErrorDescription = (status) => {
    const descriptions = {
      '500': 'The server encountered an unexpected condition that prevented it from fulfilling your request.',
      '502': 'The server received an invalid response from an upstream server while trying to fulfill your request.',
      '503': 'The server is temporarily unavailable due to maintenance or high load. Please try again later.',
      '504': 'The server took too long to respond. This might be a temporary issue.',
      '507': 'The server ran out of storage space needed to complete your request.',
      '508': 'The server detected an infinite loop while processing your request.',
      '510': 'The server requires additional extensions to fulfill your request.',
      '511': 'You need to authenticate to gain network access.',
    };
    return descriptions[status] || 'An unexpected error occurred on our servers.';
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryCount(prev => prev + 1);

    try {
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to reload the current page or go to a safe location
      if (errorDetails.path && errorDetails.path !== '/error') {
        navigate(errorDetails.path, { replace: true });
      } else {
        window.location.reload();
      }
    } catch (error) {
      toast.error('Retry failed. Please try again later.');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleGoHome = () => {
    navigate(isAuthenticated ? '/dashboard' : '/', { replace: true });
  };

  const handleReportError = () => {
    const errorReport = {
      errorId: errorDetails.errorId,
      status: errorDetails.status,
      message: errorDetails.message,
      timestamp: errorDetails.timestamp,
      path: errorDetails.path,
      userAgent: errorDetails.userAgent,
      userId: isAuthenticated ? 'authenticated' : 'anonymous',
    };

    const subject = `Error Report - ${errorDetails.errorId}`;
    const body = `Error Details:\n\n${JSON.stringify(errorReport, null, 2)}`;
    
    window.open(
      `mailto:support@example.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    );
  };

  const copyErrorDetails = () => {
    const errorInfo = `Error ID: ${errorDetails.errorId}\nStatus: ${errorDetails.status}\nTime: ${new Date(errorDetails.timestamp).toLocaleString()}\nPath: ${errorDetails.path}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(errorInfo).then(() => {
        toast.success('Error details copied to clipboard');
      }).catch(() => {
        toast.error('Failed to copy error details');
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = errorInfo;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Error details copied to clipboard');
    }
  };

  const getStatusColor = (status) => {
    if (status.startsWith('5')) return 'danger';
    if (status.startsWith('4')) return 'warning';
    return 'default';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          
          <h1 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
            {getErrorTitle(errorDetails.status)}
          </h1>
          
          <div className="mt-2 flex items-center justify-center space-x-2">
            <Badge variant={getStatusColor(errorDetails.status)}>
              {errorDetails.status}
            </Badge>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(errorDetails.timestamp).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <Card>
          <CardContent className="px-6 py-8">
            <div className="space-y-6">
              {/* Error Description */}
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  {errorDetails.message || getErrorDescription(errorDetails.status)}
                </p>
              </div>

              {/* Error Details */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Error Details
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Error ID:</dt>
                    <dd className="text-gray-900 dark:text-white font-mono text-xs">
                      {errorDetails.errorId}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Status Code:</dt>
                    <dd className="text-gray-900 dark:text-white font-medium">
                      {errorDetails.status}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500 dark:text-gray-400">Time:</dt>
                    <dd className="text-gray-900 dark:text-white">
                      {new Date(errorDetails.timestamp).toLocaleString()}
                    </dd>
                  </div>
                  {errorDetails.path && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">Path:</dt>
                      <dd className="text-gray-900 dark:text-white font-mono text-xs">
                        {errorDetails.path}
                      </dd>
                    </div>
                  )}
                </dl>
                
                <Button
                  onClick={copyErrorDetails}
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Error Details
                </Button>
              </div>

              {/* Retry Information */}
              {retryCount > 0 && (
                <Alert variant="info">
                  <div className="text-sm">
                    You have tried {retryCount} time{retryCount > 1 ? 's' : ''}. 
                    {retryCount >= 3 && ' Consider reporting this issue if the problem persists.'}
                  </div>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={handleRetry}
                  variant="primary"
                  className="w-full"
                  loading={isRetrying}
                  disabled={isRetrying}
                >
                  {isRetrying ? 'Retrying...' : 'Try Again'}
                </Button>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleGoHome}
                    variant="outline"
                    className="w-full"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Go Home
                  </Button>
                  
                  <Button
                    onClick={() => window.history.back()}
                    variant="outline"
                    className="w-full"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Go Back
                  </Button>
                </div>
              </div>

              {/* Report Error */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <div className="text-center space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    If this problem persists, please report it to our support team.
                  </p>
                  
                  <Button
                    onClick={handleReportError}
                    variant="outline"
                    size="sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Report Error
                  </Button>
                </div>
              </div>

              {/* Additional Help */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  What can you do?
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Wait a few minutes and try again</li>
                  <li>• Check your internet connection</li>
                  <li>• Clear your browser cache and cookies</li>
                  <li>• Try using a different browser</li>
                  {errorDetails.status === '503' && (
                    <li>• The service may be under maintenance</li>
                  )}
                </ul>
              </div>

              {/* Footer */}
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Need immediate help?{' '}
                  <a
                    href="mailto:support@example.com"
                    className="text-primary-600 hover:text-primary-500 dark:text-primary-400"
                  >
                    Contact Support
                  </a>
                  {' '} • {' '}
                  <Link
                    to="/status"
                    className="text-primary-600 hover:text-primary-500 dark:text-primary-400"
                  >
                    System Status
                  </Link>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accessibility */}
      <div className="sr-only" aria-live="polite">
        {isRetrying && 'Retrying request...'}
      </div>
    </div>
  );
};

export { ServerError };
export default ServerError;
