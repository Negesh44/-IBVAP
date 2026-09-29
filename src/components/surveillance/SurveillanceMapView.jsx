import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, 
  Radio, 
  Eye, 
  Sliders, 
  Layers, 
  Maximize2, 
  Activity, 
  Compass, 
  ShieldCheck, 
  X,
  Camera
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import SurveillanceFeed from './SurveillanceFeed';
import { cn } from '../../utils/cn';

// Mock fictional tactical map coordinates (X, Y percentage within virtual border zone)
const DEFAULT_COORDINATES = [
  { id: 'BOP-001', x: 28, y: 32, sector: 'Sector Alpha', label: 'North Watchpost Alpha' },
  { id: 'BOP-002', x: 68, y: 26, sector: 'Sector Bravo', label: 'East Ridge Outpost' },
  { id: 'BOP-003', x: 48, y: 55, sector: 'Sector Charlie', label: 'Central Buffer Checkpost' },
  { id: 'BOP-004', x: 18, y: 72, sector: 'Sector Delta', label: 'West Riverbed Gate' },
  { id: 'BOP-005', x: 78, y: 68, sector: 'Sector Echo', label: 'South Perimeter Track' },
  { id: 'BOP-006', x: 52, y: 82, sector: 'Sector Foxtrot', label: 'Checkpost Charlie Entry' }
];

export default function SurveillanceMapView({
  cameras = [],
  onSelectCamera,
  onFullscreenCamera,
  className
}) {
  const [selectedPin, setSelectedPin] = useState(null);
  const [mapLayer, setMapLayer] = useState('TACTICAL'); // 'TACTICAL' | 'RADAR' | 'GRID'

  // Map cameras with mock coordinates
  const mappedCameras = (cameras || []).map((cam, idx) => {
    const code = cam?.cameraCode || cam?.id || `BOP-00${idx + 1}`;
    const coord = DEFAULT_COORDINATES.find(c => c.id === code) || DEFAULT_COORDINATES[idx % DEFAULT_COORDINATES.length];
    return {
      ...cam,
      mapX: coord?.x || (25 + (idx * 20) % 60),
      mapY: coord?.y || (30 + (idx * 15) % 50),
      sectorTag: coord?.sector || 'Sector Alpha',
      mockLocationLabel: coord?.label || cam?.location || 'Watchpost'
    };
  });

  return (
    <div className={cn(
      "relative w-full h-[620px] rounded-2xl bg-[#06090e] border border-slate-800 overflow-hidden select-none flex flex-col justify-between",
      className
    )}>
      {/* Top Map HUD Bar */}
      <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between gap-3 p-3 rounded-xl bg-command-950/90 border border-slate-800/80 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Compass className="w-5 h-5 animate-spin" style={{ animationDuration: '30s' }} />
          </div>
          <div>
            <h3 className="font-mono font-bold text-white text-xs tracking-wider flex items-center gap-2">
              <span>TACTICAL SURVEILLANCE GEOSPATIAL MAP</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                DEMO COORDINATES
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              Fictional Operational Border Perimeter • Grid Sector Alpha-Foxtrot
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-slate-300 bg-command-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-emerald-500/30" />
            <span>Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-500/30" />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 ring-2 ring-red-500/30" />
            <span>Offline</span>
          </div>
        </div>
      </div>

      {/* Main Interactive Map Canvas */}
      <div className="relative w-full h-full min-h-[500px] overflow-hidden bg-gradient-to-b from-[#080d15] via-[#09121d] to-[#070b12]">
        {/* Tactical Military Gridlines */}
        <svg className="absolute inset-0 w-full h-full opacity-35" width="100%" height="100%">
          <defs>
            <pattern id="tacticalGrid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#1e293b" strokeWidth="0.8" />
              <circle cx="60" cy="60" r="1.5" fill="#00e5ff" opacity="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#tacticalGrid)" />

          {/* Fictional Border Demarcation Line */}
          <path 
            d="M 50 120 Q 250 80, 450 180 T 850 260 T 1200 220" 
            fill="none" 
            stroke="#ff334b" 
            strokeWidth="2" 
            strokeDasharray="6 4" 
            opacity="0.75"
          />

          {/* Buffer Corridor Zone */}
          <path 
            d="M 50 160 Q 250 120, 450 220 T 850 300 T 1200 260" 
            fill="none" 
            stroke="#00e5ff" 
            strokeWidth="1.5" 
            strokeDasharray="8 6" 
            opacity="0.45"
          />

          {/* Radar Circles */}
          <circle cx="50%" cy="50%" r="180" fill="none" stroke="#00e5ff" strokeWidth="0.8" opacity="0.15" />
          <circle cx="50%" cy="50%" r="300" fill="none" stroke="#00e5ff" strokeWidth="0.6" opacity="0.1" />
        </svg>

        {/* Radar Sweep Animation */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none opacity-20"
          style={{
            background: 'conic-gradient(from 0deg, transparent 70%, rgba(0, 229, 255, 0.4) 100%)',
            animation: 'spin 12s linear infinite'
          }}
        />

        {/* Sector Labels Overlay */}
        <div className="absolute top-20 left-10 text-[10px] font-mono text-cyan-400/50 uppercase tracking-widest pointer-events-none">
          SECTOR ALPHA • NORTH PERIMETER
        </div>
        <div className="absolute top-24 right-16 text-[10px] font-mono text-cyan-400/50 uppercase tracking-widest pointer-events-none">
          SECTOR BRAVO • EAST RIDGE
        </div>
        <div className="absolute bottom-16 left-12 text-[10px] font-mono text-cyan-400/50 uppercase tracking-widest pointer-events-none">
          SECTOR DELTA • RIVERBED
        </div>
        <div className="absolute bottom-12 right-20 text-[10px] font-mono text-cyan-400/50 uppercase tracking-widest pointer-events-none">
          SECTOR FOXTROT • ENTRY CORRIDOR
        </div>

        {/* Camera Map Markers */}
        {mappedCameras.map((cam) => {
          const isOnline = cam.status === 'ONLINE';
          const isWarning = cam.status === 'WARNING';
          const isOffline = cam.status === 'OFFLINE';
          const isSelected = selectedPin?.id === cam.id;

          // Marker color classes:
          // Green = online
          // Yellow = warning
          // Red = offline
          let pinColor = 'bg-emerald-500 border-emerald-300 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.7)]';
          let ringColor = 'bg-emerald-500/30';
          let badgeStatus = 'ONLINE';

          if (isWarning) {
            pinColor = 'bg-amber-500 border-amber-300 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.7)]';
            ringColor = 'bg-amber-500/30';
            badgeStatus = 'WARNING';
          } else if (isOffline) {
            pinColor = 'bg-red-500 border-red-300 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.7)]';
            ringColor = 'bg-red-500/30';
            badgeStatus = 'OFFLINE';
          }

          return (
            <div
              key={cam.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group"
              style={{ left: `${cam.mapX}%`, top: `${cam.mapY}%` }}
              onClick={() => setSelectedPin(cam)}
            >
              {/* Radar pulse ring */}
              {isOnline && (
                <div className={cn("absolute -inset-2 rounded-full animate-ping opacity-60", ringColor)} />
              )}

              {/* Pin Icon Bubble */}
              <div className={cn(
                "relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-transform duration-200 group-hover:scale-125 shadow-lg",
                pinColor,
                isSelected && "scale-125 ring-4 ring-cyan-400"
              )}>
                <Camera className="w-4 h-4 text-black font-bold" />
              </div>

              {/* Floating Camera Code Tag */}
              <div className="absolute top-9 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 border border-slate-700 text-[10px] font-mono font-bold text-white whitespace-nowrap group-hover:border-cyan-400 shadow-md">
                {cam.cameraCode || cam.id}
              </div>
            </div>
          );
        })}

        {/* Selected Camera Details Card Popup Modal/Flyout */}
        <AnimatePresence>
          {selectedPin && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="absolute bottom-4 right-4 z-30 w-full max-w-sm rounded-2xl bg-command-900/95 border border-cyan-500/40 p-4 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    {selectedPin.cameraCode || selectedPin.id}
                  </span>
                  <h4 className="font-bold text-white text-sm mt-1">{selectedPin.name}</h4>
                  <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    <span>{selectedPin.mockLocationLabel || selectedPin.location}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPin(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Feed Preview */}
              <div className="mt-3 rounded-xl overflow-hidden border border-slate-800 h-36">
                <SurveillanceFeed
                  camera={selectedPin}
                  showControls={false}
                  className="h-full"
                />
              </div>

              {/* Telemetry Metrics */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-mono py-2 px-2 bg-command-950 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase">Status</span>
                  <span className={cn(
                    "font-bold text-[11px]",
                    selectedPin.status === 'ONLINE' ? 'text-emerald-400' : selectedPin.status === 'WARNING' ? 'text-amber-400' : 'text-red-400'
                  )}>
                    {selectedPin.status}
                  </span>
                </div>
                <div className="border-x border-slate-800">
                  <span className="text-[9px] text-slate-500 block uppercase">FPS / Res</span>
                  <span className="font-bold text-cyan-300 text-[11px]">
                    {selectedPin.fps || 30} FPS
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase">In-Frame AI</span>
                  <span className="font-bold text-slate-200 text-[11px]">
                    {selectedPin.activeDetections?.length || 0} Targets
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-3 flex items-center gap-2">
                {onFullscreenCamera && (
                  <button
                    onClick={() => onFullscreenCamera(selectedPin)}
                    className="flex-1 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-colors shadow-glow-cyan"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Open Camera Fullscreen
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
