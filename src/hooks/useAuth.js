// src/hooks/useAuth.js
import { useAuthStore } from '../store/authStore';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useAuth = () => {
  const navigate = useNavigate();
  const {
    token,
    user,
    isAuthenticated,
    isLoading,
    login: storeLogin,
    register: storeRegister,
    logout: storeLogout,
    validateToken,
  } = useAuthStore();

  const login = useCallback(async (credentials) => {
    try {
      const result = await storeLogin(credentials);
      return result;
    } catch (error) {
      throw new Error(error.message || 'Login failed');
    }
  }, [storeLogin]);

  const register = useCallback(async (userData) => {
    try {
      const result = await storeRegister(userData);
      return result;
    } catch (error) {
      throw new Error(error.message || 'Registration failed');
    }
  }, [storeRegister]);

  const logout = useCallback(() => {
    storeLogout();
    navigate('/login');
  }, [storeLogout, navigate]);

  const hasRole = useCallback((role) => {
    return user?.role === role;
  }, [user?.role]);

  const hasAnyRole = useCallback((roles) => {
    return roles.includes(user?.role);
  }, [user?.role]);

  const isAdmin = useCallback(() => {
    return hasRole('admin');
  }, [hasRole]);

  const isClient = useCallback(() => {
    return hasRole('client');
  }, [hasRole]);

  const isVisitor = useCallback(() => {
    return hasRole('visitor');
  }, [hasRole]);

  return {
    // State
    token,
    user,
    isAuthenticated,
    isLoading,
    
    // Actions
    login,
    register,
    logout,
    
    // Utilities
    hasRole,
    hasAnyRole,
    isAdmin,
    isClient,
    isVisitor,
    validateToken,
  };
};
