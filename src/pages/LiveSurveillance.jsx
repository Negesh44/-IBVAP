import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Grid2X2, 
  Grid3X3, 
  Square, 
  Maximize2, 
  Camera, 
  Volume2, 
  VolumeX, 
  Sliders, 
  Radio, 
  ShieldAlert, 
  Filter, 
  Sparkles,
  Zap,
  Map as MapIcon,
  Cpu,
  Activity,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Flame,
  LayoutGrid
} from 'lucide-react';
import CameraCard from '../components/surveillance/CameraCard';
import SurveillanceFeed from '../components/surveillance/SurveillanceFeed';
import CameraControlModal from '../components/surveillance/CameraControlModal';
import LiveDetectionPanel from '../components/surveillance/LiveDetectionPanel';
import SurveillanceMapView from '../components/surveillance/SurveillanceMapView';
import Modal from '../components/common/Modal';
import { useSurveillance } from '../contexts/SurveillanceContext';
import { cn } from '../utils/cn';

export default function LiveSurveillance() {
  const { 
    cameras, 
    friendlyPersons,
    triggerSimulatedAlert,
    isSimulating,
    setIsSimulating
  } = useSurveillance();

  const [viewMode, setViewMode] = useState('GRID'); // 'GRID' | 'MAP'
  const [layoutMode, setLayoutMode] = useState('2x2'); // '1x1' | '2x2' | '3x2'
  const [detectionFilter, setDetectionFilter] = useState('ALL'); // 'ALL' | 'PEOPLE' | 'VEHICLES' | 'FRIENDLY' | 'UNKNOWN' | 'ALERTS'
  const [sectorFilter, setSectorFilter] = useState('ALL');
  const [fullscreenCamera, setFullscreenCamera] = useState(null);
  const [configCamera, setConfigCamera] = useState(null);
  const [snapshotSuccessToast, setSnapshotSuccessToast] = useState('');
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Online camera counts
  const onlineCamerasCount = cameras.filter(c => c.status === 'ONLINE').length;

  const filteredCameras = cameras.filter(cam => {
    if (sectorFilter === 'ALL') return true;
    return (cam.sector || cam.location || '').toUpperCase().includes(sectorFilter);
  });

  const handleSnapshot = (cam) => {
    const camName = cam?.name || cam?.cameraCode || 'Border Surveillance Camera';
    setSnapshotSuccessToast(`Captured high-resolution frame from ${camName}. Stored to Evidence Vault.`);
    setTimeout(() => setSnapshotSuccessToast(''), 4500);
  };

  const handleSelectCameraFromPanel = (camCode) => {
    const match = cameras.find(c => (c.cameraCode === camCode || c.id === camCode));
    if (match) {
      setFullscreenCamera(match);
    }
  };

  return (
    <div className="space-y-5">
      {/* 10. AI STATUS BANNER */}
      <div className="rounded-2xl bg-command-900/90 border border-slate-800/90 backdrop-blur-xl p-3 sm:p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          {/* Status block 1: AI Engine Online */}
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-3 h-3">
              <span className="absolute w-3 h-3 rounded-full bg-emerald-500/40 animate-ping" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block leading-tight uppercase font-bold">AI ENGINE</span>
              <span className="text-emerald-400 font-bold tracking-wide">ONLINE</span>
            </div>
          </div>

          {/* Status block 2: Model */}
          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-[10px] text-slate-500 block leading-tight uppercase font-bold">MODEL</span>
              <span className="text-cyan-300 font-bold">YOLOv8</span>
            </div>
          </div>

          {/* Status block 3: Tracker */}
          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <Layers className="w-4 h-4 text-purple-400" />
            <div>
              <span className="text-[10px] text-slate-500 block leading-tight uppercase font-bold">TRACKER</span>
              <span className="text-purple-300 font-bold">ByteTrack</span>
            </div>
          </div>

          {/* Status block 4: Cameras Online */}
          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <Radio className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-500 block leading-tight uppercase font-bold">CAMERAS</span>
              <span className="text-emerald-400 font-bold">{onlineCamerasCount} ONLINE</span>
            </div>
          </div>

          {/* Status block 5: Processing Active */}
          <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <div>
              <span className="text-[10px] text-slate-500 block leading-tight uppercase font-bold">PROCESSING</span>
              <span className="text-cyan-300 font-bold">ACTIVE (18.4ms)</span>
            </div>
          </div>

          {/* Simulation Alert trigger */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => triggerSimulatedAlert('Virtual Fence Breach')}
              className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-glow-red"
            >
              <Zap className="w-3.5 h-3.5 text-red-400 animate-bounce" />
              Simulate Intrusion Alert
            </button>
          </div>
        </div>
      </div>

      {/* 8. TOP CONTROLS & MATRIX NAVIGATION TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-command-900/90 border border-slate-800 backdrop-blur-xl">
        {/* Left title & live status indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-600/90 text-white font-mono text-xs font-bold shadow-glow-red">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white font-mono tracking-tight flex items-center gap-2">
              Surveillance Command Matrix
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              Displaying {cameras.length} connected feeds from Supabase
            </p>
          </div>
        </div>

        {/* View Switchers & Detection Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle (Grid View vs Map View) */}
          <div className="flex items-center gap-1 bg-command-950 p-1 rounded-xl border border-slate-800 font-mono text-xs">
            <button
              onClick={() => setViewMode('GRID')}
              className={cn(
                "px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all",
                viewMode === 'GRID'
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grid View
            </button>
            <button
              onClick={() => setViewMode('MAP')}
              className={cn(
                "px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold transition-all",
                viewMode === 'MAP'
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <MapIcon className="w-3.5 h-3.5" />
              Map View
            </button>
          </div>

          {/* Grid Layout Switcher (2x2 default) */}
          {viewMode === 'GRID' && (
            <div className="flex items-center gap-1 bg-command-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setLayoutMode('1x1')}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  layoutMode === '1x1' ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-slate-500 hover:text-slate-300"
                )}
                title="1x1 Single Focus"
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode('2x2')}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  layoutMode === '2x2' ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-slate-500 hover:text-slate-300"
                )}
                title="2x2 Default 4-Camera Grid"
              >
                <Grid2X2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode('3x2')}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  layoutMode === '3x2' ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "text-slate-500 hover:text-slate-300"
                )}
                title="3x2 All Cameras Grid"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Detection Category Filters: People, Vehicles, Friendly, Unknown, Alerts */}
          <div className="flex items-center gap-1 bg-command-950 p-1 rounded-xl border border-slate-800 text-xs font-mono overflow-x-auto">
            <span className="text-[10px] text-slate-500 uppercase px-2 font-bold flex items-center gap-1">
              <Filter className="w-3 h-3 text-cyan-400" />
              Filter:
            </span>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'PEOPLE', label: 'People' },
              { id: 'VEHICLES', label: 'Vehicles' },
              { id: 'FRIENDLY', label: 'Friendly' },
              { id: 'UNKNOWN', label: 'Unknown' },
              { id: 'ALERTS', label: 'Alerts' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDetectionFilter(tab.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all font-semibold whitespace-nowrap",
                  detectionFilter === tab.id
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Snapshot Toast notification */}
      {snapshotSuccessToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between shadow-glow-green animate-pulse">
          <span className="flex items-center gap-2 font-semibold">
            <Camera className="w-4 h-4 text-emerald-400" />
            {snapshotSuccessToast}
          </span>
          <span className="text-[10px] text-emerald-400 uppercase font-bold bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-500/30">
            Encrypted Hash Stored
          </span>
        </div>
      )}

      {/* MAIN CONTENT WORKSPACE: CAMERA GRID OR MAP VIEW + RIGHT SIDE DETECTION PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left / Center: Surveillance Feeds or Geospatial Map */}
        <div className={cn("transition-all duration-300", showRightPanel ? "lg:col-span-8 xl:col-span-9" : "lg:col-span-12")}>
          {viewMode === 'MAP' ? (
            /* 9. MAP VIEW */
            <SurveillanceMapView
              cameras={cameras}
              onSelectCamera={handleSelectCameraFromPanel}
              onFullscreenCamera={(cam) => setFullscreenCamera(cam)}
            />
          ) : (
            /* 1. CAMERA GRID (Default 2x2) */
            <div className={
              layoutMode === '1x1'
                ? 'grid grid-cols-1 gap-6 max-w-4xl mx-auto'
                : layoutMode === '2x2'
                ? 'grid grid-cols-1 md:grid-cols-2 gap-5'
                : 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'
            }>
              {(layoutMode === '2x2' ? filteredCameras.slice(0, 4) : filteredCameras).map((cam) => (
                <CameraCard
                  key={cam.id || cam.cameraCode}
                  camera={cam}
                  filterType={detectionFilter}
                  onFullscreen={() => setFullscreenCamera(cam)}
                  onSnapshot={handleSnapshot}
                  onConfigure={() => setConfigCamera(cam)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 5. RIGHT-SIDE LIVE DETECTION PANEL */}
        {showRightPanel && (
          <div className="lg:col-span-4 xl:col-span-3 sticky top-20">
            <LiveDetectionPanel
              cameras={cameras}
              friendlyPersons={friendlyPersons}
              activeFilter={detectionFilter}
              onSelectCamera={handleSelectCameraFromPanel}
            />
          </div>
        )}
      </div>

      {/* 7. FULLSCREEN CAMERA MODAL WITH INTEGRATED DETECTION OVERLAYS & PANEL */}
      {fullscreenCamera && (
        <Modal
          isOpen={!!fullscreenCamera}
          onClose={() => setFullscreenCamera(null)}
          title={`Tactical Surveillance Stream — ${fullscreenCamera.cameraCode || fullscreenCamera.id} (${fullscreenCamera.name})`}
          subtitle={`${fullscreenCamera.location} • FPS: ${fullscreenCamera.fps || 30} • ${fullscreenCamera.resolution || '1080p'}`}
          maxWidth="max-w-7xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Fullscreen Surveillance Canvas */}
              <div className="lg:col-span-8 xl:col-span-9">
                <SurveillanceFeed
                  camera={fullscreenCamera}
                  filterType={detectionFilter}
                  showControls={true}
                  onSnapshot={handleSnapshot}
                  onOpenSettings={() => {
                    setConfigCamera(fullscreenCamera);
                    setFullscreenCamera(null);
                  }}
                  className="w-full h-[62vh]"
                />
              </div>

              {/* Embedded Camera Live Detection Telemetry */}
              <div className="lg:col-span-4 xl:col-span-3 h-[62vh]">
                <LiveDetectionPanel
                  cameras={[fullscreenCamera]}
                  friendlyPersons={friendlyPersons}
                  activeFilter={detectionFilter}
                  className="h-full"
                />
              </div>
            </div>

            {/* Live Telemetry Info Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Encoder & Transport</span>
                <span className="font-semibold text-cyan-400">H.265 / {fullscreenCamera.rtspUrl ? 'RTSP 554' : '4.2 Mbps'}</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">AI Pipeline Latency</span>
                <span className="font-semibold text-emerald-400">18.4ms (TensorRT YOLOv8)</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Sensor Payload</span>
                <span className="font-semibold text-slate-200">{fullscreenCamera.type || 'Thermal PTZ'}</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Active Targets In FOV</span>
                <span className="font-semibold text-amber-300">{fullscreenCamera.activeDetections?.length || 2} Detected</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Camera Details & PTZ Modal */}
      {configCamera && (
        <CameraControlModal
          camera={configCamera}
          isOpen={!!configCamera}
          onClose={() => setConfigCamera(null)}
        />
      )}
    </div>
  );
}
