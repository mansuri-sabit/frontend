// src/lib/auth.js
import { jwtDecode } from 'jwt-decode';
import { apiClient } from './api';

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token'; // optional; backend doesn't use it
const USER_KEY = 'user_data';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export class AuthManager {
  constructor() {
    this.token = this._get(TOKEN_KEY);
    this.refreshToken = this._get(REFRESH_TOKEN_KEY);
    this.user = this._getJSON(USER_KEY);
    this.refreshTimeout = null;
  }

  // ---------- Token helpers ----------
  setToken(token) {
    this.token = token || null;
    this._set(TOKEN_KEY, token || '');
    
    // Also set cookie for iframe access
    if (token) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 7); // 7 days
      document.cookie = `auth_token=${token}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
    } else {
      document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  }

  getToken() {
    return this.token || this._get(TOKEN_KEY);
  }

  removeToken() {
    this.token = null;
    this._del(TOKEN_KEY);
    document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  }

  setRefreshToken(refreshToken) {
    this.refreshToken = refreshToken || null;
    this._set(REFRESH_TOKEN_KEY, refreshToken || '');
  }

  getRefreshToken() {
    return this.refreshToken || this._get(REFRESH_TOKEN_KEY);
  }

  removeRefreshToken() {
    this.refreshToken = null;
    this._del(REFRESH_TOKEN_KEY);
  }

  setTokens(token, refreshToken = null) {
    this.setToken(token);
    if (refreshToken !== undefined) this.setRefreshToken(refreshToken);
  }

  // ---------- User helpers ----------
  setUser(user) {
    this.user = user || null;
    this._setJSON(USER_KEY, user || null);
  }

  getUser() {
    return this.user || this._getJSON(USER_KEY);
  }

  removeUser() {
    this.user = null;
    this._del(USER_KEY);
  }

  // ---------- JWT helpers ----------
  isTokenValid(token = this.getToken()) {
    if (!token) return false;
    try {
      const { exp } = jwtDecode(token);
      if (!exp) return false;
      const now = Date.now() / 1000;
      // small 5s buffer to avoid edge flicker
      return exp > now + 5;
    } catch {
      return false;
    }
  }

  isTokenExpiringSoon(token = this.getToken(), thresholdMinutes = 5) {
    if (!token) return false;
    try {
      const { exp } = jwtDecode(token);
      const now = Date.now() / 1000;
      return exp <= now + thresholdMinutes * 60;
    } catch {
      return false;
    }
  }

  decodeToken(token = this.getToken()) {
    if (!token || typeof token !== 'string') {
      console.warn('Invalid token provided to decodeToken:', typeof token);
      return null;
    }
    try {
      return jwtDecode(token);
    } catch (error) {
      console.warn('Failed to decode JWT token:', error.message);
      return null;
    }
  }

  getUserFromToken(token = this.getToken()) {
    const decoded = this.decodeToken(token);
    if (!decoded) return null;
    return {
      id: decoded.user_id || decoded.sub,
      username: decoded.username,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      client_id: decoded.client_id,
      permissions: decoded.permissions || [],
    };
  }

  getTokenExpiration(token = this.getToken()) {
    const decoded = this.decodeToken(token);
    return decoded?.exp ? new Date(decoded.exp * 1000) : null;
  }

  getTimeUntilExpiration(token = this.getToken()) {
    const exp = this.getTokenExpiration(token);
    return exp ? exp.getTime() - Date.now() : 0;
  }

  // ---------- Role/permission checks ----------
  hasRole(role, user = this.getUser()) {
    return (user?.role || '').toLowerCase() === String(role).toLowerCase();
  }

  hasAnyRole(roles = [], user = this.getUser()) {
    const r = (user?.role || '').toLowerCase();
    return roles.map(x => String(x).toLowerCase()).includes(r);
  }

  hasPermission(permission, user = this.getUser()) {
    return Boolean(user?.permissions?.includes(permission));
  }

  hasAnyPermission(permissions = [], user = this.getUser()) {
    const up = user?.permissions || [];
    return permissions.some(p => up.includes(p));
  }

  isAdmin(user = this.getUser()) { return this.hasRole('admin', user); }
  isClient(user = this.getUser()) { return this.hasRole('client', user); }
  isVisitor(user = this.getUser()) { return this.hasRole('visitor', user); }

  // ---------- Session ----------
  isAuthenticated() {
    return this.isTokenValid(this.getToken()) && !!this.getUser();
  }

  startSession({ token, refresh_token = null, user = null } = {}) {
    this.setTokens(token, refresh_token);
    const userData = user || this.getUserFromToken(token);
    if (userData) this.setUser(userData);
    this._setupTokenRefresh(); // optional; uses /auth/refresh with current token
    console.log('✅ Authentication session started');
  }

  endSession() {
    this.removeToken();
    this.removeRefreshToken();
    this.removeUser();
    this._clearTokenRefresh();
    console.log('🗑️ Authentication session ended');
  }

  clearAuth() {
    this.endSession();
  }

  getAuthHeaders() {
    const t = this.getToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }

  getTokenPayload() {
    return this.decodeToken();
  }

  // ✅ MISSING LOGIN METHOD - ADDED
  async login(credentials) {
    try {
      console.log('🔄 Starting login with:', credentials);
      const response = await apiClient.login(credentials);
      const { access_token, user, refresh_token } = response;
      
      // Validate token before proceeding
      if (!access_token || typeof access_token !== 'string') {
        throw new Error('Invalid token received from server');
      }
      
      this.startSession({ token: access_token, user, refresh_token });
      return { success: true, user, token: access_token };
    } catch (error) {
      console.error('❌ Login failed:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      
      let errorMessage = 'Login failed. Please try again.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { success: false, error: errorMessage };
    }
  }

  // ✅ MISSING REGISTER METHOD - ADDED
  async register(userData) {
    try {
      console.log('🔄 Starting registration with data:', userData);
      const response = await apiClient.register(userData);
      console.log('✅ Registration response:', response);
      
      const { token, user, refresh_token } = response;
      
      this.startSession({ token, user, refresh_token });
      return { success: true, user, token };
    } catch (error) {
      console.error('❌ Registration failed - Full error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.message);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.response?.data) {
        if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { 
        success: false, 
        error: errorMessage,
        details: error.response?.data
      };
    }
  }

  // ✅ MISSING LOGOUT METHOD - ADDED
  async logout() {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.endSession();
    }
  }

  // ---------- Refresh flow (matches Go backend: /auth/refresh with Authorization: Bearer <current token>) ----------
  async refreshTokens() {
    const token = this.getToken();
    if (!token) throw new Error('No token to refresh');

    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Token refresh failed');

    const data = await res.json(); // { token, expires_at }
    if (data?.token) {
      this.setToken(data.token);
      // user claims (role/client_id) come from token; keep existing user but update derived fields if needed
      const patched = { ...this.getUser(), ...this.getUserFromToken(data.token) };
      this.setUser(patched);
      this._setupTokenRefresh();
    }
    return data;
  }

  _setupTokenRefresh() {
    // DISABLED to prevent conflicts with API interceptor
    // The API interceptor handles token refresh on 401 errors
    console.log('Auth manager auto-refresh disabled - using API interceptor for token refresh');
  }

  _clearTokenRefresh() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  // ---------- Storage (localStorage; simple & reliable) ----------
  _set(key, value) {
    try {
      if (value === null || value === undefined || value === '') {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, value);
      }
    } catch {}
  }

  _get(key) {
    try {
      const v = localStorage.getItem(key);
      return v || null;
    } catch {
      return null;
    }
  }

  _del(key) {
    try { localStorage.removeItem(key); } catch {}
  }

  _setJSON(key, obj) {
    try {
      if (obj === null || obj === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(obj));
      }
    } catch {}
  }

  _getJSON(key) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  }
}

// Singleton
export const authManager = new AuthManager();
export default authManager;
