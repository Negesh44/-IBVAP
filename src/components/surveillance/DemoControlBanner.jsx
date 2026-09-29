import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  Square, 
  RotateCcw, 
  Video, 
  Cpu, 
  Activity, 
  ShieldCheck, 
  AlertTriangle,
  Lock,
  Radio,
  Zap
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../utils/cn';

export default function DemoControlBanner({ onDemoStatusChange }) {
  const { user } = useAuth();
  const [demoStatus, setDemoStatus] = useState({
    running: false,
    camera_id: 'DEMO-001',
    camera_name: 'Border Surveillance Demo',
    status: 'IDLE',
    processing_fps: 5
  });
  const [demoMetrics, setDemoMetrics] = useState({
    input_fps: 20.0,
    processing_fps: 0.0,
    average_inference_time_ms: 0.0,
    average_tracking_time_ms: 0.0,
    frames_processed: 0,
    detections_count: 0,
    unique_tracks_count: 0,
    events_generated_count: 0,
    pipeline_status: 'IDLE',
    gpu_acceleration: false
  });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const canControl = user?.role === 'ADMIN' || user?.role === 'COMMANDER';

  const fetchStatusAndMetrics = async () => {
    try {
      const statusRes = await api.getDemoStatus();
      if (statusRes) {
        setDemoStatus(statusRes);
        if (onDemoStatusChange) onDemoStatusChange(statusRes.running);
      }
      const metricsRes = await api.getDemoMetrics();
      if (metricsRes) {
        setDemoMetrics(metricsRes);
      }
    } catch {
      // Local fallback
    }
  };

  useEffect(() => {
    fetchStatusAndMetrics();
    const interval = setInterval(fetchStatusAndMetrics, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStartDemo = async () => {
    if (!canControl) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await api.startDemo();
      await fetchStatusAndMetrics();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to start demo feed');
    } finally {
      setLoading(false);
    }
  };

  const handleStopDemo = async () => {
    if (!canControl) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await api.stopDemo();
      await fetchStatusAndMetrics();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to stop demo feed');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDemo = async () => {
    if (!canControl) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await api.resetDemo();
      await fetchStatusAndMetrics();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reset demo');
    } finally {
      setLoading(false);
    }
  };

  const isRunning = demoStatus.running || demoMetrics.pipeline_status === 'RUNNING';

  return (
    <div className={cn(
      "rounded-2xl border transition-all backdrop-blur-xl p-4 shadow-xl font-mono",
      isRunning 
        ? "bg-gradient-to-r from-command-950 via-cyan-950/40 to-command-900 border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.15)]"
        : "bg-command-900/90 border-slate-800"
    )}>
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        
        {/* Left: Camera & Pipeline Indicators */}
        <div className="flex flex-wrap items-center gap-3">
          <div className={cn(
            "px-3 py-1.5 rounded-xl border flex items-center gap-2 text-xs font-bold shadow-sm",
            isRunning
              ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
              : "bg-slate-800/80 text-slate-400 border-slate-700"
          )}>
            <Video className="w-4 h-4 text-cyan-400" />
            <span>SIH DEMO MODE</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-white text-sm font-bold tracking-tight">
                {demoStatus.camera_name || 'Border Surveillance Demo'}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-bold">
                {demoStatus.camera_id}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>Location: Demo Border Post</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                Status:
                <span className={cn(
                  "font-bold",
                  isRunning ? "text-emerald-400" : "text-slate-400"
                )}>
                  {isRunning ? 'ONLINE' : 'IDLE'}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Performance Metrics Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Pipeline */}
          <div className="px-2.5 py-1.5 rounded-xl bg-command-950 border border-slate-800 flex items-center gap-1.5">
            <Radio className={cn("w-3.5 h-3.5", isRunning ? "text-emerald-400 animate-pulse" : "text-slate-500")} />
            <span className="text-[10px] text-slate-500 font-bold">PIPELINE:</span>
            <span className={cn("font-bold text-[11px]", isRunning ? "text-emerald-300" : "text-slate-400")}>
              {isRunning ? 'RUNNING' : 'STANDBY'}
            </span>
          </div>

          {/* FPS */}
          <div className="px-2.5 py-1.5 rounded-xl bg-command-950 border border-slate-800 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] text-slate-500 font-bold">FPS:</span>
            <span className="text-cyan-300 font-bold text-[11px]">
              {isRunning ? `${demoMetrics.processing_fps || 5.0} FPS` : '0.0 FPS'}
            </span>
          </div>

          {/* YOLO Status */}
          <div className="px-2.5 py-1.5 rounded-xl bg-command-950 border border-slate-800 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] text-slate-500 font-bold">AI:</span>
            <span className="text-blue-300 font-bold text-[11px]">YOLO READY</span>
          </div>

          {/* ByteTrack Status */}
          <div className="px-2.5 py-1.5 rounded-xl bg-command-950 border border-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] text-slate-500 font-bold">TRACKING:</span>
            <span className="text-emerald-300 font-bold text-[11px]">ByteTrack READY</span>
          </div>

          {/* Events Count */}
          <div className="px-2.5 py-1.5 rounded-xl bg-command-950 border border-slate-800 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[10px] text-slate-500 font-bold">EVENTS:</span>
            <span className="text-amber-300 font-bold text-[11px]">
              {demoMetrics.events_generated_count || 0}
            </span>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2">
          {canControl ? (
            <>
              {!isRunning ? (
                <button
                  onClick={handleStartDemo}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-glow-emerald cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  START DEMO
                </button>
              ) : (
                <button
                  onClick={handleStopDemo}
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-glow-red cursor-pointer disabled:opacity-50"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  STOP DEMO
                </button>
              )}

              <button
                onClick={handleResetDemo}
                disabled={loading}
                title="Reset demo tracker state and counters"
                className="p-2 rounded-xl bg-command-950 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-400 text-xs">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Read-Only ({user?.role || 'VIEWER'})</span>
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mt-2.5 p-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
