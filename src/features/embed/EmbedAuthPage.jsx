// src/features/embed/EmbedAuthPage.jsx (Updated Alert usage)
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { authManager } from '../../lib/auth';
import { apiClient } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert'; // ✅ Import your existing Alert

const EmbedAuthPage = ({ onAuthSuccess }) => {
  const { clientId } = useParams();
  const [searchParams] = useSearchParams();
  
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [branding, setBranding] = useState(null);
  
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });
  
  const [registerForm, setRegisterForm] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'client'
  });

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const brandingData = await apiClient.getPublicBranding(clientId);
        setBranding(brandingData);
        applyBranding(brandingData);
      } catch (err) {
        console.error('Failed to load branding:', err);
      }
    };

    if (clientId) {
      loadBranding();
    }
  }, [clientId]);

  const applyBranding = (brandingData) => {
    const root = document.documentElement;
    const color = brandingData?.theme_color || '#1F2937';
    
    root.style.setProperty('--widget-primary-color', color);
    document.body.style.backgroundColor = 'transparent';
    
    if (brandingData?.custom_css) {
      const styleEl = document.createElement('style');
      styleEl.textContent = brandingData.custom_css;
      document.head.appendChild(styleEl);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await authManager.login(loginForm);
      
      if (result.success) {
        console.log('✅ Login successful in embed');
        onAuthSuccess?.(result.user, result.token);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

// src/features/embed/EmbedAuthPage.jsx (Update register handler)
const handleRegister = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  // Client-side validation
  if (registerForm.password !== registerForm.confirmPassword) {
    setError('Passwords do not match');
    setLoading(false);
    return;
  }

  if (registerForm.password.length < 8) {
    setError('Password must be at least 8 characters');
    setLoading(false);
    return;
  }

  try {
    const registrationData = {
      ...registerForm,
      client_id: clientId || ''
    };
    delete registrationData.confirmPassword;

    console.log('🔄 Attempting registration:', registrationData);

    const result = await authManager.register(registrationData);
    
    console.log('📝 Registration result:', result);

    if (result.success) {
      console.log('✅ Registration successful in embed');
      onAuthSuccess?.(result.user, result.token);
    } else {
      // ✅ SHOW SPECIFIC ERROR FROM SERVER
      console.log('❌ Registration failed:', result.error, result.details);
      setError(result.error || 'Registration failed. Please try again.');
    }
  } catch (err) {
    // ✅ CAPTURE UNEXPECTED ERRORS
    console.error('💥 Unexpected registration error:', err);
    setError(`Registration failed: ${err.message || 'Unknown error'}`);
  } finally {
    setLoading(false);
  }
};


  const handleLoginChange = (e) => {
    setLoginForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleRegisterChange = (e) => {
    setRegisterForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 overflow-y-auto"
      style={{ 
        background: branding?.theme_color 
          ? `linear-gradient(135deg, ${branding.theme_color}20 0%, ${branding.theme_color}10 100%)`
          : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)'
      }}
    >
      <div className="w-full max-w-md my-8">
        <Card className="w-full">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center mb-4">
              {branding?.logo_url && (
                <img 
                  src={branding.logo_url} 
                  alt="Logo" 
                  className="w-12 h-12 rounded-full mr-3"
                />
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h1>
                <p className="text-gray-600 text-sm mt-1">
                  {mode === 'login' 
                    ? 'Sign in to start chatting' 
                    : 'Register to access chat support'
                  }
                </p>
              </div>
            </div>
            
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => switchMode('login')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  mode === 'login'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => switchMode('register')}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
                  mode === 'register'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Register
              </button>
            </div>
          </CardHeader>
          
          <CardContent className="max-h-[60vh] overflow-y-auto px-6 pb-6">
            <div className="space-y-4">
              {/* ✅ SIMPLIFIED ERROR DISPLAY */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {mode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <Input
                    label="Username"
                    name="username"
                    type="text"
                    value={loginForm.username}
                    onChange={handleLoginChange}
                    required
                    disabled={loading}
                    placeholder="Enter your username"
                    className="w-full"
                  />

                  <Input
                    label="Password"
                    name="password"
                    type="password"
                    value={loginForm.password}
                    onChange={handleLoginChange}
                    required
                    disabled={loading}
                    placeholder="Enter your password"
                    className="w-full"
                  />

                  <Button
                    type="submit"
                    className="w-full mt-6"
                    disabled={loading}
                    style={{ backgroundColor: branding?.theme_color }}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <Input
                    label="Username"
                    name="username"
                    type="text"
                    value={registerForm.username}
                    onChange={handleRegisterChange}
                    required
                    disabled={loading}
                    placeholder="Choose a username"
                    className="w-full"
                  />

                  <Input
                    label="Full Name"
                    name="name"
                    type="text"
                    value={registerForm.name}
                    onChange={handleRegisterChange}
                    required
                    disabled={loading}
                    placeholder="Enter your full name"
                    className="w-full"
                  />

                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={registerForm.email}
                    onChange={handleRegisterChange}
                    disabled={loading}
                    placeholder="Enter your email"
                    className="w-full"
                  />

                  <Input
                    label="Password"
                    name="password"
                    type="password"
                    value={registerForm.password}
                    onChange={handleRegisterChange}
                    required
                    disabled={loading}
                    placeholder="Create a password"
                    className="w-full"
                  />

                  <Input
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    value={registerForm.confirmPassword}
                    onChange={handleRegisterChange}
                    required
                    disabled={loading}
                    placeholder="Confirm your password"
                    className="w-full"
                  />

                  <Button
                    type="submit"
                    className="w-full mt-6"
                    disabled={loading}
                    style={{ backgroundColor: branding?.theme_color }}
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </form>
              )}

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: branding?.theme_color || '#3B82F6' }}
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Chat Support</p>
                    <p className="text-xs text-gray-500">We're here to help</p>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-lg shadow-sm">
                  <p className="text-sm text-gray-700">
                    {branding?.welcome_message || "Hello! I'm here to assist you with your inquiries."}
                  </p>
                </div>
              </div>

              <div className="text-center text-xs text-gray-500 mt-4">
                Powered by <span className="text-blue-600 font-medium">SaaS Chatbot</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <style jsx>{`
        .overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        .overflow-y-auto {
          scrollbar-width: thin;
          scrollbar-color: #c1c1c1 #f1f1f1;
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
};

export default EmbedAuthPage;
