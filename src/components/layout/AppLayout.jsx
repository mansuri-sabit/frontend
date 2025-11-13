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
  PanelLeftClose,
  PanelLeftOpen,
  User as UserIcon,
  Settings,
  LogOut,
  Bell,
  X,
  FileCheck
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
        { name: 'Proposals', href: '/client/proposals', permissionKey: 'proposals', icon: FileCheck },
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

  // Determine if we're on desktop (for animation control)
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true; // Default to desktop on SSR
  });
  
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sidebar animation variants - only for mobile
  const sidebarVariants = {
    open: { x: 0 },
    closed: { x: '-100%' },
  };

  // Responsive sidebar width
  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';
  // Content margin: always apply on desktop, never on mobile
  // Use lg: prefix to ensure it only applies on desktop screens
  const contentMargin = sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64';

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
            className="fixed inset-0 bg-white/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={
          // On desktop, always show (open state)
          // On mobile, use isMobileMenuOpen state
          isDesktop ? 'open' : (isMobileMenuOpen ? 'open' : 'closed')
        }
        variants={sidebarVariants}
        transition={{ type: 'tween', duration: 0.2 }}
        className={cn(
          'fixed inset-y-0 left-0 z-50',
          sidebarWidth,
          // Solid background for mobile/tablet - ensure content doesn't show through
          'bg-sidebar border-r border-sidebar-border shadow-lg',
          // Add backdrop blur for mobile/tablet to ensure solid background
          'backdrop-blur-sm lg:backdrop-blur-none',
          // Ensure solid, opaque background on all screen sizes
          'bg-opacity-100',
          'transition-all duration-200',
          // Always visible on desktop via Tailwind
          'lg:translate-x-0'
        )}
      >
        {/* Logo / Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
          {!sidebarCollapsed ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-sidebar-primary-foreground font-bold text-sm">SC</span>
              </div>
              <span className="text-lg font-semibold text-sidebar-foreground truncate">SaaS Chat</span>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
                <span className="text-sidebar-primary-foreground font-bold text-sm">SC</span>
              </div>
            </div>
          )}
          {/* Mobile close button - keep in header for mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden hover:bg-accent"
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <div className="h-[calc(100%-4rem)] flex flex-col overflow-y-auto">
          <nav className="mt-6 px-2 space-y-1 flex-1">
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
                        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                          : 'text-sidebar-foreground/70',
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

          {/* Bottom Section - User summary and Toggle */}
          <div className="mt-auto border-t border-sidebar-border">
            {/* User summary */}
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    key={`sidebar-avatar-${user?.avatar_url || user?.avatar || 'default'}`}
                    size="sm"
                    name={user?.name || user?.username}
                    src={user?.avatar_url || user?.avatar}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {user?.name || user?.username}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 capitalize">
                      {user?.role}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Sidebar Toggle Button - Bottom */}
            <div className={cn(
              'p-2 border-t border-sidebar-border',
              !sidebarCollapsed && 'px-4'
            )}>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className={cn(
                  'w-full lg:flex hidden hover:bg-sidebar-accent text-sidebar-foreground',
                  sidebarCollapsed ? 'justify-center' : 'justify-start'
                )}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="h-5 w-5" />
                ) : (
                  <>
                    <PanelLeftClose className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Collapse</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main content area - properly offset from sidebar */}
      <div className={cn(
        'min-h-screen transition-all duration-200',
        // Mobile: no margin (sidebar is overlay)
        // Desktop: margin based on sidebar width (lg: prefix ensures desktop only)
        contentMargin
      )}>
        {/* Header - positioned correctly with sidebar margin */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={cn(
            'sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border',
            'transition-all duration-200'
          )}
        >
          <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 h-16 gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden flex-shrink-0"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">
                {activeTitle}
              </h1>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Theme Toggle */}
              <div className="flex items-center">
                <ThemeToggle />
              </div>
              
              {/* Notifications Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative hover:bg-accent"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {/* Notification badge - uncomment if you have notifications */}
                {/* <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full ring-2 ring-background" /> */}
              </Button>
              
              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="relative h-9 w-9 rounded-full p-0 hover:ring-2 hover:ring-ring focus:ring-2 focus:ring-ring transition-all hover:bg-accent"
                    aria-label="User menu"
                    title="User menu"
                  >
                    <Avatar
                      key={`header-avatar-${user?.avatar_url || user?.avatar || 'default'}`}
                      size="sm"
                      name={user?.name || user?.username}
                      src={user?.avatar_url || user?.avatar}
                      className="ring-2 ring-background"
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {/* User Info Header */}
                  <div className="flex items-center gap-3 p-3 border-b border-border">
                    <Avatar
                      key={`menu-avatar-${user?.avatar_url || user?.avatar || 'default'}`}
                      size="md"
                      name={user?.name || user?.username}
                      src={user?.avatar_url || user?.avatar}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <p className="text-sm font-semibold text-popover-foreground truncate">
                        {user?.name || user?.username}
                      </p>
                      <p className="text-xs text-popover-foreground/70 capitalize truncate">
                        {user?.role}
                      </p>
                      {user?.email && (
                        <p className="text-xs text-popover-foreground/70 truncate mt-0.5">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Menu Items */}
                  <DropdownMenuItem 
                    onClick={() => {
                      navigate('/profile');
                    }}
                    className="cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault();
                      navigate('/profile');
                    }}
                  >
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onClick={() => {
                      navigate('/settings');
                    }}
                    className="cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault();
                      navigate('/settings');
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    onSelect={(e) => {
                      e.preventDefault();
                      handleLogout();
                    }}
                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
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
