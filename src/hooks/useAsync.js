// src/hooks/useAsync.js
import { useState, useEffect, useCallback, useRef } from 'react';

export const useAsync = (asyncFunction, dependencies = []) => {
  const [state, setState] = useState({
    data: null,
    error: null,
    loading: false,
  });
  
  const mountedRef = useRef(true);

  const execute = useCallback(async (...args) => {
    setState({ data: null, error: null, loading: true });
    
    try {
      const data = await asyncFunction(...args);
      if (mountedRef.current) {
        setState({ data, error: null, loading: false });
      }
      return data;
    } catch (error) {
      if (mountedRef.current) {
        setState({ data: null, error, loading: false });
      }
      throw error;
    }
  }, dependencies);

  useEffect(() => {
    execute();
  }, dependencies);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    ...state,
    execute,
    reset: () => setState({ data: null, error: null, loading: false }),
  };
};

export const useAsyncCallback = (asyncFunction, dependencies = []) => {
  const [state, setState] = useState({
    data: null,
    error: null,
    loading: false,
  });
  
  const mountedRef = useRef(true);

  const execute = useCallback(async (...args) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await asyncFunction(...args);
      if (mountedRef.current) {
        setState({ data, error: null, loading: false });
      }
      return data;
    } catch (error) {
      if (mountedRef.current) {
        setState({ data: null, error, loading: false });
      }
      throw error;
    }
  }, dependencies);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    ...state,
    execute,
    reset: () => setState({ data: null, error: null, loading: false }),
  };
};
