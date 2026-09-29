import React, { useState } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  Sliders, 
  Video, 
  Wifi, 
  ShieldCheck, 
  Cpu, 
  Maximize2 
} from 'lucide-react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import SurveillanceFeed from './SurveillanceFeed';

export default function CameraControlModal({ camera, isOpen, onClose, onSave }) {
  const [ptzSpeed, setPtzSpeed] = useState(50);
  const [detectionThreshold, setDetectionThreshold] = useState(85);
  const [thermalSensitivity, setThermalSensitivity] = useState(70);
  const [virtualFenceEnabled, setVirtualFenceEnabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');

  if (!camera) return null;

  const handlePtz = (direction) => {
    setStatusMessage(`PTZ Command sent: Pan/Tilt ${direction} at speed ${ptzSpeed}%`);
    setTimeout(() => setStatusMessage(''), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Camera Controls — ${camera.id} (${camera.name})`}
      subtitle={`Location: ${camera.location} • RTSP IP: 192.168.10.10x`}
      maxWidth="max-w-4xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Live Feed Preview */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <SurveillanceFeed
            camera={camera}
            showControls={true}
            className="w-full h-64 lg:h-72"
          />

          {statusMessage && (
            <div className="p-2 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 font-mono text-xs animate-pulse">
              ➜ {statusMessage}
            </div>
          )}

          {/* Stream Diagnostics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-command-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">STATUS</span>
              <StatusBadge status={camera.status} />
            </div>
            <div className="p-2.5 rounded-lg bg-command-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">RESOLUTION</span>
              <span className="font-semibold text-slate-200">{camera.resolution}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-command-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">BITRATE</span>
              <span className="font-semibold text-cyan-400">{camera.bitrate || '4.0 Mbps'}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Tactical PTZ & Detection Settings */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* PTZ Keypad */}
          <div className="p-4 rounded-xl bg-command-950/90 border border-slate-800 flex flex-col items-center">
            <h4 className="text-xs font-mono font-bold uppercase text-slate-400 mb-3 tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              PTZ Slew / Pan-Tilt Control
            </h4>

            {/* Directional Pad */}
            <div className="grid grid-cols-3 gap-1.5 w-36 h-36">
              <div />
              <button
                onClick={() => handlePtz('UP')}
                className="p-2 bg-slate-800 hover:bg-cyan-500/20 active:bg-cyan-500/40 border border-slate-700 hover:border-cyan-400 rounded-lg flex items-center justify-center text-slate-300 hover:text-cyan-300 transition-colors"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <div />

              <button
                onClick={() => handlePtz('LEFT')}
                className="p-2 bg-slate-800 hover:bg-cyan-500/20 active:bg-cyan-500/40 border border-slate-700 hover:border-cyan-400 rounded-lg flex items-center justify-center text-slate-300 hover:text-cyan-300 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => handlePtz('CENTER HOME')}
                className="p-2 bg-slate-900 border border-slate-700 rounded-lg flex items-center justify-center text-xs font-mono text-cyan-400 hover:border-cyan-400 transition-colors"
                title="Reset to Home Preset"
              >
                HOME
              </button>
              <button
                onClick={() => handlePtz('RIGHT')}
                className="p-2 bg-slate-800 hover:bg-cyan-500/20 active:bg-cyan-500/40 border border-slate-700 hover:border-cyan-400 rounded-lg flex items-center justify-center text-slate-300 hover:text-cyan-300 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div />
              <button
                onClick={() => handlePtz('DOWN')}
                className="p-2 bg-slate-800 hover:bg-cyan-500/20 active:bg-cyan-500/40 border border-slate-700 hover:border-cyan-400 rounded-lg flex items-center justify-center text-slate-300 hover:text-cyan-300 transition-colors"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
              <div />
            </div>

            {/* PTZ Speed Slider */}
            <div className="w-full mt-4">
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Pan/Tilt Speed</span>
                <span className="text-cyan-400">{ptzSpeed}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={ptzSpeed}
                onChange={(e) => setPtzSpeed(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
            </div>
          </div>

          {/* AI Edge Filters */}
          <div className="p-4 rounded-xl bg-command-950/90 border border-slate-800 space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              AI Edge Analytics Configuration
            </h4>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>YOLO Confidence Threshold</span>
                <span className="text-emerald-400">{detectionThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="99"
                value={detectionThreshold}
                onChange={(e) => setDetectionThreshold(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Thermal Contrast Sensitivity</span>
                <span className="text-amber-400">{thermalSensitivity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                value={thermalSensitivity}
                onChange={(e) => setThermalSensitivity(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            <label className="flex items-center justify-between text-xs font-mono text-slate-300 pt-2 border-t border-slate-800 cursor-pointer">
              <span>Virtual Fence Spatial Line</span>
              <input
                type="checkbox"
                checked={virtualFenceEnabled}
                onChange={(e) => setVirtualFenceEnabled(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-400"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                if (onSave) onSave({ ...camera, detectionThreshold, thermalSensitivity });
                onClose();
              }}
              className="px-4 py-2 text-xs font-mono font-bold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors shadow-glow-cyan"
            >
              Apply Settings
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
