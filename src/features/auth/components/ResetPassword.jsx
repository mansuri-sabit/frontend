// src/features/auth/components/ResetPassword.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useForm } from '../../../hooks/useForm';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Alert } from '../../../components/ui/Alert';
import toast from '@/lib/toast';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { resetPassword, verifyResetToken, isLoading, error, clearError } = useAuthStore();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const passwordInputRef = useRef(null);
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const {
    values,
    errors,
    handleChange,
    handleBlur,
    handleSubmit,
    isSubmitting,
    isValid,
  } = useForm(
    { password: '', confirmPassword: '' },
    {
      password: {
        required: true,
        minLength: 8,
        maxLength: 128,
        validate: (value) => {
          if (value.length < 8) {
            return 'Password must be at least 8 characters long';
          }
          return null;
        },
      },
      confirmPassword: {
        required: true,
        validate: (value, allValues) => {
          if (value !== allValues.password) {
            return 'Passwords do not match';
          }
          return null;
        },
      },
    }
  );

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token || !email) {
        toast.error('Invalid or missing reset link. Please request a new password reset.');
        navigate('/forgot-password', { replace: true });
        return;
      }

      try {
        setIsValidating(true);
        const response = await verifyResetToken(email, token);
        
        if (response.valid) {
          setIsTokenValid(true);
        } else {
          toast.error('This link is no longer valid. Request a new password reset.');
          navigate('/forgot-password', { replace: true });
        }
      } catch (err) {
        const errorMessage = err?.response?.data?.message || err?.message || 'Invalid or expired token';
        toast.error('This link is no longer valid. Request a new password reset.');
        navigate('/forgot-password', { replace: true });
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token, email, navigate, verifyResetToken]);

  // Focus password input when token is validated
  useEffect(() => {
    if (isTokenValid && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [isTokenValid]);

  useEffect(() => {
    if (error) clearError();
  }, [values.password, values.confirmPassword, clearError, error]);

  const onSubmit = handleSubmit(async (formData) => {
    try {
      clearError();
      
      if (!token || !email) {
        toast.error('Invalid reset link. Please request a new password reset.');
        navigate('/forgot-password', { replace: true });
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      await resetPassword(email, token, formData.password);
      
      setIsSubmitted(true);
      toast.success('Your password has been changed. You can sign in now.');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
    } catch (err) {
      console.error('Reset password error:', err);
      const errorMessage = err?.message || err?.response?.data?.message || 'Failed to reset password. Please try again.';
      toast.error(errorMessage);
    }
  });

  // Loading state while validating token
  if (isValidating) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Validating Reset Link</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Please wait while we verify your reset link...
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success screen
  if (isSubmitted) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Password Changed</h1>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="success" title="Success">
              <p className="text-sm">
                Your password has been changed. You can sign in now.
              </p>
              <p className="text-sm mt-2">
                Redirecting to login page...
              </p>
            </Alert>
            
            <Button
              variant="primary"
              onClick={() => navigate('/login', { replace: true })}
              className="w-full"
            >
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token screen
  if (!isTokenValid) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invalid Reset Link</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              This link is no longer valid. Request a new password reset.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="primary"
              onClick={() => navigate('/forgot-password', { replace: true })}
              className="w-full"
            >
              Request New Reset Link
            </Button>
            
            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="text-center pb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reset Password</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Enter your new password below.
          </p>
          {email && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Resetting password for: <strong>{email}</strong>
            </p>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {error && (
              <Alert variant="error" title="Error" className="mt-2">
                <p className="text-sm font-medium">{error}</p>
                {error?.includes('expired') || error?.includes('invalid') ? (
                  <p className="text-sm mt-2">
                    This reset link may have expired. Please{' '}
                    <Link
                      to="/forgot-password"
                      className="text-primary-600 hover:text-primary-700 underline"
                    >
                      request a new one
                    </Link>
                    .
                  </p>
                ) : null}
              </Alert>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Password Requirements:</p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 list-disc list-inside space-y-0.5">
                <li>At least 8 characters long</li>
                <li>Use a combination of letters, numbers, and symbols for better security</li>
              </ul>
            </div>

            <Input
              ref={passwordInputRef}
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              label="New Password"
              placeholder="Enter your new password"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.password}
              disabled={isSubmitting || isLoading}
              required
              autoComplete="new-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              }
            />

            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              label="Confirm New Password"
              placeholder="Confirm your new password"
              value={values.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.confirmPassword}
              disabled={isSubmitting || isLoading}
              required
              autoComplete="new-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || isLoading}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              }
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={isSubmitting || isLoading}
              disabled={!isValid}
            >
              {isSubmitting || isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
              >
                Back to Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {error && `Error: ${error}`}
        {isSubmitting && 'Resetting password, please wait'}
      </div>
    </div>
  );
};

export { ResetPassword };
export default ResetPassword;

