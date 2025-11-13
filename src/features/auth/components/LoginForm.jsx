// src/features/auth/components/LoginForm.jsx - Refactored with Shadcn/UI and Framer Motion
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User as UserIcon, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useForm } from '../../../hooks/useForm';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Alert } from '../../../components/ui/Alert';
import { Checkbox } from '../../../components/ui/Checkbox';
import { sanitizeUsername } from '../../../lib/utils';
import { storageManager } from '../../../lib/storage';
import { cn } from '../../../lib/utils';
import toast from '../../../lib/toast';

const LoginForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError, loginAttempts } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const usernameInputRef = useRef(null);
  const errorAlertRef = useRef(null);
  const hasLoadedSavedPreferences = useRef(false);

  const from = location.state?.from?.pathname;

  const {
    values, errors, handleChange, handleBlur, handleSubmit, isSubmitting, isValid, setFieldValue,
  } = useForm(
    { username: '', password: '' },
    {
      username: {
        required: true, minLength: 3, maxLength: 50, pattern: /^[a-zA-Z0-9_]+$/,
        patternMessage: 'Username can only contain letters, numbers, and underscores',
      },
      password: { required: true, minLength: 8, maxLength: 128 },
    }
  );

  useEffect(() => {
    if (usernameInputRef.current) {
      usernameInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (error && errorAlertRef.current) {
      errorAlertRef.current.focus();
    }
  }, [error]);

  useEffect(() => {
    if (error) clearError();
  }, [values.username, values.password, clearError, error]);

  const getDefaultDashboard = (role) => {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'client') return '/client/dashboard';
    return '/';
  };

  const pickSafeRedirect = (user, requestedPath) => {
    const safeAdmin = getDefaultDashboard(user?.role);

    if (!requestedPath) return safeAdmin;
    if (requestedPath === '/login' || requestedPath === '/unauthorized') return safeAdmin;

    if (user?.role === 'admin' && requestedPath.startsWith('/client')) {
      return safeAdmin;
    }
    if (user?.role === 'client' && requestedPath.startsWith('/admin')) {
      return getDefaultDashboard('client');
    }

    return requestedPath;
  };

  const onSubmit = handleSubmit(async (formData) => {
    try {
      clearError();
      
      if (import.meta.env.DEV) {
        console.log('🔐 Attempting login with username:', formData.username);
      }

      const sanitizedUsername = sanitizeUsername(formData.username?.trim());
      if (!sanitizedUsername || sanitizedUsername.length < 3) {
        toast.error('Please enter a valid username');
        return;
      }

      const credentials = {
        username: sanitizedUsername,
        password: formData.password,
      };

      if (!credentials.username || !credentials.password) {
        return;
      }

      const result = await login(credentials);

      if (!result || !result.user) {
        return;
      }

      await storageManager.setItem('saved_username', credentials.username, {
        storage: 'localStorage',
        encrypted: false,
      });

      if (rememberMe) {
        await storageManager.setItem('rememberMe', true, {
          storage: 'localStorage',
          encrypted: false,
        });
      } else {
        await storageManager.removeItem('rememberMe', { storage: 'localStorage' });
      }

      await storageManager.removeItem('saved_password', { storage: 'localStorage' });

      const target = pickSafeRedirect(result.user, from) || getDefaultDashboard(result.user?.role);
      navigate(target, { replace: true });
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('❌ Login error:', err);
      }
    }
  });

  useEffect(() => {
    if (hasLoadedSavedPreferences.current) {
      return;
    }

    const loadSavedPreferences = async () => {
      try {
        const savedUsername = await storageManager.getItem('saved_username', {
          storage: 'localStorage',
        });
        
        if (savedUsername && values.username === '') {
          setFieldValue('username', savedUsername);
        }

        const savedRememberMe = await storageManager.getItem('rememberMe', {
          storage: 'localStorage',
        });
        
        setRememberMe(savedRememberMe === true || savedRememberMe === 'true');

        const oldPassword = await storageManager.getItem('saved_password', {
          storage: 'localStorage',
        });
        if (oldPassword) {
          await storageManager.removeItem('saved_password', { storage: 'localStorage' });
          if (import.meta.env.DEV) {
            console.warn('Removed old password storage (security cleanup)');
          }
        }

        hasLoadedSavedPreferences.current = true;
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Error loading saved preferences:', error);
        }
        hasLoadedSavedPreferences.current = true;
      }
    };

    loadSavedPreferences();
  }, []);

  const isAccountLocked = loginAttempts >= 5;
  const remainingAttempts = Math.max(0, 5 - loginAttempts);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="shadow-lg">
        <CardHeader className="text-center space-y-2 pb-6">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </motion.div>
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <AnimatePresence>
              {loginAttempts > 0 && loginAttempts < 5 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Alert 
                    variant="warning"
                    title="Login Attempts"
                  >
                    {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining before account lockout.
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={usernameInputRef}
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Enter your username"
                    value={values.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isSubmitting || isLoading || isAccountLocked}
                    required
                    autoComplete="username"
                    className={cn(
                      'pl-10',
                      errors.username && 'border-destructive focus-visible:ring-destructive'
                    )}
                    aria-invalid={errors.username ? 'true' : 'false'}
                    aria-describedby={errors.username ? 'username-error' : undefined}
                  />
                </div>
                {errors.username && (
                  <p id="username-error" className="text-sm text-destructive">
                    {errors.username}
                  </p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isSubmitting || isLoading || isAccountLocked}
                    required
                    autoComplete="current-password"
                    className={cn(
                      'pr-10',
                      errors.password && 'border-destructive focus-visible:ring-destructive'
                    )}
                    aria-invalid={errors.password ? 'true' : 'false'}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting || isLoading || isAccountLocked}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-sm text-destructive">
                    {errors.password}
                  </p>
                )}
              </div>
            </motion.div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <Alert
                    ref={errorAlertRef}
                    variant="error"
                    title="Login Failed"
                    tabIndex={-1}
                  >
                    <p className="font-medium">{error}</p>
                    {isAccountLocked && (
                      <p className="mt-2">
                        Your account has been temporarily locked due to multiple failed attempts. Please try again in 15 minutes.
                      </p>
                    )}
                    {!isAccountLocked && (
                      <p className="mt-2 opacity-90">
                        Please check your username and password. Make sure caps lock is off.
                      </p>
                    )}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-between"
            >
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                label="Remember me"
                description="Keeps you signed in for 30 days"
                disabled={isSubmitting || isLoading}
              />
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:text-primary/80 underline-offset-4 hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                type="submit"
                className="w-full"
                disabled={!isValid || isAccountLocked || isSubmitting || isLoading}
              >
                {(isSubmitting || isLoading) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </motion.div>
          </form>
        </CardContent>
      </Card>

      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {error && `Login error: ${error}`}
        {isSubmitting && 'Signing in, please wait'}
        {isAccountLocked && 'Account temporarily locked due to failed login attempts'}
      </div>
    </motion.div>
  );
};

export { LoginForm };
export default LoginForm;
