import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Radio, Eye, Sliders, MapPin, Zap, AlertTriangle, Clock, Layers } from 'lucide-react';
import SurveillanceFeed from './SurveillanceFeed';
import StatusBadge from '../common/StatusBadge';
import { cn } from '../../utils/cn';
import { formatTacticalTime } from '../../utils/formatters';

export default function CameraCard({
  camera,
  isSelected,
  filterType = 'ALL',
  onSelect,
  onFullscreen,
  onSnapshot,
  onConfigure,
  className
}) {
  const [clockTime, setClockTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setClockTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isOnline = camera?.status === 'ONLINE';
  const hasBreach = camera?.activeDetections?.some(d => 
    d.category === 'CRITICAL' || d.type === 'ALERT' || (d.object_type || '').includes('event') || (d.object_type || '').includes('alert')
  );
  const cameraCode = camera?.cameraCode || camera?.id || 'BOP-001';
  const detectionCount = camera?.activeDetections?.length || 0;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={() => onSelect && onSelect(camera)}
      className={cn(
        "flex flex-col rounded-2xl bg-command-900/90 border transition-all overflow-hidden backdrop-blur-xl",
        isSelected 
          ? "border-cyan-400 ring-2 ring-cyan-400/20 shadow-[0_0_25px_-5px_rgba(0,229,255,0.3)]" 
          : hasBreach 
          ? "border-red-500/70 shadow-[0_0_20px_-5px_rgba(255,51,75,0.35)]"
          : "border-slate-800 hover:border-slate-700",
        className
      )}
    >
      {/* Video Feed Area */}
      <div className="relative">
        <SurveillanceFeed
          camera={camera}
          filterType={filterType}
          onFullscreen={onFullscreen}
          onSnapshot={onSnapshot}
          onOpenSettings={onConfigure}
          className="rounded-t-2xl rounded-b-none border-0"
        />

        {/* Live Breach Warning banner overlay if alert active */}
        {hasBreach && (
          <div className="absolute top-2 inset-x-2 py-1 px-3 bg-red-600/95 text-white text-[11px] font-mono font-bold flex items-center justify-between rounded shadow-lg animate-pulse z-20">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              SECURITY BREACH DETECTED
            </span>
            <span className="text-[10px] uppercase">Zone Alarm</span>
          </div>
        )}
      </div>

      {/* Card Info Details Footer */}
      <div className="p-3.5 flex-1 flex flex-col justify-between bg-command-950/80 border-t border-slate-800/80">
        <div>
          {/* Header row: Code, Name, and Status */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-semibold text-slate-100 text-xs sm:text-sm flex items-center gap-1.5 truncate">
                <span className="text-cyan-400 font-mono font-bold text-xs bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                  {cameraCode}
                </span>
                <span className="truncate text-white">{camera.name}</span>
              </h4>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-1 font-mono">
                <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate">{camera.location || 'Border Zone'}</span>
              </p>
            </div>
            <StatusBadge status={camera.status} pulse={isOnline} />
          </div>

          {/* Telemetry Metrics Row: FPS, Res, Detections, Current Time */}
          <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center text-xs font-mono py-1.5 px-2 rounded-xl bg-command-900/90 border border-slate-800/90">
            <div>
              <span className="text-[9px] text-slate-500 block uppercase">FPS</span>
              <span className="font-bold text-cyan-300 text-[11px]">{camera.fps || 30}</span>
            </div>
            <div className="border-l border-slate-800/80">
              <span className="text-[9px] text-slate-500 block uppercase">Res</span>
              <span className="font-bold text-slate-200 text-[11px]">
                {camera.resolution?.includes('4K') ? '4K' : (camera.resolution?.split(' ')[0] || '1080p')}
              </span>
            </div>
            <div className="border-l border-slate-800/80">
              <span className="text-[9px] text-slate-500 block uppercase">Detections</span>
              <span className="font-bold text-emerald-400 text-[11px] flex items-center justify-center gap-0.5">
                <Layers className="w-2.5 h-2.5" />
                {detectionCount}
              </span>
            </div>
            <div className="border-l border-slate-800/80">
              <span className="text-[9px] text-slate-500 block uppercase">Time</span>
              <span className="font-bold text-slate-300 text-[11px]">
                {formatTacticalTime(clockTime)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls footer */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            {camera.type || 'Thermal PTZ'}
          </span>
          <div className="flex items-center gap-1.5">
            {onConfigure && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConfigure(camera);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800/80 transition-colors"
                title="Camera Details & Settings"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
            )}
            {onFullscreen && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFullscreen(camera);
                }}
                className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-sm"
              >
                <Eye className="w-3 h-3 text-cyan-400" />
                Expand
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
