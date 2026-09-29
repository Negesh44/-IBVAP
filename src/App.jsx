import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SurveillanceProvider } from './contexts/SurveillanceContext';
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LiveSurveillance from './pages/LiveSurveillance';
import Alerts from './pages/Alerts';
import Cameras from './pages/Cameras';
import FriendlyPersons from './pages/FriendlyPersons';
import Events from './pages/Events';
import Analytics from './pages/Analytics';
import UsersPage from './pages/Users';
import AuditLogs from './pages/AuditLogs';
import SettingsPage from './pages/Settings';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b12] flex items-center justify-center text-cyan-400 font-mono text-sm">
        Authenticating Tactical Link...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <SurveillanceProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Command Center Matrix */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="live" element={<LiveSurveillance />} />
              <Route path="alerts" element={<Alerts />} />
              <Route path="cameras" element={<Cameras />} />
              <Route path="friendly-persons" element={<FriendlyPersons />} />
              <Route path="events" element={<Events />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </SurveillanceProvider>
    </AuthProvider>
  );
}
