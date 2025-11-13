// src/features/auth/guards/RouteGuard.jsx
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { Spinner } from '../../../components/ui/Spinner';
import { Alert } from '../../../components/ui/Alert';

// Loading component for route transitions
const RouteLoader = ({ message = 'Loading...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <Spinner size="lg" className="mx-auto mb-4" />
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  </div>
);

// Unauthorized access component
const UnauthorizedAccess = ({ requiredRole, userRole, redirectTo = '/login' }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="max-w-md w-full">
      <Alert
        variant="error"
        title="Access Denied"
        className="mb-4"
      >
        {requiredRole 
          ? `You need ${requiredRole} privileges to access this page. Current role: ${userRole || 'none'}`
          : 'You do not have permission to access this page.'
        }
      </Alert>
      <div className="text-center">
        <button
          onClick={() => window.history.back()}
          className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Go Back
        </button>
        <Navigate to={redirectTo} replace />
      </div>
    </div>
  </div>
);

// Base RouteGuard component
export const RouteGuard = ({ 
  children, 
  requiredRole = null, 
  allowedRoles = [], 
  requireAuth = true,
  fallback = null,
  onUnauthorized = null,
  redirectTo = '/login'
}) => {
  const location = useLocation();
  const { 
    user, 
    isAuthenticated, 
    isLoading, 
    validateToken,
    hasRole,
    hasAnyRole 
  } = useAuthStore();

  // Validate token on mount and route changes
  // BUT: Skip validation for public routes (forgot-password, login, etc.)
  useEffect(() => {
    // Skip validation for public auth routes
    const publicRoutes = ['/forgot-password', '/login', '/reset-password', '/auth/forgot-password', '/auth/login', '/auth/reset-password'];
    const isPublicRoute = publicRoutes.some(route => location.pathname === route || location.pathname.startsWith(route));
    
    if (requireAuth && isAuthenticated && !isPublicRoute) {
      const isValid = validateToken();
      if (!isValid) {
        console.warn('Invalid token detected, redirecting to login');
      }
    }
  }, [location.pathname, validateToken, isAuthenticated, requireAuth]);

  // Show loading state
  if (isLoading) {
    return fallback || <RouteLoader message="Authenticating..." />;
  }

  // Wait for user to be loaded if authentication is required
  if (requireAuth && isAuthenticated && !user) {
    return fallback || <RouteLoader message="Loading user..." />;
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If no auth required and user is not authenticated, allow access
  if (!requireAuth && !isAuthenticated) {
    return children;
  }

  // Check role permissions if authenticated
  if (isAuthenticated && user) {
    let hasPermission = true;

    // Check specific required role
    if (requiredRole) {
      // Normalize role comparison - handle case-insensitive matching
      const userRole = (user.role || '').toLowerCase();
      const requiredRoleLower = String(requiredRole).toLowerCase();
      hasPermission = userRole === requiredRoleLower;
      
      // Also try using the hasRole function for additional validation
      if (!hasPermission) {
        hasPermission = hasRole(requiredRole);
      }
      
      // Debug logging for role checks
      if (!hasPermission) {
        console.warn(`[RouteGuard] Role check failed: user role="${user.role}" (normalized: "${userRole}"), required="${requiredRole}" (normalized: "${requiredRoleLower}")`);
        console.warn(`[RouteGuard] User object:`, user);
      }
    }

    // Check allowed roles list
    if (allowedRoles.length > 0) {
      hasPermission = hasPermission && hasAnyRole(allowedRoles);
      if (!hasPermission) {
        console.warn(`[RouteGuard] Role check failed: user role="${user.role}", allowed roles=${JSON.stringify(allowedRoles)}`);
      }
    }

    if (!hasPermission) {
      // Call custom unauthorized handler if provided
      if (onUnauthorized) {
        onUnauthorized(user.role, requiredRole || allowedRoles);
      }

      return fallback || (
        <UnauthorizedAccess 
          requiredRole={requiredRole || allowedRoles.join(' or ')}
          userRole={user.role}
          redirectTo={redirectTo}
        />
      );
    }
  }

  return children;
};

// Admin-only route guard
export const AdminGuard = ({ 
  children, 
  fallback = null,
  redirectTo = '/unauthorized'
}) => {
  return (
    <RouteGuard 
      requiredRole="admin"
      fallback={fallback}
      redirectTo={redirectTo}
    >
      {children}
    </RouteGuard>
  );
};

// Client route guard (allows both admin and client roles)
export const ClientGuard = ({ 
  children, 
  fallback = null,
  redirectTo = '/unauthorized'
}) => {
  return (
    <RouteGuard 
      allowedRoles={['admin', 'client']}
      fallback={fallback}
      redirectTo={redirectTo}
    >
      {children}
    </RouteGuard>
  );
};

// Public route guard (no authentication required)
export const PublicGuard = ({ children, redirectIfAuthenticated = false, redirectTo = '/dashboard' }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <RouteLoader message="Loading..." />;
  }

  if (redirectIfAuthenticated && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

// Permission-based route guard
export const PermissionGuard = ({ 
  children, 
  permissions = [], 
  requireAll = false,
  fallback = null,
  redirectTo = '/unauthorized'
}) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return fallback || <RouteLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (permissions.length > 0) {
    const userPermissions = user?.permissions || [];
    
    const hasPermission = requireAll
      ? permissions.every(permission => userPermissions.includes(permission))
      : permissions.some(permission => userPermissions.includes(permission));

    if (!hasPermission) {
      return fallback || (
        <UnauthorizedAccess 
          requiredRole={`permissions: ${permissions.join(requireAll ? ' and ' : ' or ')}`}
          userRole={`permissions: ${userPermissions.join(', ') || 'none'}`}
          redirectTo={redirectTo}
        />
      );
    }
  }

  return children;
};

// Client-specific route guard (checks client_id)
export const ClientSpecificGuard = ({ 
  children, 
  clientId,
  allowAdmin = true,
  fallback = null,
  redirectTo = '/unauthorized'
}) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return fallback || <RouteLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admin can access any client's data
  if (allowAdmin && user?.role === 'admin') {
    return children;
  }

  // Check if user belongs to the specific client
  if (user?.client_id !== clientId) {
    return fallback || (
      <UnauthorizedAccess 
        requiredRole={`access to client ${clientId}`}
        userRole={`client ${user?.client_id || 'none'}`}
        redirectTo={redirectTo}
      />
    );
  }

  return children;
};

// Feature flag guard
export const FeatureGuard = ({ 
  children, 
  feature,
  fallback = null 
}) => {
  // This would integrate with your feature flag system
  const isFeatureEnabled = true; // Replace with actual feature flag check
  
  if (!isFeatureEnabled) {
    return fallback || (
      <div className="p-4 text-center">
        <Alert variant="info" title="Feature Not Available">
          This feature is currently not available.
        </Alert>
      </div>
    );
  }

  return children;
};

// Multi-condition route guard
export const ConditionalGuard = ({ 
  children, 
  conditions = [],
  operator = 'AND', // 'AND' or 'OR'
  fallback = null,
  redirectTo = '/unauthorized'
}) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return fallback || <RouteLoader />;
  }

  const evaluateCondition = (condition) => {
    switch (condition.type) {
      case 'authenticated':
        return isAuthenticated === condition.value;
      case 'role':
        return user?.role === condition.value;
      case 'permission':
        return user?.permissions?.includes(condition.value);
      case 'client':
        return user?.client_id === condition.value;
      case 'custom':
        return condition.check(user, isAuthenticated);
      default:
        return true;
    }
  };

  const results = conditions.map(evaluateCondition);
  const hasAccess = operator === 'AND' 
    ? results.every(result => result)
    : results.some(result => result);

  if (!hasAccess) {
    return fallback || <Navigate to={redirectTo} replace />;
  }

  return children;
};

// HOC version of RouteGuard
export const withRouteGuard = (WrappedComponent, guardOptions = {}) => {
  const GuardedComponent = (props) => (
    <RouteGuard {...guardOptions}>
      <WrappedComponent {...props} />
    </RouteGuard>
  );

  GuardedComponent.displayName = `withRouteGuard(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return GuardedComponent;
};

// Utility hook for checking permissions in components
export const usePermissions = () => {
  const { user } = useAuthStore();
  
  return {
    hasRole: (role) => user?.role === role,
    hasAnyRole: (roles) => roles.includes(user?.role),
    hasPermission: (permission) => user?.permissions?.includes(permission),
    hasAnyPermission: (permissions) => permissions.some(p => user?.permissions?.includes(p)),
    isAdmin: () => user?.role === 'admin',
    isClient: () => user?.role === 'client',
    isVisitor: () => user?.role === 'visitor',
    clientId: user?.client_id,
    permissions: user?.permissions || [],
  };
};

// Route metadata guard (for breadcrumbs, titles, etc.)
export const RouteMetaGuard = ({ 
  children, 
  title,
  breadcrumbs = [],
  requireAuth = true,
  ...guardProps 
}) => {
  useEffect(() => {
    // Set page title
    if (title) {
      document.title = `${title} | ${import.meta.env.VITE_APP_NAME || 'SaaS Chatbot'}`;
    }

    // Set breadcrumbs (you might want to use a breadcrumb store)
    if (breadcrumbs.length > 0) {
      // Store breadcrumbs in global state or context
      window.__BREADCRUMBS__ = breadcrumbs;
    }

    return () => {
      // Cleanup if needed
      document.title = import.meta.env.VITE_APP_NAME || 'SaaS Chatbot';
    };
  }, [title, breadcrumbs]);

  if (!requireAuth) {
    return children;
  }

  return (
    <RouteGuard {...guardProps}>
      {children}
    </RouteGuard>
  );
};

// Default export
export default RouteGuard;
