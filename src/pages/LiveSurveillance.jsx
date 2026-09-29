import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
  Zap
} from 'lucide-react';
import CameraCard from '../components/surveillance/CameraCard';
import SurveillanceFeed from '../components/surveillance/SurveillanceFeed';
import CameraControlModal from '../components/surveillance/CameraControlModal';
import Modal from '../components/common/Modal';
import { useSurveillance } from '../contexts/SurveillanceContext';

export default function LiveSurveillance() {
  const { cameras, triggerSimulatedAlert } = useSurveillance();
  const [layoutMode, setLayoutMode] = useState('2x2'); // '1x1' | '2x2' | '3x2'
  const [filterSector, setFilterSector] = useState('ALL');
  const [fullscreenCamera, setFullscreenCamera] = useState(null);
  const [configCamera, setConfigCamera] = useState(null);
  const [snapshotSuccessToast, setSnapshotSuccessToast] = useState('');

  const filteredCameras = cameras.filter(cam => {
    if (filterSector === 'ALL') return true;
    return cam.sector?.toUpperCase() === filterSector;
  });

  const handleSnapshot = (cam) => {
    setSnapshotSuccessToast(`Captured high-res frame from ${cam.name}. Saved to Evidence Vault.`);
    setTimeout(() => setSnapshotSuccessToast(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Matrix Switcher Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-command-900/80 border border-slate-800 backdrop-blur-xl">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white font-mono tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            CCTV Live Surveillance Matrix
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-Time AI Multi-Camera Surveillance Stream with Spatial Bounding Boxes
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Sector Filter */}
          <div className="flex items-center gap-1 bg-command-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            <Filter className="w-3.5 h-3.5 text-slate-500 ml-2" />
            {['ALL', 'NORTH', 'EAST', 'WEST', 'SOUTH'].map(sec => (
              <button
                key={sec}
                onClick={() => setFilterSector(sec)}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  filterSector === sec
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sec}
              </button>
            ))}
          </div>

          {/* Grid Layout Switcher */}
          <div className="flex items-center gap-1 bg-command-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setLayoutMode('1x1')}
              className={`p-1.5 rounded-lg transition-colors ${
                layoutMode === '1x1' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="1x1 Single Focus"
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode('2x2')}
              className={`p-1.5 rounded-lg transition-colors ${
                layoutMode === '2x2' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="2x2 4-Channel Matrix"
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode('3x2')}
              className={`p-1.5 rounded-lg transition-colors ${
                layoutMode === '3x2' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="3x2 6-Channel Grid"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Simulation Trigger */}
          <button
            onClick={() => triggerSimulatedAlert('Virtual Fence Breach')}
            className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-glow-red"
          >
            <Zap className="w-3.5 h-3.5 text-red-400 animate-bounce" />
            Test Fence Breach
          </button>
        </div>
      </div>

      {/* Snapshot Toast notification */}
      {snapshotSuccessToast && (
        <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center justify-between shadow-glow-green animate-pulse">
          <span className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-400" />
            {snapshotSuccessToast}
          </span>
          <span className="text-[10px] text-emerald-400 uppercase font-bold">Encrypted Artifact Created</span>
        </div>
      )}

      {/* Camera Grid Layouts */}
      <div className={
        layoutMode === '1x1'
          ? 'grid grid-cols-1 gap-6 max-w-5xl mx-auto'
          : layoutMode === '2x2'
          ? 'grid grid-cols-1 md:grid-cols-2 gap-6'
          : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
      }>
        {(layoutMode === '2x2' ? filteredCameras.slice(0, 4) : filteredCameras).map((cam) => (
          <CameraCard
            key={cam.id}
            camera={cam}
            onFullscreen={() => setFullscreenCamera(cam)}
            onSnapshot={handleSnapshot}
            onConfigure={() => setConfigCamera(cam)}
          />
        ))}
      </div>

      {/* Fullscreen Video Modal */}
      {fullscreenCamera && (
        <Modal
          isOpen={!!fullscreenCamera}
          onClose={() => setFullscreenCamera(null)}
          title={`Tactical Surveillance Stream — ${fullscreenCamera.id} (${fullscreenCamera.name})`}
          subtitle={`${fullscreenCamera.location} • Sector ${fullscreenCamera.sector} • ${fullscreenCamera.coordinates}`}
          maxWidth="max-w-6xl"
        >
          <div className="space-y-4">
            <SurveillanceFeed
              camera={fullscreenCamera}
              showControls={true}
              onSnapshot={handleSnapshot}
              onOpenSettings={() => {
                setConfigCamera(fullscreenCamera);
                setFullscreenCamera(null);
              }}
              className="w-full h-[65vh]"
            />

            {/* Live Telemetry Info Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">ENCODER & BITRATE</span>
                <span className="font-semibold text-cyan-400">H.265 / {fullscreenCamera.bitrate || '4.2 Mbps'}</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">AI MODEL LATENCY</span>
                <span className="font-semibold text-emerald-400">18.4ms (TensorRT YOLOv8)</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">SENSOR PAYLOAD</span>
                <span className="font-semibold text-slate-200">{fullscreenCamera.type}</span>
              </div>
              <div className="p-3 rounded-xl bg-command-950 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">TRACKER IDENTITIES</span>
                <span className="font-semibold text-amber-300">{fullscreenCamera.activeDetections?.length || 0} active in FOV</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* PTZ & Config Modal */}
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
