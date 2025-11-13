// src/hooks/useApi.js
import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '../lib/api';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const request = useCallback(async (endpoint, options = {}) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.request(endpoint, {
        ...options,
        signal: abortControllerRef.current.signal,
      });
      
      return response;
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Request failed');
        throw err;
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  const get = useCallback((endpoint, options = {}) => {
    return request(endpoint, { ...options, method: 'GET' });
  }, [request]);

  const post = useCallback((endpoint, data, options = {}) => {
    return request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }, [request]);

  const put = useCallback((endpoint, data, options = {}) => {
    return request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }, [request]);

  const del = useCallback((endpoint, options = {}) => {
    return request(endpoint, { ...options, method: 'DELETE' });
  }, [request]);

  const upload = useCallback((endpoint, formData, options = {}) => {
    return request(endpoint, {
      ...options,
      method: 'POST',
      headers: {}, // Remove Content-Type for FormData
      body: formData,
    });
  }, [request]);

  // Cancel request on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    loading,
    error,
    request,
    get,
    post,
    put,
    delete: del,
    upload,
    cancel,
  };
};
