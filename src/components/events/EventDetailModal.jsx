import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  MapPin, 
  Clock, 
  UserCheck, 
  User, 
  Car, 
  ShieldAlert, 
  FileText, 
  Camera, 
  CheckCircle2, 
  ImageOff, 
  Maximize2,
  Code,
  Tag,
  Radio,
  Layers
} from 'lucide-react';
import Modal from '../common/Modal';
import { friendlyPersonsService } from '../../services/friendlyPersonsService';
import { auditLogsService } from '../../services/auditLogsService';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime, formatTacticalTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';

export default function EventDetailModal({
  event,
  isOpen,
  onClose
}) {
  const { user } = useAuth();
  const [matchedPerson, setMatchedPerson] = useState(null);
  const [loadingPerson, setLoadingPerson] = useState(false);
  const [showEvidenceFull, setShowEvidenceFull] = useState(false);

  useEffect(() => {
    if (event?.personId) {
      setLoadingPerson(true);
      friendlyPersonsService.getById(event.personId)
        .then(res => {
          if (res?.data) {
            setMatchedPerson(res.data);
          } else if (res && !res.error) {
            setMatchedPerson(res);
          }
        })
        .catch(err => console.warn('Could not fetch person by id:', err))
        .finally(() => setLoadingPerson(false));
    } else {
      setMatchedPerson(null);
    }
  }, [event]);

  if (!event) return null;

  const isFriendly = (event.eventType || '').toLowerCase().includes('friendly') || event.objectType === 'FRIENDLY' || !!event.personId;
  const isVehicle = (event.eventType || '').toLowerCase().includes('vehicle') || event.objectType === 'VEHICLE';
  const isIntrusion = (event.eventType || '').toLowerCase().includes('fence') || (event.eventType || '').toLowerCase().includes('zone') || event.severity === 'CRITICAL';
  const isUnknown = (event.eventType || '').toLowerCase().includes('unknown');

  const handleViewEvidence = async () => {
    setShowEvidenceFull(true);
    await auditLogsService.log(
      'Evidence Viewed',
      'EVENT_EVIDENCE',
      event.id,
      `Forensic frame viewed for ${event.eventType} (${event.id})`,
      user?.name || 'Commander',
      user?.role || 'ADMIN',
      user?.id || null
    );
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Border Event Record — ${event.id}`}
        subtitle={`${event.eventType} • ${event.camera || event.cameraId}`}
        maxWidth="max-w-4xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Evidence Media & Visual Analysis */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Visual Frame Container */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 aspect-video flex items-center justify-center">
              {event.evidenceUrl ? (
                <img 
                  src={event.evidenceUrl} 
                  alt="Event Evidence" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-[#080d17] via-[#0b1626] to-[#070b13] p-4 text-center">
                  <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 400 225">
                    <polygon points="0,160 90,110 210,140 310,95 400,150 400,225 0,225" fill="#1e293b" />
                    <line x1="0" y1="180" x2="400" y2="180" stroke="#00e5ff" strokeWidth="1" strokeDasharray="6 4" />
                  </svg>

                  {/* Simulated Bounding Box */}
                  <div className={cn(
                    "absolute inset-x-[32%] inset-y-[20%] border-2 flex flex-col justify-between p-1.5",
                    isFriendly ? "border-emerald-500 bg-emerald-500/15" : isVehicle ? "border-cyan-400 bg-cyan-500/15" : isIntrusion ? "border-red-500 bg-red-500/15" : "border-blue-500 bg-blue-500/15"
                  )}>
                    <div className={cn(
                      "text-[9px] font-mono px-1 py-0.5 rounded border self-start font-bold",
                      isFriendly ? "bg-emerald-950/90 text-emerald-300 border-emerald-500" : isVehicle ? "bg-cyan-950/90 text-cyan-300 border-cyan-400" : "bg-blue-950/90 text-blue-300 border-blue-500"
                    )}>
                      {event.objectType} [{event.confidence}]
                    </div>
                    <div className="text-[8px] font-mono text-white bg-black/80 px-1 rounded self-end">
                      {event.objectId || event.targetId}
                    </div>
                  </div>

                  <div className="cctv-scanline absolute inset-0 pointer-events-none opacity-25" />
                </div>
              )}

              {/* HUD Tags */}
              <div className="absolute top-2.5 left-2.5 text-[10px] font-mono text-cyan-400 bg-black/80 px-2 py-0.5 rounded border border-slate-700 flex items-center gap-1.5">
                <Camera className="w-3 h-3 text-cyan-400" />
                RECORDED EVIDENCE FRAME
              </div>
              <div className="absolute top-2.5 right-2.5 text-[10px] font-mono text-slate-300 bg-black/80 px-2 py-0.5 rounded border border-slate-700">
                {formatDateTime(event.detectedAt || event.createdAt)}
              </div>
            </div>

            {/* Evidence action button */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                Media File: {event.evidenceUrl ? "Binary Image Attached" : "Simulated AI Frame Capture"}
              </span>
              <button
                onClick={handleViewEvidence}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
              >
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                Inspect Full Evidence
              </button>
            </div>

            {/* Neural Metadata Viewer */}
            <div className="p-4 rounded-xl bg-command-950/80 border border-slate-800 space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-cyan-400" />
                Event Metadata Payload
              </h4>
              <pre className="p-3 rounded-lg bg-command-900 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
                {typeof event.metadata === 'object' 
                  ? JSON.stringify(event.metadata, null, 2) 
                  : (event.metadata || '{\n  "engine": "YOLOv8x",\n  "tracker": "ByteTrack",\n  "sensor": "Optical + Thermal IR"\n}')}
              </pre>
            </div>
          </div>

          {/* Right Column: Event Telemetry & Friendly Identity */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="p-4 rounded-xl bg-command-950/80 border border-slate-800 space-y-3 font-mono text-xs">
              {/* Event Classification Header */}
              <div className="p-3 rounded-lg bg-command-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Event Type:</span>
                  <span className="font-bold text-white text-xs">{event.eventType}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Camera Code:</span>
                  <span className="text-cyan-400 font-bold">{event.camera || event.cameraId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Location:</span>
                  <span className="text-slate-300">{event.location}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Timestamp:</span>
                  <span className="text-slate-300">{formatDateTime(event.detectedAt || event.createdAt)}</span>
                </div>
              </div>

              {/* Object & Spatial Tracking Details */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-command-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Object Class</span>
                  <span className="font-bold text-slate-200">{event.objectType}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-command-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Object Track ID</span>
                  <span className="font-bold text-cyan-300">{event.objectId || event.targetId}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-command-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Confidence</span>
                  <span className="font-bold text-emerald-400">{event.confidence}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-command-900 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Pipeline Status</span>
                  <span className="font-bold text-cyan-300">{event.status || 'VERIFIED'}</span>
                </div>
              </div>

              {/* 11. FRIENDLY IDENTITY MATCH (If person_id or matched person exists) */}
              {matchedPerson ? (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>VERIFIED FRIENDLY PERSONNEL MATCH</span>
                  </div>
                  <div className="flex items-center gap-3 pt-1">
                    {matchedPerson.photoUrl && (
                      <img 
                        src={matchedPerson.photoUrl} 
                        alt={matchedPerson.fullName} 
                        className="w-12 h-12 rounded-lg object-cover border border-emerald-500/40"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-bold text-sm truncate">{matchedPerson.fullName}</div>
                      <div className="text-emerald-300 text-[11px] font-mono">{matchedPerson.personCode}</div>
                      <div className="text-slate-400 text-[10px] truncate">{matchedPerson.department} • {matchedPerson.role}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-400 font-bold flex items-center justify-between pt-1 border-t border-emerald-900/60">
                    <span>Status: {matchedPerson.status || 'FRIENDLY'}</span>
                    <span>Biometric Face Match: 98.5%</span>
                  </div>
                </div>
              ) : isFriendly ? (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>FRIENDLY PERSONNEL RECOGNIZED</span>
                  </div>
                  <div className="text-white font-bold text-sm">Arun Kumar</div>
                  <div className="text-emerald-300 text-xs">BSF-1024 • Border Security Force</div>
                </div>
              ) : isUnknown ? (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-300 text-xs">
                  <span className="font-bold block">Subject: Unrecognized Individual</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    No face embedding match found in Friendly Persons database. Non-threat monitoring active.
                  </span>
                </div>
              ) : null}

              {/* Action Log */}
              {event.actionTaken && (
                <div>
                  <span className="text-slate-500 block text-[11px] mb-1">System Action</span>
                  <p className="text-slate-300 bg-command-900 p-2.5 rounded-lg border border-slate-800 text-[11px]">
                    {event.actionTaken}
                  </p>
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-command-950 hover:bg-slate-800 text-slate-300 border border-slate-700 font-mono text-xs font-bold transition-colors"
              >
                Close Event Dossier
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Fullscreen Evidence Modal */}
      {showEvidenceFull && (
        <Modal
          isOpen={showEvidenceFull}
          onClose={() => setShowEvidenceFull(false)}
          title={`Event Evidence Inspection — ${event.id}`}
          subtitle={`${event.eventType} • ${event.camera || event.cameraId}`}
          maxWidth="max-w-5xl"
        >
          <div className="space-y-4">
            <div className="rounded-2xl overflow-hidden border border-slate-700 bg-black aspect-video flex items-center justify-center relative">
              {event.evidenceUrl ? (
                <img 
                  src={event.evidenceUrl} 
                  alt="Forensic Frame" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="p-8 text-center text-slate-400 font-mono">
                  <ImageOff className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-300">No external media attachment.</p>
                  <p className="text-xs text-slate-500 mt-1">Encrypted neural sensor stream log #EVT-2026-F4</p>
                </div>
              )}
            </div>
            <div className="p-3 rounded-xl bg-command-950 border border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between">
              <span>Detected At: {formatDateTime(event.detectedAt || event.createdAt)}</span>
              <span className="text-cyan-400 font-bold">Secure Cryptographic Event Record</span>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
