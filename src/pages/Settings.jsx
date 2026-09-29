import React, { useState } from 'react';
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
  Volume2,
  Lock,
  Radio
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSurveillance } from '../contexts/SurveillanceContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { auditLogsService } from '../services/auditLogsService';

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const { soundEnabled, setSoundEnabled } = useSurveillance();
  const [activeTab, setActiveTab] = useState('system'); // system | notifications | detection | security | camera | account
  const [saveToast, setSaveToast] = useState(false);

  // Settings state
  const [systemConfig, setSystemConfig] = useState({
    serverCluster: 'Northern-Frontier-Edge-01 (NVIDIA Orin AGX)',
    storageRetentionDays: '90',
    gpuAllocation: 'Auto (TensorRT 8.6)',
    hardwareAcceleration: true,
    telemetryLogging: true,
  });

  const [notificationConfig, setNotificationConfig] = useState({
    soundAlerts: soundEnabled,
    smsQrtDispatches: true,
    emailDailyDigest: true,
    sirenVolume: 75,
    criticalSirenBeep: true,
    webhookUrl: 'https://mha-border-command.gov.in/api/v1/alerts-webhook',
  });

  const [detectionConfig, setDetectionConfig] = useState({
    yoloModel: 'YOLOv8x-Custom-Thermal (v2.4.1)',
    confidenceThreshold: 85,
    trackerType: 'ByteTrack Multi-Object',
    iouThreshold: 65,
    virtualFenceSensitivity: 90,
    anprConfidence: 92,
    loiteringThresholdSeconds: 180,
    nightVisionAutoToggle: true,
  });

  const [securityConfig, setSecurityConfig] = useState({
    sessionTimeoutMinutes: 30,
    enforce2FA: true,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co',
    allowIpSubnet: '10.240.0.0/16 (MHA Defense Intranet)',
    faceEmbeddingSalt: 'SHA-512-DEFENSE-MIL-2026',
  });

  const [accountForm, setAccountForm] = useState({
    name: user?.name || 'Col. Sanjeev Rawat',
    email: user?.email || 'sanjeev.rawat@ibvap.gov.in',
    department: user?.department || 'Border Security Command HQ',
    station: user?.station || 'Northern Sector Base',
  });

  const handleSave = async (e) => {
    e.preventDefault();
    if (activeTab === 'account') {
      updateProfile(accountForm);
    }
    if (activeTab === 'notifications') {
      setSoundEnabled(notificationConfig.soundAlerts);
    }
    await auditLogsService.log('Settings Modified', `Updated parameters for [${activeTab.toUpperCase()}] section`, user?.name, user?.role);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const tabs = [
    { id: 'system', name: 'System', icon: Server },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'detection', name: 'Detection Engine', icon: Cpu },
    { id: 'security', name: 'Security & Supabase', icon: Shield },
    { id: 'camera', name: 'Camera Protocol', icon: Camera },
    { id: 'account', name: 'Commander Account', icon: User },
  ];

  return (
    <div className="space-y-6">
      {/* Header Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-command-900/80 border border-slate-800 backdrop-blur-xl">
        <div>
          <h1 className="text-xl font-bold text-white font-mono tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            Platform & Defense Configuration
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Neural Vision Hyperparameters, RTSP Pipeline, RBAC Policies & Supabase Connector
          </p>
        </div>

        {saveToast && (
          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2 shadow-glow-green animate-bounce">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Configuration Saved & Applied
          </div>
        )}
      </div>

      {/* Tabs and Form Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Tab Menu (3 cols) */}
        <div className="lg:col-span-3 space-y-1.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono font-semibold text-left transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_-3px_rgba(0,229,255,0.25)]'
                  : 'bg-command-900/70 border border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Right: Tab Form Content (9 cols) */}
        <div className="lg:col-span-9">
          <form onSubmit={handleSave} className="p-6 rounded-2xl bg-command-900/90 border border-slate-800 backdrop-blur-xl space-y-6">
            {/* Tab 1: System */}
            {activeTab === 'system' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
                  Edge Compute & Hardware Infrastructure
                </h3>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Edge Processing Cluster
                  </label>
                  <input
                    type="text"
                    value={systemConfig.serverCluster}
                    onChange={(e) => setSystemConfig({ ...systemConfig, serverCluster: e.target.value })}
                    className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">
                      Evidence Storage Retention (Days)
                    </label>
                    <input
                      type="number"
                      value={systemConfig.storageRetentionDays}
                      onChange={(e) => setSystemConfig({ ...systemConfig, storageRetentionDays: e.target.value })}
                      className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">
                      GPU Accelerator Runtime
                    </label>
                    <input
                      type="text"
                      value={systemConfig.gpuAllocation}
                      onChange={(e) => setSystemConfig({ ...systemConfig, gpuAllocation: e.target.value })}
                      className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-command-950 border border-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemConfig.hardwareAcceleration}
                      onChange={(e) => setSystemConfig({ ...systemConfig, hardwareAcceleration: e.target.checked })}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-400"
                    />
                    <div className="text-xs font-mono">
                      <span className="text-slate-200 font-bold block">Enable CUDA / TensorRT DeepStream Pipelines</span>
                      <span className="text-slate-500">Accelerates 4K multi-channel decode directly on edge hardware.</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Tab 2: Notifications */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
                  Alert Notifications & Siren Dispatch
                </h3>

                <div className="space-y-3">
                  <label className="flex items-center justify-between p-3 rounded-xl bg-command-950 border border-slate-800 cursor-pointer">
                    <div className="text-xs font-mono">
                      <span className="text-slate-200 font-bold block">Web Audio Tactical Siren</span>
                      <span className="text-slate-500">Play acoustic chime when critical fence breach or loitering alarm triggers.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationConfig.soundAlerts}
                      onChange={(e) => setNotificationConfig({ ...notificationConfig, soundAlerts: e.target.checked })}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-400"
                    />
                  </label>

                  <label className="flex items-center justify-between p-3 rounded-xl bg-command-950 border border-slate-800 cursor-pointer">
                    <div className="text-xs font-mono">
                      <span className="text-slate-200 font-bold block">Instant SMS to Quick Reaction Team (QRT)</span>
                      <span className="text-slate-500">Dispatches encrypted SMS with GPS coordinates to duty commanders.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={notificationConfig.smsQrtDispatches}
                      onChange={(e) => setNotificationConfig({ ...notificationConfig, smsQrtDispatches: e.target.checked })}
                      className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-400"
                    />
                  </label>
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Emergency Alert Webhook Relay URL
                  </label>
                  <input
                    type="url"
                    value={notificationConfig.webhookUrl}
                    onChange={(e) => setNotificationConfig({ ...notificationConfig, webhookUrl: e.target.value })}
                    className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            )}

            {/* Tab 3: Detection */}
            {activeTab === 'detection' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
                  Neural Vision & Spatial Tripwire Parameters
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">
                      Active YOLO Detection Model
                    </label>
                    <select
                      value={detectionConfig.yoloModel}
                      onChange={(e) => setDetectionConfig({ ...detectionConfig, yoloModel: e.target.value })}
                      className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="YOLOv8x-Custom-Thermal (v2.4.1)">YOLOv8x-Custom-Thermal (v2.4.1) [Recommended]</option>
                      <option value="YOLOv9-Edge-Optimized">YOLOv9-Edge-Optimized</option>
                      <option value="YOLOv11-Border-Perimeter">YOLOv11-Border-Perimeter</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">
                      Multi-Object Tracking Algorithm
                    </label>
                    <select
                      value={detectionConfig.trackerType}
                      onChange={(e) => setDetectionConfig({ ...detectionConfig, trackerType: e.target.value })}
                      className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="ByteTrack Multi-Object">ByteTrack Multi-Object (Low Occlusion Drift)</option>
                      <option value="DeepSORT (ReID Enhanced)">DeepSORT (ReID Enhanced)</option>
                      <option value="BoT-SORT">BoT-SORT (Camera Motion Compensation)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                    <span>YOLO Confidence Threshold</span>
                    <span className="text-cyan-400 font-bold">{detectionConfig.confidenceThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="99"
                    value={detectionConfig.confidenceThreshold}
                    onChange={(e) => setDetectionConfig({ ...detectionConfig, confidenceThreshold: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                    <span>Virtual Fence Spatial Line Sensitivity</span>
                    <span className="text-emerald-400 font-bold">{detectionConfig.virtualFenceSensitivity}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="99"
                    value={detectionConfig.virtualFenceSensitivity}
                    onChange={(e) => setDetectionConfig({ ...detectionConfig, virtualFenceSensitivity: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                  />
                </div>
              </div>
            )}

            {/* Tab 4: Security & Supabase */}
            {activeTab === 'security' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span>Supabase & Security Credentials</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {isSupabaseConfigured ? 'Supabase Connected' : 'Mock DB Mode Active'}
                  </span>
                </h3>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Supabase Project URL (Set via .env VITE_SUPABASE_URL)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={securityConfig.supabaseUrl}
                    className="w-full p-2.5 bg-command-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-slate-300 block mb-1">
                    Authorized IP Subnet Whitelist
                  </label>
                  <input
                    type="text"
                    value={securityConfig.allowIpSubnet}
                    onChange={(e) => setSecurityConfig({ ...securityConfig, allowIpSubnet: e.target.value })}
                    className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs font-mono text-cyan-300">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <Database className="w-4 h-4 text-cyan-400" />
                    Supabase Architecture Ready:
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Tables for `profiles`, `friendly_persons`, `cameras`, `events`, `alerts`, and `audit_logs` are pre-wired.
                  </p>
                </div>
              </div>
            )}

            {/* Tab 5: Camera */}
            {activeTab === 'camera' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
                  Optical, Thermal & PTZ Camera Protocols
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">
                      Default Stream Profile
                    </label>
                    <select className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400">
                      <option>Main Stream (4K UHD / 30 FPS)</option>
                      <option>Sub Stream (1080p / 30 FPS)</option>
                      <option>Low-Bandwidth Mobile (720p / 15 FPS)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">
                      ONVIF Protocol Port
                    </label>
                    <input
                      type="number"
                      defaultValue={80}
                      className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab 6: Account */}
            {activeTab === 'account' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
                  Commander Profile & Station Info
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">
                      Officer Name
                    </label>
                    <input
                      type="text"
                      value={accountForm.name}
                      onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                      className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">
                      Official Email
                    </label>
                    <input
                      type="email"
                      value={accountForm.email}
                      onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                      className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={accountForm.department}
                      onChange={(e) => setAccountForm({ ...accountForm, department: e.target.value })}
                      className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">
                      Assigned Base Station
                    </label>
                    <input
                      type="text"
                      value={accountForm.station}
                      onChange={(e) => setAccountForm({ ...accountForm, station: e.target.value })}
                      className="w-full p-2.5 bg-command-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 transition-all shadow-glow-cyan"
              >
                <Save className="w-4 h-4" />
                Apply & Save Configuration
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
