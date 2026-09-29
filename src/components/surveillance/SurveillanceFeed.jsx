import React, { useState, useEffect, useRef } from 'react';
import { 
  Maximize2, 
  Camera, 
  Volume2, 
  VolumeX, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Sliders, 
  Eye, 
  Crosshair, 
  Radio, 
  ShieldAlert, 
  UserCheck, 
  Car, 
  UserX,
  User,
  Play,
  Pause,
  AlertTriangle,
  Sun,
  Moon,
  Flame,
  Info
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatTacticalTime, formatTacticalDate } from '../../utils/formatters';

export default function SurveillanceFeed({
  camera,
  isMainView = false,
  showControls = true,
  filterType = 'ALL', // 'ALL' | 'PEOPLE' | 'VEHICLES' | 'FRIENDLY' | 'UNKNOWN' | 'ALERTS'
  onFullscreen,
  onSnapshot,
  onOpenSettings,
  className
}) {
  const [time, setTime] = useState(new Date());
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [visionMode, setVisionMode] = useState(camera?.thermalMode ? 'thermal' : (camera?.nightVision ? 'night' : 'standard'));
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [snapshotEffect, setSnapshotEffect] = useState(false);
  const feedContainerRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isPaused) {
        setTime(new Date());
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused]);

  const handleZoomIn = (e) => {
    e?.stopPropagation();
    setZoomLevel(prev => Math.min(prev + 0.25, 2.5));
  };

  const handleZoomOut = (e) => {
    e?.stopPropagation();
    setZoomLevel(prev => Math.max(prev - 0.25, 1));
  };

  const handleZoomReset = (e) => {
    e?.stopPropagation();
    setZoomLevel(1);
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
    setTimeout(() => setSnapshotEffect(false), 350);
    if (onSnapshot) {
      onSnapshot(camera);
    }
  };

  const togglePause = (e) => {
    e?.stopPropagation();
    setIsPaused(prev => !prev);
  };

  const isOffline = camera?.status === 'OFFLINE';
  const isWarning = camera?.status === 'WARNING';
  const cameraCode = camera?.cameraCode || camera?.id || 'BOP-001';
  const detections = camera?.activeDetections || [];

  // Filter detections based on active filter
  const visibleDetections = detections.filter(det => {
    if (filterType === 'ALL') return true;
    
    const objType = (det.object_type || det.type || '').toLowerCase();
    const category = (det.category || '').toLowerCase();
    const isFriendly = det.friendly || objType === 'friendly' || category === 'friendly';
    const isUnknown = objType === 'unknown' || category === 'unknown';
    const isVehicle = objType === 'vehicle' || category === 'vehicle';
    const isAlert = objType.includes('alert') || objType.includes('event') || category === 'critical' || det.type === 'ALERT';
    const isPerson = !isVehicle && !isAlert;

    if (filterType === 'PEOPLE') return isPerson && !isFriendly;
    if (filterType === 'VEHICLES') return isVehicle;
    if (filterType === 'FRIENDLY') return isFriendly;
    if (filterType === 'UNKNOWN') return isUnknown;
    if (filterType === 'ALERTS') return isAlert;
    return true;
  });

  return (
    <div
      ref={feedContainerRef}
      className={cn(
        "group relative overflow-hidden rounded-xl bg-[#06090e] border border-slate-800/90 select-none",
        isOffline && "border-red-900/40 opacity-80",
        isWarning && "border-amber-500/40",
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
          <div className="flex flex-col items-center justify-center p-8 text-center text-red-400 bg-red-950/20 w-full h-full min-h-[260px]">
            <div className="w-12 h-12 rounded-full border border-red-500/30 flex items-center justify-center bg-red-500/10 mb-3 animate-pulse">
              <Radio className="w-6 h-6 text-red-400" />
            </div>
            <p className="font-mono text-xs sm:text-sm font-bold tracking-wider uppercase">NO SIGNAL / RTSP STREAM OFFLINE</p>
            <p className="font-mono text-[11px] text-slate-400 mt-1">{cameraCode} • PORT 554 TIMEOUT</p>
          </div>
        ) : (
          /* Realistic Surveillance Environment Background Graphic */
          <div className="relative w-full h-full min-h-[260px] bg-gradient-to-b from-[#09111c] via-[#0b1625] to-[#070c14]">
            {/* Tactical Vector Horizon & Perimeter Wire SVG */}
            <svg className="absolute inset-0 w-full h-full opacity-40" preserveAspectRatio="none" viewBox="0 0 500 300">
              {/* Distant Hills */}
              <polygon points="0,210 75,130 170,175 290,95 410,165 500,120 500,300 0,300" fill="#13233a" />
              {/* Watchtower Silhouette */}
              <rect x="360" y="80" width="14" height="140" fill="#0f1c2e" />
              <polygon points="352,80 382,80 367,55" fill="#0a1422" />
              {/* Light Post */}
              <line x1="120" y1="180" x2="120" y2="240" stroke="#1b324b" strokeWidth="2" />
              <circle cx="120" cy="180" r="3" fill="#00e5ff" opacity="0.7" />
              {/* Border Wire Fence Line */}
              <line x1="0" y1="230" x2="500" y2="230" stroke="#00e5ff" strokeWidth="1" strokeDasharray="5 5" opacity="0.6" />
              <line x1="0" y1="245" x2="500" y2="245" stroke="#38bdf8" strokeWidth="0.8" opacity="0.4" />
            </svg>

            {/* Subtle Animated AI Scan Processing Line */}
            {!isPaused && (
              <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-40 animate-pulse pointer-events-none"
                style={{
                  animation: 'cctvScan 6s ease-in-out infinite alternate'
                }}
              />
            )}

            {/* Night Vision green tint / Thermal palette overlay */}
            {visionMode === 'night' && (
              <div className="absolute inset-0 bg-emerald-950/35 mix-blend-color-dodge pointer-events-none" />
            )}
            {visionMode === 'thermal' && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 via-purple-900/30 to-amber-600/30 mix-blend-color-dodge pointer-events-none" />
            )}

            {/* Live Bounding Boxes Overlay with Strict Color Code & Friendly Badges */}
            {showBoundingBoxes && visibleDetections.map((det, idx) => {
              // Extract detection properties supporting both legacy & FastAPI formats
              const objType = (det.object_type || det.type || 'person').toLowerCase();
              const isFriendly = det.friendly || objType === 'friendly' || det.category === 'FRIENDLY';
              const isVehicle = objType === 'vehicle' || det.category === 'VEHICLE';
              const isAlert = objType.includes('event') || objType.includes('alert') || det.category === 'CRITICAL' || det.type === 'ALERT';
              const isUnknown = !isFriendly && !isVehicle && !isAlert && (objType === 'unknown' || det.category === 'UNKNOWN' || det.unknown);
              const isNormalPerson = !isFriendly && !isVehicle && !isAlert && !isUnknown;

              // Normalized coordinates
              const bboxX = typeof det.bbox?.x === 'number' ? det.bbox.x : (Array.isArray(det.bbox) ? det.bbox[0] : 20 + idx * 25);
              const bboxY = typeof det.bbox?.y === 'number' ? det.bbox.y : (Array.isArray(det.bbox) ? det.bbox[1] : 30 + idx * 10);
              const bboxW = typeof det.bbox?.w === 'number' ? det.bbox.w : (Array.isArray(det.bbox) ? det.bbox[2] : (isVehicle ? 28 : 18));
              const bboxH = typeof det.bbox?.h === 'number' ? det.bbox.h : (Array.isArray(det.bbox) ? det.bbox[3] : (isVehicle ? 30 : 42));

              const confidenceNum = typeof det.confidence === 'number' 
                ? (det.confidence <= 1 ? Math.round(det.confidence * 100) : Math.round(det.confidence))
                : parseInt(det.confidence, 10) || 95;

              const trackId = det.track_id || det.trackId || det.id || `P-${100 + idx}`;
              const personCode = det.person_id || det.personCode || 'BSF-1024';
              const identityName = det.identity || det.name || det.label || 'Arun Kumar';

              // Color styles per specification:
              // Normal person: Blue (#00b0ff)
              // Vehicle: Cyan (#00e5ff)
              // Friendly person: Green (#00e676)
              // Unknown person: Yellow (#ffb300) - Note: Unknown must NOT automatically be treated as a threat.
              // Security event: Red (#ff334b)
              let borderClass = 'border-blue-500';
              let bgClass = 'bg-blue-500/10 shadow-[0_0_12px_rgba(0,176,255,0.25)]';
              let tagBgClass = 'bg-blue-950/95 border-blue-500 text-blue-300';
              let labelHeader = 'PERSON';

              if (isFriendly) {
                borderClass = 'border-emerald-500';
                bgClass = 'bg-emerald-500/10 shadow-[0_0_15px_rgba(0,230,118,0.3)]';
                tagBgClass = 'bg-emerald-950/95 border-emerald-500 text-emerald-300';
                labelHeader = 'FRIENDLY';
              } else if (isVehicle) {
                borderClass = 'border-cyan-400';
                bgClass = 'bg-cyan-500/10 shadow-[0_0_12px_rgba(0,229,255,0.25)]';
                tagBgClass = 'bg-cyan-950/95 border-cyan-400 text-cyan-300';
                labelHeader = 'VEHICLE';
              } else if (isUnknown) {
                borderClass = 'border-amber-400';
                bgClass = 'bg-amber-500/10 shadow-[0_0_12px_rgba(255,179,0,0.25)]';
                tagBgClass = 'bg-amber-950/95 border-amber-400 text-amber-300';
                labelHeader = 'UNKNOWN PERSON';
              } else if (isAlert) {
                borderClass = 'border-red-500';
                bgClass = 'bg-red-500/20 shadow-[0_0_18px_rgba(255,51,75,0.4)] animate-pulse';
                tagBgClass = 'bg-red-950/95 border-red-500 text-red-300';
                labelHeader = 'SECURITY EVENT';
              }

              return (
                <div
                  key={trackId + idx}
                  className={cn(
                    "absolute transition-all duration-700 ease-out border-2 pointer-events-none flex flex-col justify-between",
                    borderClass,
                    bgClass
                  )}
                  style={{
                    left: `${bboxX}%`,
                    top: `${bboxY}%`,
                    width: `${bboxW}%`,
                    height: `${bboxH}%`,
                  }}
                >
                  {/* Corner Reticles */}
                  <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-white" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-white" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-white" />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-white" />

                  {/* Detection Card Badge */}
                  {isFriendly ? (
                    /* 4. FRIENDLY PERSON STRUCTURED BOX */
                    <div className="absolute -top-16 left-0 min-w-[130px] p-1.5 rounded bg-[#061e14]/95 border border-emerald-500 shadow-xl font-mono text-[10px] leading-tight text-emerald-300 pointer-events-none backdrop-blur-md">
                      <div className="font-bold flex items-center gap-1 text-emerald-400">
                        <span>✓ FRIENDLY</span>
                      </div>
                      <div className="text-white font-semibold text-[11px] truncate">{identityName}</div>
                      <div className="text-emerald-300/90 text-[10px]">{personCode}</div>
                      <div className="text-emerald-400 font-bold text-[10px] mt-0.5">Confidence: {confidenceNum}%</div>
                    </div>
                  ) : (
                    /* STANDARD / VEHICLE / UNKNOWN / EVENT STRUCTURED TAG */
                    <div className={cn(
                      "absolute -top-11 left-0 min-w-[100px] px-2 py-1 rounded text-[10px] font-mono leading-tight whitespace-nowrap border shadow-lg",
                      tagBgClass
                    )}>
                      <div className="font-bold tracking-wider">{labelHeader}</div>
                      <div className="text-slate-200 text-[9px] flex items-center justify-between gap-2">
                        <span>ID: {trackId}</span>
                        <span className="font-bold">{confidenceNum}%</span>
                      </div>
                    </div>
                  )}

                  {/* Micro Track ID footer */}
                  <div className="self-end mr-1 mb-1 text-[8px] font-mono text-slate-300 bg-black/80 px-1 rounded">
                    {trackId}
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
        <div className="absolute inset-0 bg-white opacity-80 pointer-events-none animate-ping z-30" />
      )}

      {/* Top Left HUD: Camera info, code, and location */}
      <div className="absolute top-2.5 left-2.5 pointer-events-none z-10 flex flex-col gap-0.5 font-mono text-[11px] text-slate-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="px-1.5 py-0.5 bg-black/80 border border-slate-700 rounded font-bold text-cyan-400">
            {cameraCode}
          </span>
          <span className="font-semibold text-white tracking-wide truncate max-w-[180px]">
            {camera?.name || 'Border Post Feed'}
          </span>
        </div>
        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
          <span>{camera?.location || 'Sector Perimeter'}</span>
        </div>
      </div>

      {/* Top Right HUD: Live indicator, FPS, Resolution, and Tactical Clock */}
      <div className="absolute top-2.5 right-2.5 pointer-events-none z-10 flex flex-col items-end gap-1 font-mono text-[11px] text-slate-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-1.5">
          {!isOffline && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600/90 text-white font-bold text-[9px] tracking-wider animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              LIVE
            </span>
          )}
          <span className="px-1.5 py-0.5 bg-black/80 border border-slate-800 rounded text-cyan-300 text-[10px]">
            {camera?.fps || 30} FPS
          </span>
          <span className="px-1.5 py-0.5 bg-black/80 border border-slate-800 rounded text-slate-300 text-[10px]">
            {camera?.resolution?.split(' ')[0] || '1080p'}
          </span>
        </div>
        <div className="text-cyan-400 font-bold text-xs bg-black/75 px-1.5 py-0.5 rounded border border-cyan-500/20">
          {formatTacticalDate(time)} {formatTacticalTime(time)}
        </div>
      </div>

      {/* Bottom Left HUD: Vision Mode, AI Engine, Latency */}
      <div className="absolute bottom-2.5 left-2.5 pointer-events-none z-10 hidden sm:flex items-center gap-2 font-mono text-[10px] text-slate-300">
        <span className="px-1.5 py-0.5 rounded bg-black/80 border border-slate-800 text-slate-300">
          {visionMode.toUpperCase()}
        </span>
        <span className="px-1.5 py-0.5 rounded bg-black/80 border border-slate-800 text-emerald-400 flex items-center gap-1">
          <Crosshair className="w-3 h-3 text-cyan-400" />
          YOLOv8 • {visibleDetections.length} In-Frame
        </span>
      </div>

      {/* Floating Tactical Controls Toolbar */}
      {showControls && (
        <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1 bg-command-950/95 p-1 rounded-lg border border-slate-700/80 backdrop-blur-md opacity-90 group-hover:opacity-100 transition-opacity">
          {/* Pause / Play simulation */}
          <button
            onClick={togglePause}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
            title={isPaused ? "Resume AI Simulation" : "Pause AI Simulation"}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Toggle Vision Mode */}
          <button
            onClick={toggleVisionMode}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
            title={`Vision Mode (${visionMode})`}
          >
            {visionMode === 'thermal' ? (
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            ) : visionMode === 'night' ? (
              <Moon className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-slate-300" />
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
            <Crosshair className="w-3.5 h-3.5" />
          </button>

          {/* Zoom In */}
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Reset */}
          {zoomLevel > 1 && (
            <button
              onClick={handleZoomReset}
              className="p-1.5 rounded hover:bg-slate-800 text-amber-300 hover:text-white transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Snapshot */}
          <button
            onClick={takeSnapshot}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-emerald-400 transition-colors"
            title="Capture Snapshot"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>

          {/* Mute / Unmute */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(prev => !prev);
            }}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title={isMuted ? "Unmute Audio" : "Mute Audio"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-500" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>

          {/* Camera Settings / Details */}
          {onOpenSettings && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSettings(camera);
              }}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-400 transition-colors"
              title="Camera Telemetry & Details"
            >
              <Sliders className="w-3.5 h-3.5" />
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
              title="Fullscreen Stream"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
