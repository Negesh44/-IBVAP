import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  Volume2, 
  VolumeX, 
  Search, 
  Wifi, 
  ShieldCheck, 
  Radio, 
  Cpu, 
  User, 
  Sparkles,
  AlertCircle,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSurveillance } from '../../contexts/SurveillanceContext';
import NotificationPanel from './NotificationPanel';
import { cn } from '../../utils/cn';

export default function Topbar({ onToggleMobileMenu }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { 
    soundEnabled, 
    setSoundEnabled, 
    unreadAlertsCount, 
    connectionStatus,
    cameras,
    recentNotification,
    clearNotification
  } = useSurveillance();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Determine current page title
  const getPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/':
      case '/dashboard':
        return { title: 'Command Center Dashboard', sector: 'Sector Alpha Grid 01' };
      case '/live':
        return { title: 'Live Surveillance CCTV Matrix', sector: '4-Ch Multi-View Perimeter Streams' };
      case '/alerts':
        return { title: 'Security Alert Management Center', sector: 'Real-Time Intrusion & Threat Feed' };
      case '/cameras':
        return { title: 'Optical & Thermal Camera Fleet', sector: 'RTSP Feeds & Slew Sensors' };
      case '/friendly-persons':
        return { title: 'Friendly Identity Management', sector: 'Face Embeddings & Authorized Personnel' };
      case '/events':
        return { title: 'Border Event History & Forensic Logs', sector: 'Chronological Incident Timeline' };
      case '/analytics':
        return { title: 'Intelligence Analytics & Heatmaps', sector: 'Predictive Threat & Traffic Metrics' };
      case '/users':
        return { title: 'Access Control & User Directory', sector: 'RBAC Security Matrix' };
      case '/audit-logs':
        return { title: 'System Security Audit Trail', sector: 'Immutable Operational Event Logs' };
      case '/settings':
        return { title: 'Platform & Detection Settings', sector: 'Hardware, Network & AI Engine Config' };
      default:
        return { title: 'Command Center', sector: 'IBVAP Defense Network' };
    }
  };

  const pageInfo = getPageTitle();
  const safeCameras = Array.isArray(cameras) ? cameras : [];
  const onlineCount = safeCameras.filter(c => c?.status === 'ONLINE').length;

  return (
    <header className="sticky top-0 z-30 h-16 bg-command-950/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-100 font-mono tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00e5ff]" />
            {pageInfo.title}
          </h2>
          <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
            {pageInfo.sector}
          </p>
        </div>
      </div>

      {/* Center / Right: Global Search & Controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search Bar */}
        <div className="relative hidden md:block w-48 lg:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search border post, ID, unit..."
            className="w-full pl-8 pr-3 py-1.5 bg-command-900/90 border border-slate-700/60 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>

        {/* Live RTSP Connection Status Pill */}
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-command-900 border border-slate-800 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400 text-[11px]">FEEDS:</span>
          <span className="text-cyan-300 font-bold text-[11px]">{onlineCount}/{cameras.length || 6} ONLINE</span>
        </div>

        {/* Audio Siren Toggle */}
        <button
          onClick={() => setSoundEnabled(prev => !prev)}
          className={cn(
            "p-2 rounded-lg border transition-colors",
            soundEnabled
              ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-300"
              : "bg-command-900 border-slate-800 text-slate-400 hover:text-slate-200"
          )}
          title={soundEnabled ? "Siren Audio Alarm Enabled" : "Audio Muted (Click to Enable Siren)"}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>

        {/* Notification Bell with Badge */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(prev => !prev)}
            className="relative p-2 rounded-lg bg-command-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:border-slate-700 transition-colors"
            title="View Security Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-mono font-bold flex items-center justify-center animate-bounce">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          <NotificationPanel
            isOpen={showNotifications}
            onClose={() => setShowNotifications(false)}
          />
        </div>

        {/* Current User Badge & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(prev => !prev)}
            className="flex items-center gap-2 pl-2 border-l border-slate-800 hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-700 bg-command-900">
              <img
                src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                alt="User"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-slate-200 leading-tight flex items-center gap-1">
                <span>{user?.name || 'Commander'}</span>
                <ChevronDown className="w-3 h-3 text-slate-500" />
              </p>
              <p className="text-[9px] font-mono text-cyan-400 leading-tight">
                {user?.role || 'ADMIN'} • {user?.department?.split(' ')[0] || 'BSF'}
              </p>
            </div>
          </button>

          {/* User Profile Popup Menu */}
          {showUserDropdown && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowUserDropdown(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-4 top-16 w-56 rounded-xl bg-command-900/95 border border-slate-700 p-2 shadow-2xl backdrop-blur-xl z-50 text-xs font-mono"
              >
                <div className="px-3 py-2 border-b border-slate-800 mb-1">
                  <p className="font-bold text-slate-200 truncate">{user?.name || 'Commander'}</p>
                  <p className="text-[10px] text-cyan-400 truncate">{user?.email || 'admin@ibvap.gov.in'}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Role: {user?.role || 'ADMIN'}</p>
                </div>

                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    navigate('/settings');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Officer Profile</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-lg text-red-400 hover:bg-red-950/40 transition-colors flex items-center gap-2 mt-1 border-t border-slate-800/80"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Terminate Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
