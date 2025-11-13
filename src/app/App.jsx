// src/app/App.jsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store';
import { AdminGuard, ClientGuard } from '../features/auth/guards/RouteGuard';
import { ChatHistory } from '../features/client/pages/ChatHistory';
// Layouts
import { AuthLayout } from '../components/layout/AuthLayout';
import { AppLayout } from '../components/layout/AppLayout';
import { EmbedLayout } from '../components/layout/EmbedLayout';

// Auth Pages
import { LoginForm } from '../features/auth/components/LoginForm';
import { ForgotPassword } from '../features/auth/components/ForgotPassword';

// Admin Pages
import { AdminDashboard } from '../features/admin/pages/AdminDashboard';
import { CreateClient } from '../features/admin/pages/CreateClient';
import EditClient from '../features/admin/pages/EditClient';
import UsageAnalytics from '../features/admin/pages/UsageAnalytics';
import { ClientAccess } from '../features/admin/pages/ClientAccess';

// Client Pages
import { Dashboard } from '../features/client/pages/Dashboard';
import { Branding } from '../features/client/pages/Branding';
import { Documents } from '../features/client/pages/Documents';
import Chat from '../features/client/pages/Chat';
import TokenUsage from '../features/client/pages/TokenUsage';
import EmailTemplates from '../features/client/pages/EmailTemplates';
import Proposals from '../features/client/pages/Proposals';

// User Pages
import ProfilePage from '../features/user/pages/ProfilePage';
import SettingsPage from '../features/user/pages/SettingsPage';

// Embed Widget
import { EmbedWidget } from '../features/embed/EmbedWidget';

// Error Pages
import NotFound from '../components/pages/NotFound';
import { Unauthorized } from '../components/pages/Unauthorized';
import { ServerError } from '../components/pages/ServerError';

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
  </div>
);

function App() {
  const { initialize: initAuth, isLoading: authLoading, user } = useAuthStore();
  const { initialize: initApp } = useAppStore();

  useEffect(() => {
    initAuth();
    initApp();
  }, [initAuth, initApp]);

  if (authLoading) return <PageLoader />;

  // Role-aware landing: if already logged in and hit "/", send to the right dashboard
  const HomeRedirect = () => {
    if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user?.role === 'client') return <Navigate to="/client/dashboard" replace />;
    return <Navigate to="/login" replace />;
  };

  return (
    <div className="App min-h-screen bg-background bottom-9">
      <Routes>
        {/* Public root */}
        <Route path="/" element={<HomeRedirect />} />

        {/* Auth */}
        <Route
          path="/login"
          element={
            <AuthLayout>
              <LoginForm />
            </AuthLayout>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <AuthLayout>
              <ForgotPassword />
            </AuthLayout>
          }
        />

        {/* Embed (public) */}
        <Route
          path="/embed/:clientId"
          element={
            <EmbedLayout>
              <EmbedWidget />
            </EmbedLayout>
          }
        />

        {/* ---------- ADMIN ROUTES ---------- */}
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AppLayout>
                <AdminDashboard />
              </AppLayout>
            </AdminGuard>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <AdminGuard>
              <AppLayout>
                <AdminDashboard />
              </AppLayout>
            </AdminGuard>
          }
        />
        <Route
          path="/admin/clients/new"
          element={
            <AdminGuard>
              <AppLayout>
                <CreateClient />
              </AppLayout>
            </AdminGuard>
          }
        />
        <Route
          path="/admin/clients/:id/edit"
          element={
            <AdminGuard>
              <AppLayout>
                <EditClient />
              </AppLayout>
            </AdminGuard>
          }
        />
        {/* If someone goes to /admin/clients, show dashboard list */}
        <Route path="/admin/clients" element={<Navigate to="/admin/dashboard" replace />} />
        <Route
          path="/admin/usage"
          element={
            <AdminGuard>
              <AppLayout>
                <UsageAnalytics />
              </AppLayout>
            </AdminGuard>
          }
        />
        <Route
          path="/admin/client-access"
          element={
            <AdminGuard>
              <AppLayout>
                <ClientAccess />
              </AppLayout>
            </AdminGuard>
          }
        />

        {/* ---------- CLIENT ROUTES (always /client/*) ---------- */}
        {/* Index for /client */}
        <Route path="/client" element={<Navigate to="/client/dashboard" replace />} />

        <Route
          path="/client/dashboard"
          element={
            <ClientGuard>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ClientGuard>
          }
        />
        <Route
          path="/client/branding"
          element={
            <ClientGuard>
              <AppLayout>
                <Branding />
              </AppLayout>
            </ClientGuard>
          }
        />
        <Route
          path="/client/documents"
          element={
            <ClientGuard>
              <AppLayout>
                <Documents />
              </AppLayout>
            </ClientGuard>
          }
        />
        <Route
          path="/client/chat"
          element={
            <ClientGuard>
              <AppLayout>
                <Chat />
              </AppLayout>
            </ClientGuard>
          }
        />
        <Route
          path="/client/tokens"
          element={
            <ClientGuard>
              <AppLayout>
                <TokenUsage />
              </AppLayout>
            </ClientGuard>
          }
        />
        <Route
          path="/client/email-templates"
          element={
            <ClientGuard>
              <AppLayout>
                <EmailTemplates />
              </AppLayout>
            </ClientGuard>
          }
        />

        <Route
          path="/client/analytics"
          element={
            <ClientGuard>
              <AppLayout>
                <UsageAnalytics />
              </AppLayout>
            </ClientGuard>
          }
        />

        {/* User Profile and Settings - Available to all authenticated users */}
        <Route
          path="/profile"
          element={
            <ClientGuard>
              <AppLayout>
                <ProfilePage />
              </AppLayout>
            </ClientGuard>
          }
        />
        <Route
          path="/settings"
          element={
            <ClientGuard>
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            </ClientGuard>
          }
        />

        {/* ---------- LEGACY/SHORT REDIRECTS (avoid 403 + 404) ---------- */}
        {/* old non-prefixed routes → role-aware redirects */}
        <Route path="/dashboard" element={<HomeRedirect />} />
        <Route path="/branding" element={<Navigate to="/client/branding" replace />} />
        <Route path="/documents" element={<Navigate to="/client/documents" replace />} />
        <Route path="/chat" element={<Navigate to="/client/chat" replace />} />
        <Route path="/tokens" element={<Navigate to="/client/tokens" replace />} />
        <Route path="/analytics" element={<Navigate to="/client/analytics" replace />} />
        {/* alias used in some components */}
        <Route path="/client/token-usage" element={<Navigate to="/client/tokens" replace />} />

        {/* Errors */}
        <Route
          path="/unauthorized"
          element={
            <AuthLayout>
              <Unauthorized />
            </AuthLayout>
          }
        />
        <Route
          path="/error"
          element={
            <AuthLayout>
              <ServerError />
            </AuthLayout>
          }
        />
        <Route path="/embed/chatframe/:clientId" element={<EmbedLayout><EmbedWidget/></EmbedLayout>} />

        <Route
          path="/client/chat-history"
          element={
            <ClientGuard>
              <AppLayout>
                <ChatHistory />
              </AppLayout>
            </ClientGuard>
          }
        />
        <Route
          path="/client/proposals"
          element={
            <ClientGuard>
              <AppLayout>
                <Proposals />
              </AppLayout>
            </ClientGuard>
          }
        />

        {/* 404 */}
        <Route
          path="*"
          element={
            <AuthLayout>
              <NotFound />
            </AuthLayout>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
