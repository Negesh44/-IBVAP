import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Cpu, 
  Bell, 
  Shield, 
  Camera, 
  User, 
  Server, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  Database, 
  Sliders, 
  Lock, 
  Radio, 
  Volume2, 
  Zap, 
  LogOut, 
  KeyRound, 
  AlertTriangle, 
  Activity, 
  Eye,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSurveillance } from '../contexts/SurveillanceContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { auditLogsService, profilesService } from '../services/profilesService';
import { formatDateTime } from '../utils/formatters';

const LOCAL_NOTIF_KEY = 'ibvap_settings_notifications';
const LOCAL_DETECTION_KEY = 'ibvap_settings_detection';

const DEFAULT_NOTIFICATIONS = {
  criticalAlerts: true,
  warningAlerts: true,
  cameraOffline: true,
  newDetection: false,
  friendlyPersonMatch: true,
  systemErrors: true,
  acousticSiren: true
};

const DEFAULT_DETECTION = {
  personDetection: { enabled: true, threshold: 0.75 },
  vehicleDetection: { enabled: true, threshold: 0.80 },
  faceRecognition: { enabled: true, threshold: 0.90 },
  anpr: { enabled: true, threshold: 0.85 },
  virtualFence: { enabled: true, threshold: 0.88 },
  loiteringDetection: { enabled: true, threshold: 0.70 },
  nightMovement: { enabled: true, threshold: 0.65 }
};

export default function SettingsPage() {
  const { user, updateProfile, logout } = useAuth();
  const { soundEnabled, setSoundEnabled } = useSurveillance();
  const [activeTab, setActiveTab] = useState('system'); // system | notifications | detection | security | account
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [signOutModal, setSignOutModal] = useState(false);

  // 1. Notification settings state
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem(LOCAL_NOTIF_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_NOTIFICATIONS;
  });

  // 2. Detection settings state
  const [detection, setDetection] = useState(() => {
    const saved = localStorage.getItem(LOCAL_DETECTION_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return DEFAULT_DETECTION;
  });

  // 3. Account settings form
  const [displayName, setDisplayName] = useState(user?.name || user?.fullName || 'Col. Sanjeev Rawat');
  const [accountSaving, setAccountSaving] = useState(false);

  useEffect(() => {
    if (user?.name || user?.fullName) {
      setDisplayName(user.name || user.fullName);
    }
  }, [user]);

  // Handle Notifications Save
  const handleSaveNotifications = async (e) => {
    e.preventDefault();
    localStorage.setItem(LOCAL_NOTIF_KEY, JSON.stringify(notifications));
    setSoundEnabled(notifications.acousticSiren);

    await auditLogsService.log({
      action: 'Change Settings',
      resourceType: 'Settings',
      resourceId: 'NOTIFICATIONS',
      details: 'Updated notification alert channels and acoustic sirens',
      user: user?.name || 'Administrator',
      userRole: user?.role || 'ADMIN',
      userId: user?.id
    });

    triggerSaveToast();
  };

  // Handle Detection Settings Save
  const handleSaveDetection = async (e) => {
    e.preventDefault();
    localStorage.setItem(LOCAL_DETECTION_KEY, JSON.stringify(detection));

    await auditLogsService.log({
      action: 'Change Settings',
      resourceType: 'Settings',
      resourceId: 'DETECTION',
      details: 'Updated AI confidence thresholds and neural vision model triggers',
      user: user?.name || 'Administrator',
      userRole: user?.role || 'ADMIN',
      userId: user?.id
    });

    triggerSaveToast();
  };

  // Handle Account Display Name Update
  const handleSaveAccount = async (e) => {
    e.preventDefault();
    setAccountSaving(true);
    try {
      await updateProfile({ name: displayName, fullName: displayName });
      if (user?.id) {
        await profilesService.updateProfile(user.id, { name: displayName, fullName: displayName });
      }

      await auditLogsService.log({
        action: 'Change Settings',
        resourceType: 'User',
        resourceId: user?.id || 'ACCOUNT',
        details: `User display name modified to "${displayName}"`,
        user: displayName,
        userRole: user?.role || 'ADMIN',
        userId: user?.id
      });

      triggerSaveToast();
    } catch (err) {
      console.error('Failed to update account:', err);
      alert('Failed to update display name.');
    } finally {
      setAccountSaving(false);
    }
  };

  const triggerSaveToast = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Sign out all sessions handler
  const handleSignOutAllSessions = async () => {
    await auditLogsService.log({
      action: 'Global Session Revocation',
      resourceType: 'Security',
      resourceId: 'ALL_SESSIONS',
      details: `Terminated active sessions for account ${user?.email}`,
      user: user?.name || 'Officer',
      userRole: user?.role || 'ADMIN',
      userId: user?.id
    });

    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.warn('Supabase global signout:', err);
      }
    }
    await logout();
    window.location.href = '/login';
  };

  const tabs = [
    { id: 'system', name: 'SYSTEM', icon: Server, desc: 'Platform info & telemetry' },
    { id: 'notifications', name: 'NOTIFICATIONS', icon: Bell, desc: 'Alert channels & sirens' },
    { id: 'detection', name: 'DETECTION', icon: SlidersHorizontal, desc: 'Neural vision thresholds' },
    { id: 'security', name: 'SECURITY', icon: Shield, desc: 'Sessions & credentials' },
    { id: 'account', name: 'ACCOUNT', icon: User, desc: 'Profile & display name' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-command-900/80 border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              ADMINISTRATION & SYSTEM CONTROL
            </span>
            <span className="text-xs font-mono text-slate-400">
              IBVAP Core v1.0.0
            </span>
          </div>
          <h1 className="text-xl font-bold text-white font-mono tracking-tight mt-1 flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            Platform & Operational Settings
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            System environment, notification routing, AI vision sensitivity, session security & commander profile
          </p>
        </div>

        {saveSuccess && (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 shadow-glow-green animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Configuration Saved & Applied
          </div>
        )}
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Navigation Tabs (3 cols) */}
        <div className="lg:col-span-3 space-y-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_-3px_rgba(0,229,255,0.25)]'
                    : 'bg-command-900/70 border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className={`p-2 rounded-lg ${isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-command-950 text-slate-500'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-mono text-xs font-bold tracking-wider">{tab.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">{tab.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Tab Content Area (9 cols) */}
        <div className="lg:col-span-9">
          <div className="p-6 rounded-2xl bg-command-900/90 border border-slate-800 backdrop-blur-xl min-h-[460px]">
            {/* ========================================================
                SECTION 1: SYSTEM SETTINGS
               ======================================================== */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Server className="w-4 h-4 text-cyan-400" />
                    System & Platform Telemetry
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Platform identity, current environment status and runtime connectors
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Platform */}
                  <div className="p-4 rounded-xl bg-command-950 border border-slate-800">
                    <span className="text-[11px] font-mono text-slate-500 block uppercase">Platform</span>
                    <div className="text-base font-bold font-mono text-white mt-1">IBVAP</div>
                    <span className="text-[10px] font-mono text-cyan-400">Intelligent Border Video Analytics Platform</span>
                  </div>

                  {/* Version */}
                  <div className="p-4 rounded-xl bg-command-950 border border-slate-800">
                    <span className="text-[11px] font-mono text-slate-500 block uppercase">Version</span>
                    <div className="text-base font-bold font-mono text-white mt-1">1.0.0</div>
                    <span className="text-[10px] font-mono text-slate-400">Build #2026.09.29-PROD</span>
                  </div>

                  {/* Environment */}
                  <div className="p-4 rounded-xl bg-command-950 border border-slate-800">
                    <span className="text-[11px] font-mono text-slate-500 block uppercase">Environment</span>
                    <div className="text-base font-bold font-mono text-emerald-400 mt-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Production
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Air-gapped border defense deployment</span>
                  </div>

                  {/* Database */}
                  <div className="p-4 rounded-xl bg-command-950 border border-slate-800">
                    <span className="text-[11px] font-mono text-slate-500 block uppercase">Database</span>
                    <div className="text-base font-bold font-mono text-emerald-400 mt-1 flex items-center gap-2">
                      <Database className="w-4 h-4 text-emerald-400" />
                      {isSupabaseConfigured ? 'Connected (Supabase)' : 'Connected (Local Fallback)'}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Tables: profiles, cameras, alerts, events, audit</span>
                  </div>

                  {/* AI Backend */}
                  <div className="p-4 rounded-xl bg-command-950 border border-slate-800">
                    <span className="text-[11px] font-mono text-slate-500 block uppercase">AI Backend</span>
                    <div className="text-base font-bold font-mono text-amber-400 mt-1 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Pending Integration
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">YOLOv8 + ByteTrack Fast-API Pipeline</span>
                  </div>

                  {/* API */}
                  <div className="p-4 rounded-xl bg-command-950 border border-slate-800">
                    <span className="text-[11px] font-mono text-slate-500 block uppercase">API Gateway</span>
                    <div className="text-base font-bold font-mono text-amber-400 mt-1 flex items-center gap-2">
                      <Radio className="w-4 h-4 text-amber-400" />
                      Pending Integration
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">RTSP Multi-Stream Relay Ingest</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Production Infrastructure Status:</span>
                    IBVAP is operating on secure edge runtime. All database connectors and audit journal chains are operational.
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION 2: NOTIFICATION SETTINGS
               ======================================================== */}
            {activeTab === 'notifications' && (
              <form onSubmit={handleSaveNotifications} className="space-y-6">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Bell className="w-4 h-4 text-cyan-400" />
                      Alert & Notification Channels
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Configure realtime event notifications and acoustic sound alarms (stored locally, Supabase-ready)
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { key: 'criticalAlerts', label: 'Critical Alerts', desc: 'Virtual fence breaches, border line crossings, and intrusion tripwires.' },
                    { key: 'warningAlerts', label: 'Warning Alerts', desc: 'Unidentified loitering, vehicle loitering and restricted speed violations.' },
                    { key: 'cameraOffline', label: 'Camera Offline', desc: 'Instant warning when an RTSP feed drops or experiences signal loss.' },
                    { key: 'newDetection', label: 'New Detection', desc: 'Notify on every bounding box tracking trigger.' },
                    { key: 'friendlyPersonMatch', label: 'Friendly Person Match', desc: 'Notice when verified personnel (IA / BSF / ITBP) are identified by face biometrics.' },
                    { key: 'systemErrors', label: 'System Errors', desc: 'Hardware temperature spikes, storage capacity warnings & watchdog events.' },
                    { key: 'acousticSiren', label: 'Tactical Acoustic Siren', desc: 'Play audible tone upon critical alarm detection in command center.' }
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-command-950 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-colors"
                    >
                      <div className="pr-4">
                        <span className="text-xs font-mono font-bold text-slate-200 block">
                          {item.label}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {item.desc}
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={!!notifications[item.key]}
                        onChange={(e) =>
                          setNotifications({
                            ...notifications,
                            [item.key]: e.target.checked
                          })
                        }
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-400 cursor-pointer"
                      />
                    </label>
                  ))}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-glow-cyan"
                  >
                    <Save className="w-4 h-4" />
                    Save Notification Preferences
                  </button>
                </div>
              </form>
            )}

            {/* ========================================================
                SECTION 3: DETECTION SETTINGS (0.25 - 0.95 SLIDERS)
               ======================================================== */}
            {activeTab === 'detection' && (
              <form onSubmit={handleSaveDetection} className="space-y-6">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                    Neural Vision & Detection Sensitivity
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Frontend AI model configuration. Bounding box & confidence thresholds (0.25 - 0.95) will be consumed by backend
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    { key: 'personDetection', label: 'Person Detection', desc: 'YOLOv8 deep model for humanoid border perimeter tracking' },
                    { key: 'vehicleDetection', label: 'Vehicle Detection', desc: 'Military and civilian vehicle classification' },
                    { key: 'faceRecognition', label: 'Face Recognition', desc: 'Biometric face matching against 512-dim friendly person embeddings' },
                    { key: 'anpr', label: 'ANPR (License Plate Recognition)', desc: 'Automatic optical character recognition on vehicle number plates' },
                    { key: 'virtualFence', label: 'Virtual Fence', desc: 'Vector spatial tripwire crossing and polygon containment boundary' },
                    { key: 'loiteringDetection', label: 'Loitering Detection', desc: 'Temporal dwell-time tracker exceeding 180 seconds in sterile zones' },
                    { key: 'nightMovement', label: 'Night Movement', desc: 'Thermal infrared and low-light optical motion detector' }
                  ].map((det) => {
                    const current = detection[det.key] || { enabled: true, threshold: 0.75 };
                    return (
                      <div
                        key={det.key}
                        className="p-4 rounded-xl bg-command-950 border border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-mono font-bold text-slate-200 block">
                              {det.label}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {det.desc}
                            </span>
                          </div>

                          {/* Enabled / Disabled Toggle */}
                          <button
                            type="button"
                            onClick={() =>
                              setDetection({
                                ...detection,
                                [det.key]: { ...current, enabled: !current.enabled }
                              })
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                              current.enabled
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-glow-cyan'
                                : 'bg-slate-800 text-slate-500 border-slate-700'
                            }`}
                          >
                            {current.enabled ? 'ENABLED' : 'DISABLED'}
                          </button>
                        </div>

                        {/* Slider: 0.25 - 0.95 */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-slate-400">Confidence Threshold:</span>
                            <span className="text-cyan-300 font-bold">
                              {(current.threshold).toFixed(2)} ({Math.round(current.threshold * 100)}%)
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono text-slate-500">0.25</span>
                            <input
                              type="range"
                              min="0.25"
                              max="0.95"
                              step="0.01"
                              disabled={!current.enabled}
                              value={current.threshold}
                              onChange={(e) =>
                                setDetection({
                                  ...detection,
                                  [det.key]: { ...current, threshold: parseFloat(e.target.value) }
                                })
                              }
                              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:opacity-40"
                            />
                            <span className="text-[10px] font-mono text-slate-500">0.95</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-glow-cyan"
                  >
                    <Save className="w-4 h-4" />
                    Save Detection Parameters
                  </button>
                </div>
              </form>
            )}

            {/* ========================================================
                SECTION 4: SECURITY SETTINGS
               ======================================================== */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    Authentication & Session Security
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Session state, credentials verification and global token invalidation
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Session status */}
                  <div className="p-4 rounded-xl bg-command-950 border border-slate-800">
                    <span className="text-[11px] font-mono text-slate-500 block uppercase">Session Status</span>
                    <div className="text-base font-bold font-mono text-emerald-400 mt-1 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Active & Encrypted (TLS 1.3)
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Authenticated Session Token</span>
                  </div>

                  {/* Auth Status */}
                  <div className="p-4 rounded-xl bg-command-950 border border-slate-800">
                    <span className="text-[11px] font-mono text-slate-500 block uppercase">Authentication Status</span>
                    <div className="text-base font-bold font-mono text-cyan-300 mt-1 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-cyan-400" />
                      {isSupabaseConfigured ? 'Supabase Auth Verified' : 'Local Tactical Session'}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Role: {user?.role || 'OPERATOR'}</span>
                  </div>

                  {/* Last Login */}
                  <div className="p-4 rounded-xl bg-command-950 border border-slate-800 sm:col-span-2">
                    <span className="text-[11px] font-mono text-slate-500 block uppercase">Last Login Timestamp</span>
                    <div className="text-sm font-bold font-mono text-slate-200 mt-1">
                      {formatDateTime(user?.lastLogin || new Date().toISOString())}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">IP: 10.240.12.88 (Command Workstation Alpha)</span>
                  </div>
                </div>

                {/* Sign Out All Sessions */}
                <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold font-mono text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      Revoke & Invalidate All Active Sessions
                    </h4>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Terminates active session tokens across all command tablets and surveillance workstations.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSignOutModal(true)}
                    className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 font-mono text-xs font-bold whitespace-nowrap transition-colors"
                  >
                    Sign out all sessions
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================
                SECTION 5: ACCOUNT SETTINGS
               ======================================================== */}
            {activeTab === 'account' && (
              <form onSubmit={handleSaveAccount} className="space-y-6">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    Officer Account Profile
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    View official credentials and update your personal display name
                  </p>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-command-950 border border-slate-800">
                  <img
                    src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                    alt="Avatar"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-cyan-500/40"
                  />
                  <div>
                    <h4 className="text-base font-bold text-white font-mono">{user?.name || 'Officer'}</h4>
                    <p className="text-xs font-mono text-slate-400">{user?.email || 'officer@ibvap.gov.in'}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        {user?.role || 'OPERATOR'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Badge: {user?.badgeNumber || 'TAC-001'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Display Name (Editable) */}
                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">
                      Display Name * (Editable)
                    </label>
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Official Email (Read-only) */}
                  <div>
                    <label className="text-xs font-mono text-slate-400 block mb-1">
                      Official Email Address (Assigned by Administrator)
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full p-2.5 bg-command-950/60 border border-slate-800 rounded-xl text-xs font-mono text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  {/* Assigned Role (Read-only - cannot change from this page) */}
                  <div>
                    <label className="text-xs font-mono text-slate-400 block mb-1">
                      Clearance Role (Read-only — RBAC managed under Users Directory)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user?.role || 'OPERATOR'}
                      className="w-full p-2.5 bg-command-950/60 border border-slate-800 rounded-xl text-xs font-mono text-cyan-400 font-bold cursor-not-allowed"
                    />
                    <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                      Role mutations must be performed by an ADMIN in the /users console.
                    </span>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <button
                    type="submit"
                    disabled={accountSaving}
                    className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-glow-cyan"
                  >
                    <Save className="w-4 h-4" />
                    {accountSaving ? 'Saving...' : 'Update Display Name'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Sign Out All Sessions Confirmation Modal */}
      {signOutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl bg-command-900 border border-red-500/40 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 font-mono font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              Confirm Global Sign Out
            </div>

            <p className="text-xs font-mono text-slate-300 leading-relaxed">
              Are you sure you want to invalidate all active sessions for <span className="text-white font-bold">{user?.email}</span>? You will be redirected to the login terminal immediately.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSignOutModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOutAllSessions}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-white font-mono font-bold text-xs transition-colors"
              >
                Sign Out All Sessions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
