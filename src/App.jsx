import React, { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SurveillanceProvider } from './contexts/SurveillanceContext';
import Layout from './components/layout/Layout';
import { ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';

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

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Tactical Interface Caught Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070b12] text-slate-100 flex items-center justify-center p-6 font-mono">
          <div className="max-w-md w-full p-6 rounded-2xl bg-command-900 border border-cyan-500/40 text-center space-y-4 shadow-glow-cyan">
            <div className="w-12 h-12 mx-auto rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wider">
                TACTICAL DISPLAY RECOVERY
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                The tactical terminal encountered an interface refresh request.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-command-950 border border-slate-800 text-[11px] text-cyan-300 text-left truncate">
              {this.state.error?.message || 'Interface stream reset'}
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/dashboard';
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-glow-cyan transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Re-initialize Command Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AccessDenied({ userRole, allowedRoles }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full p-6 rounded-2xl bg-command-900 border border-red-500/40 text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 mx-auto rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 className="text-base font-bold font-mono text-white tracking-wider">
            ACCESS DENIED — INSUFFICIENT CLEARANCE
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Your clearance role (<span className="text-amber-400 font-bold">{userRole}</span>) does not possess authorization to view this tactical intelligence module.
          </p>
        </div>
        <div className="p-3 rounded-xl bg-command-950 border border-slate-800 text-[11px] font-mono text-slate-400 text-left">
          Required Clearance: <span className="text-cyan-300 font-bold">{allowedRoles.join(', ')}</span>
        </div>
        <a
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs shadow-glow-cyan transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Command Dashboard
        </a>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b12] flex items-center justify-center text-cyan-400 font-mono text-sm">
        Authenticating Tactical Link...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = (user?.role || 'OPERATOR').toUpperCase();

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <AccessDenied userRole={userRole} allowedRoles={allowedRoles} />;
  }

  return children;
}

export default function App() {
  return (
    <ErrorBoundary>
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
                
                {/* Dashboard: All roles */}
                <Route 
                  path="dashboard" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'COMMANDER', 'OPERATOR', 'VIEWER']}>
                      <Dashboard />
                    </ProtectedRoute>
                  } 
                />

                {/* Live Surveillance: All roles */}
                <Route 
                  path="live" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'COMMANDER', 'OPERATOR', 'VIEWER']}>
                      <LiveSurveillance />
                    </ProtectedRoute>
                  } 
                />

                {/* Alerts: ADMIN, COMMANDER, OPERATOR */}
                <Route 
                  path="alerts" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'COMMANDER', 'OPERATOR']}>
                      <Alerts />
                    </ProtectedRoute>
                  } 
                />

                {/* Cameras: ADMIN, COMMANDER, OPERATOR */}
                <Route 
                  path="cameras" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'COMMANDER', 'OPERATOR']}>
                      <Cameras />
                    </ProtectedRoute>
                  } 
                />

                {/* Friendly Persons: ADMIN, COMMANDER, OPERATOR */}
                <Route 
                  path="friendly-persons" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'COMMANDER', 'OPERATOR']}>
                      <FriendlyPersons />
                    </ProtectedRoute>
                  } 
                />

                {/* Events: ADMIN, COMMANDER, OPERATOR, VIEWER */}
                <Route 
                  path="events" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'COMMANDER', 'OPERATOR', 'VIEWER']}>
                      <Events />
                    </ProtectedRoute>
                  } 
                />

                {/* Analytics: ADMIN, COMMANDER, VIEWER */}
                <Route 
                  path="analytics" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'COMMANDER', 'VIEWER']}>
                      <Analytics />
                    </ProtectedRoute>
                  } 
                />

                {/* Users: Only ADMIN */}
                <Route 
                  path="users" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <UsersPage />
                    </ProtectedRoute>
                  } 
                />

                {/* Audit Logs: Only ADMIN */}
                <Route 
                  path="audit-logs" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AuditLogs />
                    </ProtectedRoute>
                  } 
                />

                {/* Settings: All authenticated roles */}
                <Route 
                  path="settings" 
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'COMMANDER', 'OPERATOR', 'VIEWER']}>
                      <SettingsPage />
                    </ProtectedRoute>
                  } 
                />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </SurveillanceProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
