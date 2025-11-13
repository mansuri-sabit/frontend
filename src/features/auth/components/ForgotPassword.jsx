// src/features/auth/components/ForgotPassword.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { useForm } from '../../../hooks/useForm';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Alert } from '../../../components/ui/Alert';
import { sanitizeEmail } from '../../../lib/utils';
import toast from '@/lib/toast';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { forgotPassword, isLoading, error, clearError } = useAuthStore();
  
  const emailInputRef = useRef(null);
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Email form
  const emailForm = useForm(
    { email: '' },
    {
      email: {
        required: true,
        validate: (value) => {
          const sanitized = sanitizeEmail(value);
          if (!sanitized) return 'Please enter a valid email address';
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            return 'Please enter a valid email address';
          }
          return null;
        },
      },
    }
  );

  // Auto-focus email input on mount
  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  // Clear errors when values change
  useEffect(() => {
    if (error) clearError();
  }, [emailForm.values.email, clearError, error]);

  // Handle send reset email
  const handleSendResetEmail = emailForm.handleSubmit(async (formData) => {
    clearError();
    
    const sanitizedEmail = sanitizeEmail(formData.email);
    if (!sanitizedEmail) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      const response = await forgotPassword(sanitizedEmail);
      
      setEmail(sanitizedEmail);
      setIsSubmitted(true);
      
      toast.success('If an account exists for this email, we\'ve sent instructions to reset the password.');
    } catch (err) {
      const errorStatus = err?.response?.status;
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to send reset email';
      
      // If it's 200 or success-like response, don't treat as error
      if (errorStatus === 200 || (errorStatus >= 200 && errorStatus < 300)) {
        setEmail(sanitizedEmail);
        setIsSubmitted(true);
        toast.success('If an account exists for this email, we\'ve sent instructions to reset the password.');
        return;
      }
      
      // Only show error for real failures (5xx, network errors, rate limiting)
      if (errorStatus && errorStatus >= 500) {
        toast.error(errorMessage || 'Failed to send reset email. Please try again.');
      } else if (errorStatus === 429) {
        toast.error(errorMessage || 'Too many requests. Please wait a moment and try again.');
      } else if (!errorStatus && !err?.response) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        // For 4xx errors (except 429), still show success for security (don't reveal email existence)
        setEmail(sanitizedEmail);
        setIsSubmitted(true);
        toast.success('If an account exists for this email, we\'ve sent instructions to reset the password.');
      }
    }
  });

  // Confirmation screen
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Check Your Email</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              If an account exists for <strong>{email}</strong>, we've sent instructions to reset the password.
            </p>
          </CardHeader>

          <CardContent>
            <Alert variant="info" title="Next Steps" className="mb-4">
              <ul className="text-sm space-y-2 mt-2">
                <li>• Check your email inbox for the reset link</li>
                <li>• Click the link in the email to reset your password</li>
                <li>• The link expires in 60 minutes</li>
                <li>• If you don't see the email, check your spam folder</li>
              </ul>
            </Alert>

            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => {
                  setIsSubmitted(false);
                  setEmail('');
                  emailForm.reset();
                }}
              >
                Send Another Email
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email entry screen
  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="shadow-lg">
        <CardHeader className="text-center pb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Forgot your password?</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Enter the email you sign in with. We'll email a link to reset your password.
          </p>
        </CardHeader>

        <CardContent>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSendResetEmail(e);
            }} 
            className="space-y-4" 
            noValidate
          >
            {error && (
              <Alert variant="error" title="Error" className="mt-2">
                <p className="text-sm font-medium">{error}</p>
              </Alert>
            )}

            <Input
              ref={emailInputRef}
              id="email"
              name="email"
              type="email"
              label="Email Address"
              placeholder="Enter your email address"
              value={emailForm.values.email}
              onChange={emailForm.handleChange}
              onBlur={emailForm.handleBlur}
              error={emailForm.errors.email}
              disabled={emailForm.isSubmitting || isLoading}
              required
              autoComplete="email"
              leftIcon={
                <svg
                  className="w-5 h-5 text-gray-400 dark:text-gray-500"
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
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              }
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={emailForm.isSubmitting || isLoading}
              disabled={!emailForm.isValid}
            >
              {emailForm.isSubmitting || isLoading ? 'Sending...' : 'Send reset link'}
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
    </div>
  );
};

export { ForgotPassword };
export default ForgotPassword;
