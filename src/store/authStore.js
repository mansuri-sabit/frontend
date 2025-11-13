// src/store/authStore.js
import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { apiClient } from '../lib/api';
import { authManager } from '../lib/auth';
import { jwtDecode } from 'jwt-decode';

export const useAuthStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // State
        token: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        loginAttempts: 0,
        lastLoginAttempt: null,
        tokenValidationInterval: null,
        sessionTimeout: null,

        // Actions
        login: async (credentials) => {
          const state = get();
          
          // Rate limiting check
          if (state.loginAttempts >= 5) {
            const timeSinceLastAttempt = Date.now() - (state.lastLoginAttempt || 0);
            const waitTime = 15 * 60 * 1000; // 15 minutes
            
            if (timeSinceLastAttempt < waitTime) {
              const remainingTime = Math.ceil((waitTime - timeSinceLastAttempt) / 1000 / 60);
              throw new Error(`Too many login attempts. Try again in ${remainingTime} minutes.`);
            } else {
              // Reset attempts after wait time
              set({ loginAttempts: 0, lastLoginAttempt: null });
            }
          }

          set({ isLoading: true, error: null });

          try {
            const response = await apiClient.login(credentials);
            const { access_token, refresh_token, user } = response;

            // Validate token before decoding
            if (!access_token || typeof access_token !== 'string') {
              throw new Error('Invalid token received from server');
            }

            // Decode token to get user info
            const decodedToken = jwtDecode(access_token);
            
            // Get avatar_url from user response (backend sends it as avatar_url in JSON)
            const avatarUrl = user?.avatar_url || user?.AvatarURL || user?.avatar || '';
            
            const userData = {
              id: decodedToken.user_id || decodedToken.sub,
              username: user?.username || decodedToken.username,
              email: user?.email || decodedToken.email,
              name: user?.name || decodedToken.name,
              role: decodedToken.role,
              client_id: decodedToken.client_id,
              permissions: decodedToken.permissions || [],
              avatar: avatarUrl,
              avatar_url: avatarUrl,
              created_at: user?.created_at,
              last_login: new Date().toISOString(),
            };

            // Store in auth manager
            authManager.startSession({ token: access_token, refresh_token, user: userData });

            // Set session timeout
            get().setupSessionTimeout();

            set({
              token: access_token,
              refreshToken: refresh_token,
              user: userData,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              loginAttempts: 0,
              lastLoginAttempt: null,
            });

            return response;
          } catch (error) {
            // Extract user-friendly error message from axios error response
            let errorMessage = 'Invalid username or password.';
            
            if (error.response?.data?.message) {
              // Server returned a specific error message
              errorMessage = error.response.data.message;
            } else if (error.response?.status === 401) {
              // 401 Unauthorized - invalid credentials
              errorMessage = 'Invalid username or password.';
            } else if (error.response?.status === 403) {
              // 403 Forbidden - account access denied
              errorMessage = error.response.data?.message || 'Access denied. Please contact support.';
            } else if (error.response?.status >= 500) {
              // Server error
              errorMessage = 'Server error. Please try again later.';
            } else if (error.message) {
              // Network or other errors
              errorMessage = error.message;
            }
            
            set(state => ({
              isLoading: false,
              error: errorMessage,
              loginAttempts: state.loginAttempts + 1,
              lastLoginAttempt: Date.now(),
            }));
            
            // Create a new error with the user-friendly message
            const loginError = new Error(errorMessage);
            loginError.response = error.response;
            loginError.status = error.response?.status;
            throw loginError;
          }
        },

        register: async (userData) => {
          set({ isLoading: true, error: null });

          try {
            const response = await apiClient.register(userData);
            const { token, refresh_token, user } = response;

            // Decode token
            const decodedToken = jwtDecode(token);
            
            // Get avatar_url from user response (backend sends it as avatar_url in JSON)
            const avatarUrl = user?.avatar_url || user?.AvatarURL || user?.avatar || '';
            
            const userInfo = {
              id: decodedToken.user_id || decodedToken.sub,
              username: user?.username || decodedToken.username,
              email: user?.email || decodedToken.email,
              name: user?.name || decodedToken.name,
              role: decodedToken.role,
              client_id: decodedToken.client_id,
              permissions: decodedToken.permissions || [],
              avatar: avatarUrl,
              avatar_url: avatarUrl,
              created_at: user?.created_at,
              last_login: new Date().toISOString(),
            };

            // Store in auth manager
            authManager.startSession({ token, refresh_token, user: userInfo });

            // Set session timeout
            get().setupSessionTimeout();

            set({
              token,
              refreshToken: refresh_token,
              user: userInfo,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            return response;
          } catch (error) {
            set({
              isLoading: false,
              error: error.message,
            });
            throw error;
          }
        },

        logout: async () => {
          set({ isLoading: true });

          try {
            // Call logout endpoint if authenticated
            if (get().isAuthenticated) {
              await apiClient.logout().catch(() => {
                // Ignore logout API errors
              });
            }
          } finally {
            // Always clear local state
            get().clearSession();
            authManager.endSession();
            
            set({
              token: null,
              refreshToken: null,
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
              loginAttempts: 0,
              lastLoginAttempt: null,
            });
          }
        },

        refreshTokens: async () => {
          const { refreshToken: currentRefreshToken } = get();
          
          if (!currentRefreshToken) {
            throw new Error('No refresh token available');
          }

          set({ isLoading: true });

          try {
            const response = await apiClient.refreshToken();
            const { token, refresh_token, user } = response;

            const decodedToken = jwtDecode(token);
            const userData = {
              ...get().user,
              ...user,
              id: decodedToken.user_id || decodedToken.sub,
              role: decodedToken.role,
              client_id: decodedToken.client_id,
              permissions: decodedToken.permissions || [],
            };

            authManager.startSession({ token, refresh_token, user: userData });

            // Reset session timeout
            get().setupSessionTimeout();

            set({
              token,
              refreshToken: refresh_token,
              user: userData,
              isLoading: false,
            });

            return response;
          } catch (error) {
            // Refresh failed, logout user
            get().logout();
            throw error;
          }
        },

        updateUser: (userData) => {
          set(state => {
            const updatedUser = { ...state.user, ...userData };
            
            // Sync avatar_url and avatar fields for backward compatibility
            if (userData.avatar_url && !updatedUser.avatar) {
              updatedUser.avatar = userData.avatar_url;
            }
            if (userData.avatar && !updatedUser.avatar_url) {
              updatedUser.avatar_url = userData.avatar;
            }
            
            return { user: updatedUser };
          });
          
          // Update in auth manager
          const currentUser = get().user;
          authManager.setUser(currentUser);
        },

        updateProfile: async (profileData) => {
          set({ isLoading: true, error: null });

          try {
            const response = await apiClient.updateProfile(profileData);
            
            set(state => ({
              user: { ...state.user, ...response },
              isLoading: false,
            }));

            // Update in auth manager
            authManager.setUser({ ...get().user, ...response });

            return response;
          } catch (error) {
            set({
              isLoading: false,
              error: error.message,
            });
            throw error;
          }
        },

        changePassword: async (passwordData) => {
          set({ isLoading: true, error: null });

          try {
            const response = await apiClient.changePassword(passwordData);
            
            set({ isLoading: false });
            
            return response;
          } catch (error) {
            set({
              isLoading: false,
              error: error.message,
            });
            throw error;
          }
        },

        forgotPassword: async (email) => {
          set({ isLoading: true, error: null });

          try {
            // Handle both string email and { email } object
            const emailString = typeof email === 'string' ? email : email?.email || email;
            
            const response = await apiClient.forgotPassword(emailString);
            
            set({ isLoading: false, error: null });
            
            // Return success response even if backend doesn't reveal email existence
            return response || { message: 'If an account exists for this email, we\'ve sent instructions to reset the password.' };
          } catch (error) {
            // Check if it's actually an error or just security (email might not exist)
            const errorStatus = error?.response?.status;
            const errorMessage = error?.response?.data?.message || error?.message || 'Failed to send reset email';
            
            // If it's 200 or success-like response, don't treat as error
            if (errorStatus === 200 || (errorStatus >= 200 && errorStatus < 300)) {
              set({ isLoading: false, error: null });
              return { message: 'If an account exists for this email, we\'ve sent instructions to reset the password.' };
            }
            
            set({
              isLoading: false,
              error: errorMessage,
            });
            throw error;
          }
        },

        verifyResetToken: async (email, token) => {
          set({ isLoading: true, error: null });

          try {
            const response = await apiClient.verifyResetToken(email, token);
            
            set({ isLoading: false });
            
            return response;
          } catch (error) {
            set({
              isLoading: false,
              error: error.message || error.response?.data?.message || 'Invalid or expired token',
            });
            throw error;
          }
        },

        resetPassword: async (email, token, password) => {
          set({ isLoading: true, error: null });

          try {
            const response = await apiClient.resetPassword(email, token, password);
            
            set({ isLoading: false });
            
            return response;
          } catch (error) {
            set({
              isLoading: false,
              error: error.message || error.response?.data?.message || 'Failed to reset password',
            });
            throw error;
          }
        },

        verifyEmail: async (token) => {
          set({ isLoading: true, error: null });

          try {
            const response = await apiClient.verifyEmail(token);
            
            // Update user verification status
            set(state => ({
              user: { 
                ...state.user, 
                email_verified: true,
                email_verified_at: new Date().toISOString(),
              },
              isLoading: false,
            }));

            return response;
          } catch (error) {
            set({
              isLoading: false,
              error: error.message,
            });
            throw error;
          }
        },

        clearError: () => {
          set({ error: null });
        },

        // Session management
        setupSessionTimeout: () => {
          const state = get();
          
          // Clear existing timeout
          if (state.sessionTimeout) {
            clearTimeout(state.sessionTimeout);
          }

          // Set new timeout
          const timeout = setTimeout(() => {
            get().logout();
          }, parseInt(import.meta.env.VITE_SESSION_TIMEOUT) || 3600000); // 1 hour default

          set({ sessionTimeout: timeout });
        },

        clearSession: () => {
          const state = get();
          
          // Clear timeouts and intervals
          if (state.sessionTimeout) {
            clearTimeout(state.sessionTimeout);
          }
          if (state.tokenValidationInterval) {
            clearInterval(state.tokenValidationInterval);
          }

          set({
            sessionTimeout: null,
            tokenValidationInterval: null,
          });
        },

        // Token validation
        validateToken: () => {
          const { token } = get();
          const isValid = authManager.isTokenValid(token);
          
          if (!isValid) {
            get().logout();
          }
          
          return isValid;
        },

        // Auto token refresh - DISABLED to prevent conflicts with API interceptor
        setupAutoRefresh: () => {
          // Disabled to prevent conflicts with API interceptor refresh mechanism
          // The API interceptor handles token refresh on 401 errors
          console.log('Auto refresh disabled - using API interceptor for token refresh');
        },

        // Role and permission checks
        hasRole: (role) => {
          return authManager.hasRole(role, get().user);
        },

        hasAnyRole: (roles) => {
          const userRole = (get().user?.role || '').toLowerCase();
          if (!Array.isArray(roles)) return false;
          return roles.some(role => String(role).toLowerCase() === userRole);
        },

        hasPermission: (permission) => {
          return authManager.hasPermission(permission, get().user);
        },

        hasAnyPermission: (permissions) => {
          const userPermissions = get().user?.permissions || [];
          return Array.isArray(permissions) 
            ? permissions.some(p => userPermissions.includes(p))
            : false;
        },

        hasAllPermissions: (permissions) => {
          const userPermissions = get().user?.permissions || [];
          return Array.isArray(permissions) 
            ? permissions.every(p => userPermissions.includes(p))
            : false;
        },

        isAdmin: () => {
          return authManager.isAdmin(get().user);
        },

        isClient: () => {
          return authManager.isClient(get().user);
        },

        isVisitor: () => {
          return authManager.isVisitor(get().user);
        },

        // User status checks
        isEmailVerified: () => {
          return get().user?.email_verified === true;
        },

        isAccountActive: () => {
          return get().user?.status === 'active';
        },

        canAccessFeature: (feature) => {
          const user = get().user;
          if (!user) return false;

          // Check feature-specific permissions
          const featurePermissions = {
            'chat': ['chat.use'],
            'analytics': ['analytics.view'],
            'branding': ['branding.edit'],
            'documents': ['documents.upload', 'documents.manage'],
            'admin': ['admin.access'],
          };

          const requiredPermissions = featurePermissions[feature];
          if (requiredPermissions) {
            return get().hasAnyPermission(requiredPermissions);
          }

          return true;
        },

        // Initialize from stored auth data
        initialize: async () => {
          const storedToken = authManager.getToken();
          const storedUser = authManager.getUser();
          const storedRefreshToken = authManager.getRefreshToken();
          
          if (storedToken && authManager.isTokenValid(storedToken)) {
            // Fetch fresh profile data immediately to get latest avatar
            try {
              const profile = await apiClient.getProfile();
              // Use fresh profile data instead of stored user
              const freshUserData = {
                ...profile,
                avatar: profile.avatar_url || profile.avatar || storedUser?.avatar || '',
                avatar_url: profile.avatar_url || profile.avatar || storedUser?.avatar_url || '',
              };
              
              set({
                token: storedToken,
                refreshToken: storedRefreshToken,
                user: freshUserData,
                isAuthenticated: true,
              });
              
              // Update auth manager with fresh data
              authManager.setUser(freshUserData);
            } catch (error) {
              console.warn('Failed to fetch profile, using stored user:', error);
              // Fallback to stored user if profile fetch fails
              set({
                token: storedToken,
                refreshToken: storedRefreshToken,
                user: storedUser,
                isAuthenticated: true,
              });
              
              // Don't logout immediately - let the token validation handle it
              // Only logout if it's a 401 (unauthorized) error
              if (error.response?.status === 401) {
                console.warn('Token is invalid, logging out');
                get().logout();
                return;
              }
            }

            // Setup session management
            get().setupSessionTimeout();
            get().setupAutoRefresh();
          } else {
            // Clear invalid stored data
            authManager.endSession();
            get().clearSession();
          }
        },

        // Utility methods
        getTokenExpirationTime: () => {
          const { token } = get();
          if (!token) return null;

          try {
            const decoded = jwtDecode(token);
            return new Date(decoded.exp * 1000);
          } catch (error) {
            return null;
          }
        },

        getTimeUntilExpiration: () => {
          const expirationTime = get().getTokenExpirationTime();
          if (!expirationTime) return null;

          return expirationTime.getTime() - Date.now();
        },

        isTokenExpiringSoon: (thresholdMinutes = 5) => {
          const timeUntilExpiration = get().getTimeUntilExpiration();
          if (!timeUntilExpiration) return false;

          return timeUntilExpiration < (thresholdMinutes * 60 * 1000);
        },

        // Debug helpers (development only)
        ...(import.meta.env.DEV && {
          debug: () => {
            const state = get();
            return {
              isAuthenticated: state.isAuthenticated,
              user: state.user,
              tokenExpiration: state.getTokenExpirationTime(),
              timeUntilExpiration: state.getTimeUntilExpiration(),
              loginAttempts: state.loginAttempts,
              hasValidToken: !!state.token && authManager.isTokenValid(state.token),
            };
          },
        }),
      }),
      {
        name: 'auth-storage',
        partialize: (state) => ({ 
          token: state.token,
          refreshToken: state.refreshToken,
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
        onRehydrateStorage: () => (state) => {
          if (state) {
            // Initialize session management on rehydration
            setTimeout(() => {
              state.initialize();
            }, 0);
          }
        },
      }
    )
  )
);

// Subscribe to auth changes for side effects
useAuthStore.subscribe(
  (state) => state.isAuthenticated,
  (isAuthenticated, previousIsAuthenticated) => {
    if (isAuthenticated && !previousIsAuthenticated) {
      console.log('User authenticated');
      
      // Setup auto-refresh
      useAuthStore.getState().setupAutoRefresh();
      
      // Track login event
      if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
        // Analytics tracking would go here
        console.log('Login event tracked');
      }
    } else if (!isAuthenticated && previousIsAuthenticated) {
      console.log('User logged out');
      
      // Clear session management
      useAuthStore.getState().clearSession();
      
      // Track logout event
      if (import.meta.env.VITE_ENABLE_ANALYTICS === 'true') {
        // Analytics tracking would go here
        console.log('Logout event tracked');
      }
    }
  }
);

// Subscribe to user changes
useAuthStore.subscribe(
  (state) => state.user,
  (user) => {
    if (user) {
      // Update auth manager when user data changes
      authManager.setUser(user);
    }
  }
);

// Initialize auth store
export const initializeAuth = () => {
  useAuthStore.getState().initialize();
};

// Export specific selectors for performance
export const selectIsAuthenticated = (state) => state.isAuthenticated;
export const selectUser = (state) => state.user;
export const selectIsLoading = (state) => state.isLoading;
export const selectError = (state) => state.error;
export const selectUserRole = (state) => state.user?.role;
export const selectUserPermissions = (state) => state.user?.permissions || [];

// Export default
export default useAuthStore;
