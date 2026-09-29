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
  Eye,
  Camera,
  Layers,
  ImageOff,
  Maximize2
} from 'lucide-react';
import Modal from '../common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { auditLogsService } from '../../services/auditLogsService';
import { formatDateTime, formatTacticalTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';

export default function AlertDetailModal({
  alert,
  isOpen,
  onClose,
  onUpdateStatus,
}) {
  const { user } = useAuth();
  const [operatorNote, setOperatorNote] = useState('');
  const [selectedUnit, setSelectedUnit] = useState(alert?.assignedUnit || 'QRT Alpha 1');
  const [showEvidenceFull, setShowEvidenceFull] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  if (!alert) return null;

  const isCritical = alert.severity === 'CRITICAL';
  const isWarning = alert.severity === 'WARNING';
  const isInfo = alert.severity === 'INFO';

  const isResolved = alert.status === 'RESOLVED';
  const isAcknowledged = alert.status === 'ACKNOWLEDGED';
  const isActive = alert.status === 'ACTIVE';

  const handleResolve = async () => {
    setIsUpdating(true);
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(
          alert.id, 
          'RESOLVED', 
          operatorNote || 'Verified and threat resolved by tactical operator.',
          user?.name || 'Commander',
          user?.role || 'ADMIN',
          user?.id || null
        );
      }
      onClose();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAcknowledge = async () => {
    setIsUpdating(true);
    try {
      if (onUpdateStatus) {
        await onUpdateStatus(
          alert.id, 
          'ACKNOWLEDGED', 
          operatorNote || `Acknowledged & dispatched ${selectedUnit}.`,
          user?.name || 'Commander',
          user?.role || 'ADMIN',
          user?.id || null
        );
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewEvidence = async () => {
    setShowEvidenceFull(true);
    await auditLogsService.log(
      'Evidence Viewed', 
      'ALERT_EVIDENCE', 
      alert.id, 
      `Forensic evidence frame inspected for ${alert.type}`, 
      user?.name || 'Commander', 
      user?.role || 'ADMIN', 
      user?.id || null
    );
  };

  // Color styles
  let severityBadgeClass = 'bg-blue-500/20 text-blue-400 border-blue-500/40';
  if (isCritical) severityBadgeClass = 'bg-red-500/20 text-red-400 border-red-500/40';
  else if (isWarning) severityBadgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/40';

  let statusBadgeClass = 'bg-red-500/20 text-red-400 border-red-500/40';
  if (isResolved) statusBadgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
  else if (isAcknowledged) statusBadgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/40';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Security Alert Dossier — ${alert.id}`}
        subtitle={`${alert.type || alert.alertType} • ${alert.camera || alert.cameraId}`}
        maxWidth="max-w-4xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Side: Evidence Snapshot & AI Analysis */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Evidence Area */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 aspect-video flex items-center justify-center">
              {alert.evidenceUrl ? (
                <img 
                  src={alert.evidenceUrl} 
                  alt="Forensic Evidence" 
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Simulated Forensic Canvas / No Evidence Available Placeholder */
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-[#080d17] via-[#0b1626] to-[#070b13] p-4 text-center">
                  <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 400 225">
                    <polygon points="0,150 100,90 220,130 320,80 400,140 400,225 0,225" fill="#1e293b" />
                    <line x1="0" y1="170" x2="400" y2="170" stroke={isCritical ? "#ff334b" : "#ffb300"} strokeWidth="1.5" strokeDasharray="6 4" />
                  </svg>

                  {/* Bounding box simulation in evidence */}
                  <div className={cn(
                    "absolute inset-x-[30%] inset-y-[22%] border-2 flex flex-col justify-between p-1.5",
                    isCritical ? "border-red-500 bg-red-500/15" : isWarning ? "border-amber-400 bg-amber-500/15" : "border-blue-500 bg-blue-500/15"
                  )}>
                    <div className={cn(
                      "text-[9px] font-mono px-1 py-0.5 rounded border self-start font-bold",
                      isCritical ? "bg-red-950/90 text-red-300 border-red-500" : "bg-amber-950/90 text-amber-300 border-amber-400"
                    )}>
                      AI DETECTION [{alert.confidence || '94.5%'}]
                    </div>
                    <div className="text-[8px] font-mono text-white bg-black/80 px-1 rounded self-end">
                      {alert.detectionTarget || alert.type}
                    </div>
                  </div>

                  {/* Scanline overlay */}
                  <div className="cctv-scanline absolute inset-0 pointer-events-none opacity-25" />
                </div>
              )}

              {/* Top HUD Watermark */}
              <div className="absolute top-2.5 left-2.5 text-[10px] font-mono text-cyan-400 bg-black/80 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1.5">
                <Camera className="w-3 h-3 text-cyan-400" />
                FORENSIC CAPTURE
              </div>
              <div className="absolute top-2.5 right-2.5 text-[10px] font-mono text-slate-300 bg-black/80 px-2 py-0.5 rounded border border-slate-700">
                {formatDateTime(alert.detectedAt || alert.createdAt || alert.timestamp)}
              </div>

              {/* Bottom Info Ribbon */}
              <div className="absolute bottom-2 inset-x-2 bg-black/85 px-2.5 py-1 rounded-lg text-[11px] font-mono flex items-center justify-between border border-slate-800">
                <span className={isCritical ? "text-red-400 font-bold" : isWarning ? "text-amber-300 font-bold" : "text-blue-300 font-bold"}>
                  {alert.type || alert.alertType}
                </span>
                <span className="text-slate-400 text-[10px]">
                  {alert.location}
                </span>
              </div>
            </div>

            {/* Quick Evidence Action */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                Evidence Status: {alert.evidenceUrl ? "Cryptographic Media Linked" : "Simulated Thermal Frame"}
              </span>
              <button
                onClick={handleViewEvidence}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
              >
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                View High-Res Evidence
              </button>
            </div>

            {/* AI Detection Telemetry */}
            <div className="p-4 rounded-xl bg-command-950/80 border border-slate-800">
              <h4 className="text-xs font-mono font-bold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Neural Engine Forensic Telemetry
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                <div className="p-2 rounded bg-command-900 border border-slate-800">
                  <span className="text-slate-500 block text-[9px] uppercase">TARGET CLASS</span>
                  <span className="font-semibold text-slate-200 truncate block">{alert.detectionTarget || 'PERSON'}</span>
                </div>
                <div className="p-2 rounded bg-command-900 border border-slate-800">
                  <span className="text-slate-500 block text-[9px] uppercase">CONFIDENCE</span>
                  <span className="font-semibold text-emerald-400">{alert.confidence || '94.2%'}</span>
                </div>
                <div className="p-2 rounded bg-command-900 border border-slate-800">
                  <span className="text-slate-500 block text-[9px] uppercase">THREAT LEVEL</span>
                  <span className={cn(
                    "font-bold",
                    isCritical ? "text-red-400" : isWarning ? "text-amber-400" : "text-blue-400"
                  )}>
                    {alert.threatLevel || (isCritical ? 'Critical' : 'Moderate')}
                  </span>
                </div>
                <div className="p-2 rounded bg-command-900 border border-slate-800">
                  <span className="text-slate-500 block text-[9px] uppercase">PIPELINE</span>
                  <span className="font-semibold text-cyan-300">YOLOv8+ByteTrack</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Alert Metadata, Action History & Dispatch */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-command-950/80 border border-slate-800 space-y-3 font-mono text-xs">
              {/* Severity & Status Badges */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">Severity:</span>
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border uppercase", severityBadgeClass)}>
                    {alert.severity}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">Status:</span>
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border uppercase", statusBadgeClass)}>
                    {alert.status}
                  </span>
                </div>
              </div>

              {/* Camera & Location info */}
              <div className="p-2.5 rounded-lg bg-command-900 border border-slate-800 space-y-1 text-slate-300">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Camera Code:</span>
                  <span className="text-cyan-400 font-bold">{alert.camera || alert.cameraId}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Location:</span>
                  <span className="text-slate-200">{alert.location}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Detected:</span>
                  <span className="text-slate-300">{formatDateTime(alert.detectedAt || alert.createdAt)}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <span className="text-slate-500 block text-[11px] mb-1">Incident Description</span>
                <p className="text-slate-300 bg-command-900 p-2.5 rounded-lg border border-slate-800 leading-relaxed text-[11px]">
                  {alert.description || 'Intrusion threshold exceeded along virtual perimeter line.'}
                </p>
              </div>

              {/* Action Log */}
              {alert.actionTaken && (
                <div>
                  <span className="text-slate-500 block text-[11px] mb-1">Action Protocol Logged</span>
                  <p className="text-emerald-400 bg-command-900 p-2.5 rounded-lg border border-slate-800 text-[11px]">
                    {alert.actionTaken}
                  </p>
                </div>
              )}

              {/* VIEWER Read-Only Warning */}
              {user?.role === 'VIEWER' && (
                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 font-mono text-xs flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-[11px]">Read-Only Mode: Alert status actions are restricted for the VIEWER role.</span>
                </div>
              )}

              {/* Tactical Response Unit Dispatch */}
              {user?.role !== 'VIEWER' && !isResolved && (
                <div>
                  <label className="text-slate-400 block mb-1 text-[11px]">
                    Assigned Tactical Unit
                  </label>
                  <select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value)}
                    className="w-full bg-command-900 border border-slate-700 text-slate-200 rounded-lg p-2 text-xs focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="QRT Alpha 1">QRT Alpha 1 (Sector North)</option>
                    <option value="QRT Bravo 2">QRT Bravo 2 (Sector East)</option>
                    <option value="Border Patrol Delta">Border Patrol Delta (Checkpost Charlie)</option>
                    <option value="UAV Recon Unit 3">UAV Recon Unit 3 (Riverbed)</option>
                  </select>
                </div>
              )}

              {/* Operator Note Input */}
              {user?.role !== 'VIEWER' && !isResolved && (
                <div>
                  <label className="text-slate-400 block mb-1 text-[11px]">
                    Operational Action Note
                  </label>
                  <textarea
                    rows={2}
                    value={operatorNote}
                    onChange={(e) => setOperatorNote(e.target.value)}
                    placeholder="Enter dispatch notes or resolution justification..."
                    className="w-full bg-command-900 border border-slate-700 text-slate-200 rounded-lg p-2 text-xs focus:border-cyan-400 focus:outline-none resize-none"
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {user?.role !== 'VIEWER' && (
              <div className="flex items-center gap-3 pt-2">
                {!isAcknowledged && !isResolved && (
                  <button
                    disabled={isUpdating}
                    onClick={handleAcknowledge}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    Acknowledge
                  </button>
                )}

                {!isResolved && (
                  <button
                    disabled={isUpdating}
                    onClick={handleResolve}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-glow-green"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Resolve Threat
                  </button>
                )}

                {isResolved && (
                  <div className="w-full py-2.5 text-center text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 rounded-xl font-mono text-xs font-bold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Alert Resolved & Archived
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Fullscreen Evidence Modal */}
      {showEvidenceFull && (
        <Modal
          isOpen={showEvidenceFull}
          onClose={() => setShowEvidenceFull(false)}
          title={`Forensic Evidence Examination — ${alert.id}`}
          subtitle={`${alert.type} • Captured by ${alert.camera}`}
          maxWidth="max-w-5xl"
        >
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-slate-700 bg-black aspect-video flex items-center justify-center relative">
              {alert.evidenceUrl ? (
                <img 
                  src={alert.evidenceUrl} 
                  alt="Forensic Frame" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="p-8 text-center text-slate-400 font-mono">
                  <ImageOff className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-300">No external binary file attached.</p>
                  <p className="text-xs text-slate-500 mt-1">Encrypted neural tensor frame hash #A9F-2026</p>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-command-950 border border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>Timestamp: {formatDateTime(alert.detectedAt || alert.createdAt)}</span>
              <span className="text-cyan-400 font-bold">SHA-256 Verified Forensic Evidence</span>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
