import React from 'react';
import { motion } from 'framer-motion';
import { Radio, Eye, Sliders, MapPin, Zap, AlertTriangle } from 'lucide-react';
import SurveillanceFeed from './SurveillanceFeed';
import StatusBadge from '../common/StatusBadge';
import { cn } from '../../utils/cn';

export default function CameraCard({
  camera,
  isSelected,
  onSelect,
  onFullscreen,
  onSnapshot,
  onConfigure,
  className
}) {
  const isOnline = camera?.status === 'ONLINE';
  const hasBreach = camera?.activeDetections?.some(d => d.category === 'CRITICAL' || d.type === 'ALERT');

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.15 }}
      onClick={() => onSelect && onSelect(camera)}
      className={cn(
        "flex flex-col rounded-xl bg-command-900/90 border transition-all overflow-hidden",
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
          onFullscreen={onFullscreen}
          onSnapshot={onSnapshot}
          onOpenSettings={onConfigure}
          className="rounded-t-xl rounded-b-none border-0"
        />

        {/* Live Breach Warning banner overlay if alert active */}
        {hasBreach && (
          <div className="absolute top-2 inset-x-2 py-1 px-3 bg-red-600/90 text-white text-[11px] font-mono font-bold flex items-center justify-between rounded shadow-lg animate-pulse z-20">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              SECURITY BREACH DETECTED
            </span>
            <span className="text-[10px] uppercase">Zone Alert</span>
          </div>
        )}
      </div>

      {/* Card Info Details Footer */}
      <div className="p-4 flex-1 flex flex-col justify-between bg-command-950/70">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-slate-100 text-sm flex items-center gap-1.5">
                <span className="text-cyan-400 font-mono text-xs">{camera.id}</span>
                <span>•</span>
                <span className="truncate">{camera.name}</span>
              </h4>
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-1 font-mono">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="truncate">{camera.location}</span>
              </p>
            </div>
            <StatusBadge status={camera.status} pulse={isOnline} />
          </div>

          {/* Quick Metrics Badges */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-mono py-2 px-2.5 rounded-lg bg-command-900/90 border border-slate-800/80">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">FPS</span>
              <span className="font-bold text-cyan-300">{camera.fps || 30}</span>
            </div>
            <div className="border-x border-slate-800/80 px-1">
              <span className="text-[10px] text-slate-500 block uppercase">Res</span>
              <span className="font-bold text-slate-200">{camera.resolution?.includes('4K') ? '4K UHD' : '1080p'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 block uppercase">24h Detections</span>
              <span className="font-bold text-emerald-400">{camera.detections24h || 0}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <span className="text-[10px] text-slate-500 font-mono">
            {camera.type || 'Thermal PTZ'}
          </span>
          <div className="flex items-center gap-2">
            {onConfigure && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConfigure(camera);
                }}
                className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                title="Configure Camera"
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
                className="px-2 py-1 rounded bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 font-mono text-[11px] transition-colors flex items-center gap-1 border border-slate-700/60"
              >
                <Eye className="w-3 h-3" />
                View
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
