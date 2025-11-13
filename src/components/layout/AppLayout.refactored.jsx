// src/components/layout/AppLayout.jsx - Refactored with Shadcn/UI, Framer Motion, and full responsiveness
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  BarChart3, 
  Lock, 
  Palette, 
  FileText, 
  Mail, 
  MessageSquare, 
  Zap, 
  History,
  Menu,
  X,
  ChevronLeft,
  User,
  Settings,
  LogOut,
  Bell
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store';
import { apiClient } from '../../lib/api';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/button';
import { ThemeToggle } from '../ui/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { cn } from '../../lib/utils';

export const AppLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [clientPermissions, setClientPermissions] = useState([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Load client permissions when user is a client
  useEffect(() => {
    const loadClientPermissions = async () => {
      if (user?.role === 'client') {
        const clientId = user?.client_id || user?.id || user?._id;
        if (import.meta.env.DEV) {
          console.log('Loading permissions for client:', clientId, 'User:', user);
        }
        if (clientId) {
          try {
            const response = await apiClient.getClientSidePermissions();
            const permissions = response?.permissions || [];
            if (import.meta.env.DEV) {
              console.log('Permissions response:', response);
              console.log('Setting permissions:', permissions);
            }
            setClientPermissions(permissions);
          } catch (error) {
            console.error('Failed to load client permissions:', error);
            setClientPermissions([]);
          } finally {
            setPermissionsLoaded(true);
          }
        } else {
          console.warn('No client ID found for client user');
          setClientPermissions([]);
          setPermissionsLoaded(true);
        }
      } else {
        setPermissionsLoaded(true);
      }
    };

    if (user) {
      loadClientPermissions();
    }
  }, [user?.role, user?.client_id, user?.id, user?._id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Role-aware dashboard link
  const dashHref = user?.role === 'admin' ? '/admin/dashboard' : '/client/dashboard';

  // Build sidebar items with lucide-react icons
  const getNavigationItems = () => {
    const baseItems = [
      {
        name: 'Dashboard',
        href: dashHref,
        icon: LayoutDashboard,
        exact: true,
      },
    ];

    if (user?.role === 'admin') {
      return [
        ...baseItems,
        {
          name: 'Clients',
          href: '/admin',
          exact: true,
          icon: Users,
        },
        {
          name: 'Create Client',
          href: '/admin/clients/new',
          icon: UserPlus,
        },
        {
          name: 'Usage Analytics',
          href: '/admin/usage',
          icon: BarChart3,
        },
        {
          name: 'Client Access',
          href: '/admin/client-access',
          icon: Lock,
        },
      ];
    }

    if (user?.role === 'client') {
      const allClientItems = [
        { name: 'Branding', href: '/client/branding', permissionKey: 'branding', icon: Palette },
        { name: 'Documents', href: '/client/documents', permissionKey: 'documents', icon: FileText },
        { name: 'Email Template', href: '/client/email-templates', permissionKey: 'email-templates', icon: Mail },
        { name: 'Chat', href: '/client/chat', permissionKey: 'chat', icon: MessageSquare },
        { name: 'Token Usage', href: '/client/tokens', permissionKey: 'tokens', icon: Zap },
        { name: 'Analytics', href: '/client/analytics', permissionKey: 'analytics', icon: BarChart3 },
        { name: 'Chat History', href: '/client/chat-history', permissionKey: 'chat-history', icon: History },
      ];

      if (!permissionsLoaded) {
        if (import.meta.env.DEV) {
          console.log('Permissions not loaded yet, showing only dashboard');
        }
        return baseItems;
      }

      if (clientPermissions.length === 0) {
        if (import.meta.env.DEV) {
          console.log('No permissions found, showing only dashboard');
        }
        return baseItems;
      }

      const filteredItems = allClientItems.filter((item) => {
        const hasPermission = clientPermissions.includes(item.permissionKey);
        if (import.meta.env.DEV) {
          console.log(`Item ${item.name} (${item.permissionKey}): ${hasPermission ? 'SHOW' : 'HIDE'}`);
        }
        return hasPermission;
      });

      if (import.meta.env.DEV) {
        console.log('Filtered items:', filteredItems.map(i => i.name));
      }
      return [...baseItems, ...filteredItems];
    }

    return baseItems;
  };

  const navigationItems = getNavigationItems();

  // Route matching
  const isActiveRoute = (item) => {
    if (item.exact) return location.pathname === item.href;
    return (
      location.pathname === item.href ||
      location.pathname.startsWith(item.href.endsWith('/') ? item.href : item.href + '/')
    );
  };

  const activeTitle = navigationItems.find((it) => isActiveRoute(it))?.name || 'Dashboard';

  // Sidebar animation variants
  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: '-100%' },
  };

  const contentVariants = {
    open: { opacity: 1, x: 0 },
    closed: { opacity: 0, x: -20 },
  };

  // Responsive sidebar width
  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';
  const contentMargin = sidebarCollapsed ? 'ml-16' : 'ml-64';

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={isMobileMenuOpen ? 'open' : 'closed'}
        variants={sidebarVariants}
        transition={{ type: 'tween', duration: 0.2 }}
        className={cn(
          'fixed inset-y-0 left-0 z-50',
          sidebarWidth,
          'bg-card border-r border-border shadow-lg',
          'lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo / Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">SC</span>
              </div>
              <span className="text-lg font-semibold text-foreground">SaaS Chat</span>
            </motion.div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="lg:flex hidden"
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className={cn('h-5 w-5 transition-transform', sidebarCollapsed && 'rotate-180')} />
          </Button>
        </div>

        {/* Navigation */}
        <div className="h-[calc(100%-4rem)] flex flex-col overflow-y-auto">
          <nav className="mt-6 px-2 space-y-1">
            <AnimatePresence>
              {navigationItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item);
                return (
                  <motion.div
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      to={item.href}
                      className={cn(
                        'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200',
                        'hover:bg-accent hover:text-accent-foreground',
                        isActive
                          ? 'bg-accent text-accent-foreground shadow-sm'
                          : 'text-muted-foreground',
                        sidebarCollapsed && 'justify-center'
                      )}
                      title={sidebarCollapsed ? item.name : undefined}
                    >
                      <Icon className={cn('h-5 w-5 flex-shrink-0', !sidebarCollapsed && 'mr-3')} />
                      {!sidebarCollapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="truncate"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </nav>

          {/* User summary */}
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-auto p-4 border-t border-border"
            >
              <div className="flex items-center gap-3">
                <Avatar
                  key={`sidebar-avatar-${user?.avatar_url || user?.avatar || 'default'}`}
                  size="sm"
                  name={user?.name || user?.username}
                  src={user?.avatar_url || user?.avatar}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.name || user?.username}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user?.role}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.aside>

      {/* Main content */}
      <div className={cn('transition-all duration-200', contentMargin)}>
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border"
        >
          <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="h-6 w-6" />
              </Button>
              <h1 className="text-lg font-semibold text-foreground">
                {activeTitle}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar
                      key={`header-avatar-${user?.avatar_url || user?.avatar || 'default'}`}
                      size="sm"
                      name={user?.name || user?.username}
                      src={user?.avatar_url || user?.avatar}
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center gap-2 p-2">
                    <Avatar
                      key={`menu-avatar-${user?.avatar_url || user?.avatar || 'default'}`}
                      size="sm"
                      name={user?.name || user?.username}
                      src={user?.avatar_url || user?.avatar}
                    />
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-foreground">
                        {user?.name || user?.username}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {user?.role}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.header>

        {/* Content */}
        <motion.main
          id="main-content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="py-6"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {children ?? <Outlet />}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.main>
      </div>
    </div>
  );
};

export default AppLayout;

