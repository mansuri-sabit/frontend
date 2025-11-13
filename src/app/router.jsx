// src/app/router.jsx
import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import { RouteGuard, AdminGuard, ClientGuard } from '../features/auth/guards/RouteGuard';

// Layouts
import { AuthLayout } from '../components/layout/AuthLayout';
import { AppLayout } from '../components/layout/AppLayout';
import { EmbedLayout } from '../components/layout/EmbedLayout';

// Loading Component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Lazy load components for code splitting
const LoginForm = lazy(() => import('../features/auth/components/LoginForm').then(module => ({ default: module.LoginForm })));
const ForgotPassword = lazy(() => import('../features/auth/components/ForgotPassword').then(module => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import('../features/auth/components/ResetPassword').then(module => ({ default: module.ResetPassword })));

// Admin Pages
const AdminDashboard = lazy(() => import('../features/admin/pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const CreateClient = lazy(() => import('../features/admin/pages/CreateClient').then(module => ({ default: module.CreateClient })));
const AdminUsageAnalytics = lazy(() => import('../features/admin/components/UsageAnalytics').then(module => ({ default: module.UsageAnalytics })));
const AvatarManagement = lazy(() => import('../features/admin/pages/AvatarManagement').then(module => ({ default: module.default })));
const ClientAccess = lazy(() => import('../features/admin/pages/ClientAccess').then(module => ({ default: module.ClientAccess })));

// Client Pages
const Dashboard = lazy(() => import('../features/client/pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Branding = lazy(() => import('../features/client/pages/Branding').then(module => ({ default: module.Branding })));
const Documents = lazy(() => import('../features/client/pages/Documents').then(module => ({ default: module.Documents })));
const Chat = lazy(() => import('../features/chat/pages/Chat').then(module => ({ default: module.Chat })));
const TokenUsage = lazy(() => import('../features/client/components/TokenUsage').then(module => ({ default: module.TokenUsage })));
const EmailTemplates = lazy(() => import('../features/client/pages/EmailTemplates').then(module => ({ default: module.default })));

// Embed Widget
const EmbedWidget = lazy(() => import('../features/embed/EmbedWidget').then(module => ({ default: module.EmbedWidget })));

// Error Pages
const NotFound = lazy(() => import('../components/pages/NotFound').then(module => ({ default: module.NotFound })));
const Unauthorized = lazy(() => import('../components/pages/Unauthorized').then(module => ({ default: module.Unauthorized })));
const ServerError = lazy(() => import('../components/pages/ServerError').then(module => ({ default: module.ServerError })));

// Layout Components with Suspense
const SuspenseLayout = ({ children }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);

// Route Components
const AuthRoutes = () => (
  <AuthLayout>
    <SuspenseLayout>
      <Outlet />
    </SuspenseLayout>
  </AuthLayout>
);

const ProtectedAppRoutes = () => (
  <RouteGuard>
    <AppLayout>
      <SuspenseLayout>
        <Outlet />
      </SuspenseLayout>
    </AppLayout>
  </RouteGuard>
);

const AdminRoutes = () => (
  <AdminGuard>
    <AppLayout>
      <SuspenseLayout>
        <Outlet />
      </SuspenseLayout>
    </AppLayout>
  </AdminGuard>
);

const ClientRoutes = () => (
  <ClientGuard>
    <AppLayout>
      <SuspenseLayout>
        <Outlet />
      </SuspenseLayout>
    </AppLayout>
  </ClientGuard>
);

const EmbedRoutes = () => (
  <EmbedLayout>
    <SuspenseLayout>
      <Outlet />
    </SuspenseLayout>
  </EmbedLayout>
);

// Error Boundary for Routes
class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Route Error:', error, errorInfo);
    // Log to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <AuthLayout>
          <ServerError />
        </AuthLayout>
      );
    }

    return this.props.children;
  }
}

// Router configuration
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
    errorElement: (
      <RouteErrorBoundary>
        <AuthLayout>
          <ServerError />
        </AuthLayout>
      </RouteErrorBoundary>
    ),
  },
  
  // Auth Routes
  {
    path: '/auth',
    element: <AuthRoutes />,
    children: [
      {
        path: 'login',
        element: <LoginForm />,
      },
      {
        path: 'forgot-password',
        element: <ForgotPassword />,
      },
      {
        path: 'reset-password',
        element: <ResetPassword />,
      },
    ],
  },
  
  // Direct auth routes for backward compatibility
  {
    path: '/login',
    element: (
      <AuthLayout>
        <SuspenseLayout>
          <LoginForm />
        </SuspenseLayout>
      </AuthLayout>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <AuthLayout>
        <SuspenseLayout>
          <ForgotPassword />
        </SuspenseLayout>
      </AuthLayout>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <AuthLayout>
        <SuspenseLayout>
          <ResetPassword />
        </SuspenseLayout>
      </AuthLayout>
    ),
  },

  // Admin Routes
  {
    path: '/admin',
    element: <AdminRoutes />,
    children: [
      {
        index: true,
        element: <AdminDashboard />,
      },
      {
        path: 'dashboard',
        element: <AdminDashboard />,
      },
      {
        path: 'clients',
        children: [
          {
            path: 'new',
            element: <CreateClient />,
          },
        ],
      },
      {
        path: 'avatars',
        element: <AvatarManagement />,
      },
      {
        path: 'usage',
        element: <AdminUsageAnalytics />,
      },
      {
        path: 'analytics',
        element: <AdminUsageAnalytics />,
      },
      {
        path: 'client-access',
        element: <ClientAccess />,
      },
    ],
  },

  // Client Routes
  {
    path: '/dashboard',
    element: <Navigate to="/login" replace />,
  },
  
  {
    path: '/branding',
    element: (
      <ClientGuard>
        <AppLayout>
          <SuspenseLayout>
            <Branding />
          </SuspenseLayout>
        </AppLayout>
      </ClientGuard>
    ),
  },
  
  {
    path: '/documents',
    element: (
      <ClientGuard>
        <AppLayout>
          <SuspenseLayout>
            <Documents />
          </SuspenseLayout>
        </AppLayout>
      </ClientGuard>
    ),
  },
  
  {
    path: '/chat',
    element: (
      <ClientGuard>
        <AppLayout>
          <SuspenseLayout>
            <Chat />
          </SuspenseLayout>
        </AppLayout>
      </ClientGuard>
    ),
  },
  
  {
    path: '/tokens',
    element: (
      <ClientGuard>
        <AppLayout>
          <SuspenseLayout>
            <TokenUsage />
          </SuspenseLayout>
        </AppLayout>
      </ClientGuard>
    ),
  },
  
  {
    path: '/email-templates',
    element: (
      <ClientGuard>
        <AppLayout>
          <SuspenseLayout>
            <EmailTemplates />
          </SuspenseLayout>
        </AppLayout>
      </ClientGuard>
    ),
  },
  
  {
    path: '/analytics',
    element: (
      <ClientGuard>
        <AppLayout>
          <SuspenseLayout>
            <AdminUsageAnalytics />
          </SuspenseLayout>
        </AppLayout>
      </ClientGuard>
    ),
  },

  // Embed Widget Routes
  {
    path: '/embed',
    element: <EmbedRoutes />,
    children: [
      {
        path: ':clientId',
        element: <EmbedWidget />,
      },
    ],
  },

  // Error Routes
  {
    path: '/unauthorized',
    element: (
      <AuthLayout>
        <SuspenseLayout>
          <Unauthorized />
        </SuspenseLayout>
      </AuthLayout>
    ),
  },
  
  {
    path: '/error',
    element: (
      <AuthLayout>
        <SuspenseLayout>
          <ServerError />
        </SuspenseLayout>
      </AuthLayout>
    ),
  },

  // 404 Catch All
  {
    path: '*',
    element: (
      <AuthLayout>
        <SuspenseLayout>
          <NotFound />
        </SuspenseLayout>
      </AuthLayout>
    ),
  },
]);

// Router Provider Component
export const AppRouter = () => (
  <RouterProvider 
    router={router} 
    fallbackElement={<PageLoader />}
  />
);

// Export route utilities
export const routeUtils = {
  // Get current route info
  getCurrentRoute: () => {
    return window.location.pathname;
  },
  
  // Check if current route matches pattern
  isCurrentRoute: (pattern) => {
    const current = window.location.pathname;
    if (typeof pattern === 'string') {
      return current === pattern || current.startsWith(pattern);
    }
    if (pattern instanceof RegExp) {
      return pattern.test(current);
    }
    return false;
  },
  
  // Navigate programmatically
  navigateTo: (path, options = {}) => {
    if (options.replace) {
      window.history.replaceState(null, '', path);
    } else {
      window.history.pushState(null, '', path);
    }
    window.dispatchEvent(new PopStateEvent('popstate'));
  },
  
  // Get route parameters
  getRouteParams: () => {
    const urlParams = new URLSearchParams(window.location.search);
    const params = {};
    for (const [key, value] of urlParams) {
      params[key] = value;
    }
    return params;
  },
  
  // Build URL with parameters
  buildUrl: (path, params = {}) => {
    const url = new URL(path, window.location.origin);
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });
    return url.toString();
  },
};

export default router;
