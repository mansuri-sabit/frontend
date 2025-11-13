// src/components/AuthDebug.jsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { authManager } from '../lib/auth';
import { apiClient } from '../lib/api';

const AuthDebug = () => {
  const [authState, setAuthState] = useState({});
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = () => {
    const state = {
      isAuthenticated: authManager.isAuthenticated?.(),
      hasToken: !!authManager.getToken?.(),
      token: authManager.getToken?.(),
      user: authManager.getUser?.(),
      tokenValid: authManager.isTokenValid?.(authManager.getToken?.()),
    };
    setAuthState(state);
  };

  const testAuth = async () => {
    try {
      const result = await apiClient.get('/test-auth');
      setTestResult({ success: true, data: result });
    } catch (error) {
      setTestResult({ success: false, error: error.message, status: error.response?.status });
    }
  };

  const testMediaUpload = async () => {
    try {
      // Create a test file
      const testFile = new File(['test content'], 'test.svg', { type: 'image/svg+xml' });
      const result = await apiClient.uploadLauncherMedia(testFile, 'svg');
      setTestResult({ success: true, data: result });
    } catch (error) {
      setTestResult({ success: false, error: error.message, status: error.response?.status });
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <h3 className="text-lg font-medium">Authentication Debug</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">Auth State:</h4>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
              {JSON.stringify(authState, null, 2)}
            </pre>
          </div>
          <div>
            <h4 className="font-medium mb-2">Test Result:</h4>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button onClick={checkAuthState} variant="outline" size="sm">
            Refresh Auth State
          </Button>
          <Button onClick={testAuth} variant="outline" size="sm">
            Test Auth Endpoint
          </Button>
          <Button onClick={testMediaUpload} variant="outline" size="sm">
            Test Media Upload
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthDebug;


