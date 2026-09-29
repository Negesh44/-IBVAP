import React, { useState, useEffect, useRef } from 'react';
import { 
  Maximize2, 
  Camera, 
  Volume2, 
  VolumeX, 
  ZoomIn, 
  ZoomOut, 
  Sliders, 
  Eye, 
  Crosshair, 
  Radio, 
  ShieldAlert, 
  UserCheck, 
  Car, 
  UserX,
  RefreshCw,
  Sun,
  Moon,
  Flame
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatTacticalTime, formatTacticalDate } from '../../utils/formatters';

export default function SurveillanceFeed({
  camera,
  isMainView = false,
  showControls = true,
  onFullscreen,
  onSnapshot,
  onOpenSettings,
  className
}) {
  const [time, setTime] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const [visionMode, setVisionMode] = useState(camera?.thermalMode ? 'thermal' : (camera?.nightVision ? 'night' : 'standard')); // standard | thermal | night
  const [showGrid, setShowGrid] = useState(true);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [snapshotEffect, setSnapshotEffect] = useState(false);
  const feedContainerRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleZoomIn = (e) => {
    e?.stopPropagation();
    setZoomLevel(prev => Math.min(prev + 0.25, 2.5));
  };

  const handleZoomOut = (e) => {
    e?.stopPropagation();
    setZoomLevel(prev => Math.max(prev - 0.25, 1));
  };

  const toggleVisionMode = (e) => {
    e?.stopPropagation();
    setVisionMode(prev => {
      if (prev === 'standard') return 'night';
      if (prev === 'night') return 'thermal';
      return 'standard';
    });
  };

  const takeSnapshot = (e) => {
    e?.stopPropagation();
    setSnapshotEffect(true);
    setTimeout(() => setSnapshotEffect(false), 300);
    if (onSnapshot) {
      onSnapshot(camera);
    }
  };

  const isOffline = camera?.status === 'OFFLINE';
  const isMaintenance = camera?.status === 'MAINTENANCE';

  return (
    <div
      ref={feedContainerRef}
      className={cn(
        "group relative overflow-hidden rounded-xl bg-[#06090e] border border-slate-800 select-none",
        isOffline && "border-red-900/40 opacity-80",
        className
      )}
    >
      {/* Visual Canvas / Background stream container */}
      <div 
        className={cn(
          "relative w-full h-full min-h-[260px] flex items-center justify-center transition-transform duration-200 overflow-hidden",
          visionMode === 'thermal' && "filter hue-rotate-180 contrast-150 brightness-90",
          visionMode === 'night' && "filter contrast-125 brightness-110",
        )}
        style={{ transform: `scale(${zoomLevel})` }}
      >
        {isOffline ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-red-400 bg-red-950/10 w-full h-full">
            <div className="w-12 h-12 rounded-full border border-red-500/30 flex items-center justify-center bg-red-500/10 mb-3 animate-pulse">
              <Radio className="w-6 h-6 text-red-400" />
            </div>
            <p className="font-mono text-sm font-bold tracking-wider uppercase">NO SIGNAL / RTSP STREAM TIMEOUT</p>
            <p className="font-mono text-xs text-slate-400 mt-1">CHECKPOST-CHARLIE RTSP PORT 554 UNREACHABLE</p>
          </div>
        ) : isMaintenance ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-amber-400 bg-amber-950/10 w-full h-full">
            <RefreshCw className="w-8 h-8 text-amber-400 mb-2 animate-spin" />
            <p className="font-mono text-sm font-bold tracking-wider">SENSOR CALIBRATION IN PROGRESS</p>
            <p className="font-mono text-xs text-slate-400 mt-1">Diagnostic Mode — Signal Paused</p>
          </div>
        ) : (
          /* Realistic Surveillance Environment Background Graphic */
          <div className="relative w-full h-full min-h-[280px] bg-gradient-to-b from-[#09111c] via-[#0c1626] to-[#080d17]">
            {/* Mountain & Perimeter Silhouette */}
            <svg className="absolute inset-0 w-full h-full opacity-35" preserveAspectRatio="none" viewBox="0 0 500 300">
              {/* Distant Mountains */}
              <polygon points="0,200 80,120 180,170 300,90 420,160 500,110 500,300 0,300" fill="#13233a" />
              {/* Watchtower Silhouette */}
              <rect x="360" y="70" width="16" height="150" fill="#0f1c2e" />
              <polygon points="350,70 386,70 368,45" fill="#0a1422" />
              {/* Border Wire Fence Line */}
              <line x1="0" y1="230" x2="500" y2="230" stroke="#00e5ff" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
              <line x1="0" y1="245" x2="500" y2="245" stroke="#38bdf8" strokeWidth="0.7" opacity="0.4" />
            </svg>

            {/* Night Vision green tint / Thermal palette overlay */}
            {visionMode === 'night' && (
              <div className="absolute inset-0 bg-emerald-950/35 mix-blend-color-dodge pointer-events-none" />
            )}
            {visionMode === 'thermal' && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 via-purple-900/30 to-amber-600/30 mix-blend-color-dodge pointer-events-none" />
            )}

            {/* Simulated Live Detection Bounding Boxes Overlay */}
            {showBoundingBoxes && camera?.activeDetections && camera.activeDetections.map((det) => {
              const isFriendly = det.category === 'FRIENDLY';
              const isAlert = det.category === 'CRITICAL' || det.type === 'ALERT';
              const isVehicle = det.category === 'VEHICLE';

              const boxStyles = isFriendly
                ? { border: 'border-emerald-400', bg: 'bg-emerald-500/10', text: 'text-emerald-300', tagBg: 'bg-emerald-950/90 text-emerald-300 border-emerald-400' }
                : isAlert
                ? { border: 'border-red-500', bg: 'bg-red-500/20 animate-pulse', text: 'text-red-300', tagBg: 'bg-red-950/95 text-red-300 border-red-500' }
                : isVehicle
                ? { border: 'border-cyan-400', bg: 'bg-cyan-500/10', text: 'text-cyan-300', tagBg: 'bg-cyan-950/90 text-cyan-300 border-cyan-400' }
                : { border: 'border-amber-400', bg: 'bg-amber-500/15', text: 'text-amber-300', tagBg: 'bg-amber-950/90 text-amber-300 border-amber-400' };

              return (
                <div
                  key={det.id}
                  className={cn(
                    "absolute transition-all duration-700 ease-out border-2 pointer-events-none flex flex-col justify-between",
                    boxStyles.border,
                    boxStyles.bg
                  )}
                  style={{
                    left: `${det.bbox.x}%`,
                    top: `${det.bbox.y}%`,
                    width: `${det.bbox.w}%`,
                    height: `${det.bbox.h}%`,
                  }}
                >
                  {/* Corner Crosshairs */}
                  <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-white" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-white" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-white" />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-white" />

                  {/* Detection HUD Label Tag */}
                  <div className={cn(
                    "absolute -top-7 left-0 px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap border shadow-lg flex items-center gap-1",
                    boxStyles.tagBg
                  )}>
                    {isFriendly ? (
                      <UserCheck className="w-3 h-3 text-emerald-400" />
                    ) : isAlert ? (
                      <ShieldAlert className="w-3 h-3 text-red-400 animate-bounce" />
                    ) : isVehicle ? (
                      <Car className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <UserX className="w-3 h-3 text-amber-400" />
                    )}
                    <span>{det.label || det.type}</span>
                    <span className="opacity-80">
                      [{typeof det.confidence === 'number' ? (det.confidence * 100).toFixed(0) : det.confidence}%]
                    </span>
                  </div>

                  {/* Detection ID bottom tag */}
                  <div className="self-end mr-1 mb-1 text-[8px] font-mono text-slate-300 bg-black/75 px-1 rounded">
                    {det.id}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CCTV Scanline & Vignette Overlays */}
      <div className="cctv-scanline absolute inset-0 pointer-events-none opacity-20" />
      <div className="cctv-vignette absolute inset-0 pointer-events-none" />

      {/* Snapshot Flash Animation */}
      {snapshotEffect && (
        <div className="absolute inset-0 bg-white opacity-80 pointer-events-none animate-ping" />
      )}

      {/* Top Left HUD: Camera info, sector, & coordinates */}
      <div className="absolute top-3 left-3 pointer-events-none z-10 flex flex-col gap-0.5 font-mono text-[11px] text-slate-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 bg-black/70 border border-slate-700 rounded font-bold text-cyan-400">
            {camera?.id || 'CAM-01'}
          </span>
          <span className="font-semibold text-white tracking-wide">
            {camera?.name || 'Surveillance Feed'}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
          <span>{camera?.location || 'Sector Perimeter'}</span>
          <span>•</span>
          <span>{camera?.coordinates || '34.0837° N, 74.7973° E'}</span>
        </div>
      </div>

      {/* Top Right HUD: Live indicator, FPS, and Military Timestamp */}
      <div className="absolute top-3 right-3 pointer-events-none z-10 flex flex-col items-end gap-0.5 font-mono text-[11px] text-slate-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-2">
          {!isOffline && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-600/80 text-white font-bold text-[10px] animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              LIVE
            </span>
          )}
          <span className="px-1.5 py-0.5 bg-black/70 border border-slate-800 rounded text-cyan-300 text-[10px]">
            {camera?.fps || 30} FPS
          </span>
          <span className="px-1.5 py-0.5 bg-black/70 border border-slate-800 rounded text-slate-300 text-[10px]">
            {camera?.resolution?.split(' ')[0] || '1080p'}
          </span>
        </div>
        <div className="text-cyan-400 font-bold text-xs mt-1 bg-black/60 px-1.5 py-0.5 rounded border border-cyan-500/20">
          {formatTacticalDate(time)} {formatTacticalTime(time)}
        </div>
      </div>

      {/* Bottom Left HUD: Stream Quality, AI Model Status, & Latency */}
      <div className="absolute bottom-3 left-3 pointer-events-none z-10 hidden sm:flex items-center gap-2 font-mono text-[10px] text-slate-300">
        <span className="px-2 py-0.5 rounded bg-black/70 border border-slate-800 text-slate-300">
          MODE: {visionMode.toUpperCase()}
        </span>
        <span className="px-2 py-0.5 rounded bg-black/70 border border-slate-800 text-emerald-400 flex items-center gap-1">
          <Crosshair className="w-3 h-3" />
          YOLOv8 + ByteTrack (18ms)
        </span>
      </div>

      {/* Bottom Right Floating Tactical Controls (Hover or Permanent) */}
      {showControls && (
        <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-command-950/90 p-1.5 rounded-lg border border-slate-700/80 backdrop-blur-md opacity-90 group-hover:opacity-100 transition-opacity">
          {/* Vision mode switcher */}
          <button
            onClick={toggleVisionMode}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
            title={`Toggle Vision Mode (Current: ${visionMode})`}
          >
            {visionMode === 'thermal' ? (
              <Flame className="w-4 h-4 text-amber-400" />
            ) : visionMode === 'night' ? (
              <Moon className="w-4 h-4 text-emerald-400" />
            ) : (
              <Sun className="w-4 h-4 text-slate-300" />
            )}
          </button>

          {/* Toggle Bounding Boxes */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowBoundingBoxes(prev => !prev);
            }}
            className={cn(
              "p-1.5 rounded hover:bg-slate-800 transition-colors",
              showBoundingBoxes ? "text-cyan-400" : "text-slate-500"
            )}
            title="Toggle AI Bounding Boxes"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* Zoom Controls */}
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Snapshot Button */}
          <button
            onClick={takeSnapshot}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition-colors"
            title="Capture Forensic Snapshot"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Audio Mute/Unmute */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(prev => !prev);
            }}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Camera Settings */}
          {onOpenSettings && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSettings(camera);
              }}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
              title="Camera Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          )}

          {/* Fullscreen */}
          {onFullscreen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFullscreen(camera);
              }}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
              title="Maximize Stream"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
