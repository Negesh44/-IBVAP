import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Users, 
  Car, 
  ShieldAlert, 
  UserCheck, 
  CalendarDays, 
  ArrowUpRight, 
  Radio, 
  Maximize2, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Sliders, 
  ChevronRight,
  TrendingUp,
  Flame,
  ShieldCheck,
  AlertTriangle,
  Server
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import StatCard from '../components/common/StatCard';
import ChartCard from '../components/common/ChartCard';
import StatusBadge from '../components/common/StatusBadge';
import SurveillanceFeed from '../components/surveillance/SurveillanceFeed';
import AlertDetailModal from '../components/alerts/AlertDetailModal';
import CameraControlModal from '../components/surveillance/CameraControlModal';
import { useSurveillance } from '../contexts/SurveillanceContext';
import { MOCK_ANALYTICS } from '../data/mockData';
import { formatRelativeTime, formatTacticalTime } from '../utils/formatters';

export default function Dashboard() {
  const navigate = useNavigate();
  const { 
    cameras, 
    alerts, 
    events, 
    friendlyPersons,
    stats,
    selectedCamera, 
    setSelectedCamera,
    acknowledgeAlert,
    resolveAlert,
    triggerSimulatedAlert
  } = useSurveillance();

  const [activeAlertDetail, setActiveAlertDetail] = useState(null);
  const [activeCameraModal, setActiveCameraModal] = useState(null);

  // Dynamic Camera Statistics from Supabase
  const totalCameras = cameras.length || 6;
  const onlineCameras = cameras.filter(c => c.status === 'ONLINE').length;
  const warningCameras = cameras.filter(c => c.status === 'WARNING').length;
  const offlineCameras = cameras.filter(c => c.status === 'OFFLINE').length;

  const activeAlertsCount = alerts.filter(a => a.status === 'ACTIVE').length;
  const recentAlerts = alerts.slice(0, 4);
  const recentEvents = events.slice(0, 5);

  const primaryCamera = selectedCamera || cameras[0] || null;

  return (
    <div className="space-y-6">
      {/* Welcome & Sector Status Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-command-900/80 border border-slate-800/80 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              ALL SECTORS MONITORED
            </span>
            <span className="text-xs font-mono text-slate-400">
              Frontier Grid Alpha-Echo • Supabase Connected
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-mono tracking-tight mt-1">
            Tactical Operations Command Dashboard
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Automated Video Analytics & Spatial Tripwire Active • AI Engine v2.4 (ByteTrack + YOLOv8)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/live')}
            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs transition-all shadow-glow-cyan flex items-center gap-1.5"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            4-Ch Multi-View
          </button>
          <button
            onClick={() => navigate('/alerts')}
            className="px-3.5 py-2 rounded-xl bg-command-950 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs transition-colors flex items-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            Alert Center
          </button>
        </div>
      </div>

      {/* 6 Top Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard
          title="Active Cameras"
          value={`${onlineCameras}/${totalCameras}`}
          subtitle={`${warningCameras} warn • ${offlineCameras} off`}
          icon={Camera}
          colorScheme="cyan"
          trend={`${((onlineCameras / totalCameras) * 100).toFixed(0)}%`}
          trendDirection="up"
          onClick={() => navigate('/cameras')}
        />
        <StatCard
          title="People Detected"
          value={stats.peopleDetectedToday}
          subtitle="Realtime tracked"
          icon={Users}
          colorScheme="green"
          trend="+12%"
          trendDirection="up"
          onClick={() => navigate('/analytics')}
        />
        <StatCard
          title="Vehicles"
          value={stats.vehiclesDetectedToday}
          subtitle="Registered convoys"
          icon={Car}
          colorScheme="blue"
          trend="+4%"
          trendDirection="up"
          onClick={() => navigate('/analytics')}
        />
        <StatCard
          title="Active Alerts"
          value={activeAlertsCount}
          subtitle="Threat queue"
          icon={ShieldAlert}
          colorScheme="red"
          trend={activeAlertsCount > 0 ? "High" : "Zero"}
          trendDirection={activeAlertsCount > 0 ? "up" : "down"}
          onClick={() => navigate('/alerts')}
        />
        <StatCard
          title="Friendly Persons"
          value={friendlyPersons.length || stats.friendlyPersonsRegistered}
          subtitle="Biometric whitelist"
          icon={UserCheck}
          colorScheme="green"
          trend="100%"
          trendDirection="up"
          onClick={() => navigate('/friendly-persons')}
        />
        <StatCard
          title="Events Today"
          value={events.length || stats.eventsToday}
          subtitle="Database logged"
          icon={CalendarDays}
          colorScheme="amber"
          trend="+18%"
          trendDirection="up"
          onClick={() => navigate('/events')}
        />
      </div>

      {/* Main Grid Section: Primary Live Surveillance + Camera Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Live Primary Feed Panel (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-command-900/80 border border-slate-800 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <h3 className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wider">
                  Live Stream Priority Focus — {primaryCamera?.cameraCode || primaryCamera?.id}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={primaryCamera?.status} pulse={primaryCamera?.status === 'ONLINE'} />
                <button
                  onClick={() => setActiveCameraModal(primaryCamera)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-400"
                  title="Configure PTZ / Sensor"
                >
                  <Sliders className="w-4 h-4" />
                </button>
              </div>
            </div>

            {primaryCamera && (
              <SurveillanceFeed
                camera={primaryCamera}
                showControls={true}
                onOpenSettings={() => setActiveCameraModal(primaryCamera)}
                onFullscreen={() => navigate('/live')}
                className="w-full h-72 sm:h-84 lg:h-96"
              />
            )}

            {/* Quick Camera Switcher Tabs */}
            <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
              {cameras.slice(0, 6).map((cam) => {
                const isSelected = selectedCamera?.id === cam.id;
                return (
                  <button
                    key={cam.id}
                    onClick={() => setSelectedCamera(cam)}
                    className={`p-2 rounded-lg text-left font-mono border transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                        : 'bg-command-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-[10px] font-bold truncate">{cam.cameraCode || cam.id}</div>
                    <div className="text-[9px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        cam.status === 'ONLINE' ? 'bg-emerald-400' :
                        cam.status === 'WARNING' ? 'bg-amber-400' : 'bg-red-500'
                      }`} />
                      <span className="truncate">{cam.sector || 'North'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-time Detection Activity Recharts Graph */}
          <ChartCard
            title="Real-Time Detection Activity"
            subtitle="Hourly AI classification breakdown (People, Vehicles & Threat Alarms)"
            action={
              <button
                onClick={() => navigate('/analytics')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                Deep Analytics <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            }
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MOCK_ANALYTICS.hourlyDetections} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPeople" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#00e5ff" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorVehicles" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00e676" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00e676" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff334b" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ff334b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={11} fontStyle="italic" />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0c1322',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                  <Area type="monotone" dataKey="people" name="People" stroke="#00e5ff" strokeWidth={2} fillOpacity={1} fill="url(#colorPeople)" />
                  <Area type="monotone" dataKey="vehicles" name="Vehicles" stroke="#00e676" strokeWidth={2} fillOpacity={1} fill="url(#colorVehicles)" />
                  <Area type="monotone" dataKey="alerts" name="Alerts" stroke="#ff334b" strokeWidth={2} fillOpacity={1} fill="url(#colorAlerts)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>

        {/* Right Column: Security Alerts Feed + Live Event Timeline (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Recent Security Alerts Card */}
          <div className="p-5 rounded-2xl bg-command-900/80 border border-slate-800 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wider">
                  Active Security Alerts
                </h3>
              </div>
              <button
                onClick={() => navigate('/alerts')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center"
              >
                View All ({alerts.length}) <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {recentAlerts.map(alert => {
                const isCrit = alert.severity === 'CRITICAL';
                return (
                  <div
                    key={alert.id}
                    onClick={() => setActiveAlertDetail(alert)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isCrit && alert.status === 'ACTIVE'
                        ? 'bg-red-950/30 border-red-500/50 hover:border-red-400 shadow-[0_0_15px_-4px_rgba(255,51,75,0.2)]'
                        : 'bg-command-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono text-cyan-400 font-bold">{alert.id}</span>
                          <span className="text-slate-600">•</span>
                          <h4 className="text-xs font-semibold text-slate-200">{alert.type}</h4>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 font-mono">
                          {alert.camera} • {alert.location}
                        </p>
                      </div>
                      <StatusBadge status={alert.status} pulse={alert.status === 'ACTIVE'} />
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>{formatRelativeTime(alert.timestamp || alert.time)}</span>
                      <span className="text-cyan-400 hover:underline">Open Dossier →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event Timeline */}
          <div className="p-5 rounded-2xl bg-command-900/80 border border-slate-800 backdrop-blur-xl flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold font-mono text-slate-100 uppercase tracking-wider">
                  Event Stream Timeline
                </h3>
              </div>
              <button
                onClick={() => navigate('/events')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center"
              >
                Log History <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Timeline Stream Items */}
            <div className="space-y-4 flex-1">
              {recentEvents.map((evt, idx) => (
                <div key={evt.id || idx} className="flex items-start gap-3 relative">
                  {idx < recentEvents.length - 1 && (
                    <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-slate-800" />
                  )}

                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    evt.severity === 'CRITICAL' 
                      ? 'bg-red-500/20 text-red-400 ring-2 ring-red-500/30' 
                      : evt.targetType === 'FRIENDLY'
                      ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-cyan-500/20 text-cyan-400 ring-2 ring-cyan-500/30'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  </div>

                  <div className="flex-1 min-w-0 bg-command-950/60 p-2.5 rounded-lg border border-slate-800/80">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-slate-200 truncate">
                        {evt.eventType}
                      </p>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {formatRelativeTime(evt.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-1">
                      <span className="text-cyan-300">{evt.camera}</span>
                      <span>•</span>
                      <span>{evt.targetId}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alert Detail Modal */}
      {activeAlertDetail && (
        <AlertDetailModal
          alert={activeAlertDetail}
          isOpen={!!activeAlertDetail}
          onClose={() => setActiveAlertDetail(null)}
          onUpdateStatus={resolveAlert}
        />
      )}

      {/* Camera PTZ & Config Modal */}
      {activeCameraModal && (
        <CameraControlModal
          camera={activeCameraModal}
          isOpen={!!activeCameraModal}
          onClose={() => setActiveCameraModal(null)}
        />
      )}
    </div>
  );
}
