import React, { useState } from 'react';
import { 
  ShieldAlert, 
  MapPin, 
  Clock, 
  Video, 
  UserCheck, 
  Car, 
  Radio, 
  Send, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  Share2
} from 'lucide-react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import { formatDateTime } from '../../utils/formatters';

export default function AlertDetailModal({
  alert,
  isOpen,
  onClose,
  onUpdateStatus,
}) {
  const [operatorNote, setOperatorNote] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(alert?.assignedUnit || 'QRT Alpha 1');

  if (!alert) return null;

  const isCritical = alert.severity === 'CRITICAL';

  const handleResolve = () => {
    if (onUpdateStatus) {
      onUpdateStatus(alert.id, 'RESOLVED', operatorNote || 'Verified and resolved by operator.');
    }
    onClose();
  };

  const handleAcknowledge = () => {
    if (onUpdateStatus) {
      onUpdateStatus(alert.id, 'IN_REVIEW', operatorNote || 'Investigating in progress.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Security Alert Dossier — ${alert.id}`}
      subtitle={`${alert.type} • ${alert.camera}`}
      maxWidth="max-w-4xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Evidence Snapshot & AI Analysis */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Simulated Evidence Frame */}
          <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-video flex items-center justify-center">
            {/* Background simulated capture */}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950">
              <svg className="w-full h-full opacity-40" preserveAspectRatio="none" viewBox="0 0 400 225">
                <polygon points="0,150 100,90 220,130 320,80 400,140 400,225 0,225" fill="#1e293b" />
                <line x1="0" y1="170" x2="400" y2="170" stroke="#ff334b" strokeWidth="1.5" strokeDasharray="6 4" />
              </svg>
            </div>

            {/* Bounding box simulation in evidence */}
            <div className="absolute inset-x-[35%] inset-y-[25%] border-2 border-red-500 bg-red-500/15 flex flex-col justify-between p-1">
              <div className="text-[10px] font-mono bg-red-950/90 text-red-300 px-1 py-0.5 rounded border border-red-500 self-start">
                TARGET DETECTED [CONF: {alert.confidence || '94%'}]
              </div>
              <div className="text-[9px] font-mono text-white bg-black/80 px-1 rounded self-end">
                {alert.detectionTarget || 'SUBJECT #104'}
              </div>
            </div>

            {/* Top HUD Watermark */}
            <div className="absolute top-2 left-2 text-[10px] font-mono text-cyan-400 bg-black/70 px-2 py-0.5 rounded border border-slate-800">
              FORENSIC SNAPSHOT FRAME #9812A
            </div>
            <div className="absolute top-2 right-2 text-[10px] font-mono text-slate-300 bg-black/70 px-2 py-0.5 rounded border border-slate-800">
              {formatDateTime(alert.timestamp || alert.time)}
            </div>

            {/* Bottom Warning */}
            <div className="absolute bottom-2 inset-x-2 bg-black/80 px-2 py-1 rounded text-[11px] font-mono text-red-400 flex items-center justify-between border border-red-500/30">
              <span>ALERT EVENT: {alert.type.toUpperCase()}</span>
              <span>GEO: {alert.location}</span>
            </div>
          </div>

          {/* AI Detection Telemetry */}
          <div className="p-4 rounded-xl bg-command-950/80 border border-slate-800">
            <h4 className="text-xs font-mono font-bold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              Neural Engine Forensic Telemetry
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2 rounded bg-command-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">TARGET CLASS</span>
                <span className="font-semibold text-slate-200">{alert.detectionTarget || 'PERSON'}</span>
              </div>
              <div className="p-2 rounded bg-command-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">CONFIDENCE</span>
                <span className="font-semibold text-emerald-400">{alert.confidence || '94.2%'}</span>
              </div>
              <div className="p-2 rounded bg-command-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">THREAT LEVEL</span>
                <span className={isCritical ? "font-bold text-red-400" : "font-bold text-amber-400"}>
                  {alert.threatLevel || 'High Risk'}
                </span>
              </div>
              <div className="p-2 rounded bg-command-900 border border-slate-800">
                <span className="text-slate-500 block text-[10px]">PIPELINE</span>
                <span className="font-semibold text-cyan-300">YOLOv8 + ByteTrack</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Alert Metadata, Action History & Dispatch */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-command-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">Current Status:</span>
              <StatusBadge status={alert.status} pulse={alert.status === 'ACTIVE'} />
            </div>

            <div>
              <span className="text-xs font-mono text-slate-500 block">Incident Description</span>
              <p className="text-xs text-slate-300 mt-1 bg-command-900 p-2.5 rounded-lg border border-slate-800 leading-relaxed">
                {alert.description}
              </p>
            </div>

            <div>
              <span className="text-xs font-mono text-slate-500 block">Action Protocol Taken</span>
              <p className="text-xs text-emerald-400 mt-1 bg-command-900 p-2.5 rounded-lg border border-slate-800">
                {alert.actionTaken || 'No protocol dispatched yet.'}
              </p>
            </div>

            {/* Quick Dispatch Selector */}
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">
                Assigned Tactical Response Unit
              </label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full bg-command-900 border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="QRT Alpha 1">Quick Reaction Team Alpha 1 (QRT-1)</option>
                <option value="Patrol Unit Bravo">Patrol Unit Bravo (Ridge Watch)</option>
                <option value="Drone Sentry 02">Autonomous Drone Sentry #02</option>
                <option value="Station Guard">Checkpoint Charlie Sentry Guard</option>
              </select>
            </div>

            {/* Operator Notes Input */}
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">
                Add Commander / Operator Log Note
              </label>
              <textarea
                rows={2}
                value={operatorNote}
                onChange={(e) => setOperatorNote(e.target.value)}
                placeholder="Enter field verification notes, dispatched radio codes..."
                className="w-full bg-command-900 border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Action Triggers */}
          <div className="flex flex-col sm:flex-row gap-2">
            {alert.status === 'ACTIVE' && (
              <button
                onClick={handleAcknowledge}
                className="flex-1 py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Set In-Review
              </button>
            )}
            <button
              onClick={handleResolve}
              className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-bold transition-colors shadow-glow-green flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Resolve & Close Alert
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
