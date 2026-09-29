import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  UserCheck, 
  Car, 
  User, 
  UserX, 
  ShieldAlert, 
  Pause, 
  Play, 
  Filter, 
  Trash2, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatTacticalTime } from '../../utils/formatters';

export default function LiveDetectionPanel({
  cameras = [],
  friendlyPersons = [],
  activeFilter = 'ALL',
  onSelectCamera,
  className
}) {
  const [isLivePaused, setIsLivePaused] = useState(false);
  const [filter, setFilter] = useState(activeFilter);
  const [detectionsLog, setDetectionsLog] = useState([
    {
      id: 'EVT-101',
      time: new Date(Date.now() - 3000),
      type: 'person',
      cameraCode: 'BOP-001',
      title: 'Person detected',
      identity: null,
      confidence: 96,
      category: 'PERSON'
    },
    {
      id: 'EVT-102',
      time: new Date(Date.now() - 7000),
      type: 'vehicle',
      cameraCode: 'BOP-002',
      title: 'Vehicle detected',
      identity: null,
      confidence: 91,
      category: 'VEHICLE'
    },
    {
      id: 'EVT-103',
      time: new Date(Date.now() - 14000),
      type: 'friendly',
      cameraCode: 'BOP-001',
      title: 'Friendly person recognized',
      identity: 'Arun Kumar',
      personCode: 'BSF-1024',
      confidence: 97,
      category: 'FRIENDLY'
    },
    {
      id: 'EVT-104',
      time: new Date(Date.now() - 25000),
      type: 'unknown',
      cameraCode: 'BOP-003',
      title: 'Unknown person detected',
      identity: 'Unrecognized Subject',
      confidence: 89,
      category: 'UNKNOWN'
    },
    {
      id: 'EVT-105',
      time: new Date(Date.now() - 42000),
      type: 'security_event',
      cameraCode: 'BOP-004',
      title: 'Tripwire trigger breach',
      identity: null,
      confidence: 99,
      category: 'ALERT'
    }
  ]);

  // Sync external filter changes
  useEffect(() => {
    if (activeFilter) setFilter(activeFilter);
  }, [activeFilter]);

  // Live simulation event generator
  useEffect(() => {
    if (isLivePaused) return;

    const interval = setInterval(() => {
      // Pick random online camera
      const onlineCams = cameras.filter(c => c.status === 'ONLINE');
      const chosenCam = onlineCams.length > 0 
        ? onlineCams[Math.floor(Math.random() * onlineCams.length)] 
        : { cameraCode: 'BOP-001' };
      const camCode = chosenCam.cameraCode || chosenCam.id || 'BOP-001';

      // Pick friendly person from list if available
      const friendlyName = friendlyPersons.length > 0 
        ? friendlyPersons[Math.floor(Math.random() * friendlyPersons.length)].fullName 
        : 'Arun Kumar';
      const friendlyCode = friendlyPersons.length > 0 
        ? friendlyPersons[0].personCode 
        : 'BSF-1024';

      const templates = [
        {
          type: 'person',
          title: 'Person detected',
          confidence: Math.floor(92 + Math.random() * 7),
          category: 'PERSON',
          identity: null
        },
        {
          type: 'vehicle',
          title: 'Vehicle detected',
          confidence: Math.floor(88 + Math.random() * 9),
          category: 'VEHICLE',
          identity: null
        },
        {
          type: 'friendly',
          title: 'Friendly person recognized',
          identity: friendlyName,
          personCode: friendlyCode,
          confidence: Math.floor(95 + Math.random() * 4),
          category: 'FRIENDLY'
        },
        {
          type: 'unknown',
          title: 'Unknown person detected',
          confidence: Math.floor(85 + Math.random() * 9),
          category: 'UNKNOWN',
          identity: 'Unrecognized Subject'
        }
      ];

      const template = templates[Math.floor(Math.random() * templates.length)];
      const newEntry = {
        id: `EVT-${Date.now().toString().slice(-5)}`,
        time: new Date(),
        cameraCode: camCode,
        ...template
      };

      setDetectionsLog(prev => [newEntry, ...prev.slice(0, 40)]);
    }, 4500);

    return () => clearInterval(interval);
  }, [isLivePaused, cameras, friendlyPersons]);

  const filteredLog = detectionsLog.filter(item => {
    if (filter === 'ALL') return true;
    if (filter === 'PEOPLE') return item.category === 'PERSON';
    if (filter === 'VEHICLES') return item.category === 'VEHICLE';
    if (filter === 'FRIENDLY') return item.category === 'FRIENDLY';
    if (filter === 'UNKNOWN') return item.category === 'UNKNOWN';
    if (filter === 'ALERTS') return item.category === 'ALERT';
    return true;
  });

  return (
    <div className={cn(
      "flex flex-col h-full rounded-2xl bg-command-900/90 border border-slate-800 backdrop-blur-xl overflow-hidden shadow-2xl",
      className
    )}>
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-800/80 bg-command-950/70 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-3 h-3">
            <span className="absolute w-3 h-3 rounded-full bg-emerald-500/40 animate-ping" />
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <div>
            <h3 className="font-mono font-bold text-white text-xs tracking-wider uppercase">
              LIVE DETECTIONS
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              YOLOv8 Real-Time Event Stream
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsLivePaused(prev => !prev)}
            className={cn(
              "p-1.5 rounded-lg text-xs font-mono transition-colors border",
              isLivePaused 
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40" 
                : "bg-command-900 text-slate-400 hover:text-cyan-300 border-slate-700/60"
            )}
            title={isLivePaused ? "Resume Live Stream" : "Pause Live Stream"}
          >
            {isLivePaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setDetectionsLog([])}
            className="p-1.5 rounded-lg bg-command-900 text-slate-400 hover:text-red-400 transition-colors border border-slate-700/60"
            title="Clear Live Feed"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="px-3 py-2 border-b border-slate-800/60 bg-command-950/40 flex items-center gap-1 overflow-x-auto no-scrollbar text-[10px] font-mono">
        {[
          { id: 'ALL', label: 'All' },
          { id: 'PEOPLE', label: 'People' },
          { id: 'VEHICLES', label: 'Vehicles' },
          { id: 'FRIENDLY', label: 'Friendly' },
          { id: 'UNKNOWN', label: 'Unknown' },
          { id: 'ALERTS', label: 'Alerts' }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-2 py-0.5 rounded-md whitespace-nowrap transition-colors",
              filter === f.id
                ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Detections Feed List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5 max-h-[580px] font-mono text-xs">
        <AnimatePresence initial={false}>
          {filteredLog.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              <Activity className="w-6 h-6 mx-auto mb-2 opacity-40 animate-pulse" />
              Waiting for live AI inference events...
            </div>
          ) : (
            filteredLog.map(item => {
              const isFriendly = item.category === 'FRIENDLY';
              const isVehicle = item.category === 'VEHICLE';
              const isUnknown = item.category === 'UNKNOWN';
              const isAlert = item.category === 'ALERT';
              const isNormalPerson = item.category === 'PERSON';

              // Card styling matching color guidelines
              let borderClass = 'border-blue-500/40 bg-blue-950/20';
              let badgeClass = 'text-blue-400';
              let Icon = User;

              if (isFriendly) {
                borderClass = 'border-emerald-500/50 bg-[#061e14]/40';
                badgeClass = 'text-emerald-400';
                Icon = UserCheck;
              } else if (isVehicle) {
                borderClass = 'border-cyan-400/40 bg-cyan-950/20';
                badgeClass = 'text-cyan-300';
                Icon = Car;
              } else if (isUnknown) {
                borderClass = 'border-amber-400/40 bg-amber-950/20';
                badgeClass = 'text-amber-400';
                Icon = UserX;
              } else if (isAlert) {
                borderClass = 'border-red-500/50 bg-red-950/30';
                badgeClass = 'text-red-400';
                Icon = ShieldAlert;
              }

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => onSelectCamera && onSelectCamera(item.cameraCode)}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all cursor-pointer hover:scale-[1.01]",
                    borderClass
                  )}
                >
                  {/* Item Time & Type Header */}
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400 font-bold">
                      {formatTacticalTime(item.time)}
                    </span>
                    <span className={cn("flex items-center gap-1 font-semibold text-[10px]", badgeClass)}>
                      <Icon className="w-3 h-3" />
                      {item.category}
                    </span>
                  </div>

                  {/* Body: Action Title */}
                  <div className="text-slate-100 font-medium text-xs">
                    {item.title}
                  </div>

                  {/* Friendly Person Recognition Details */}
                  {isFriendly && item.identity && (
                    <div className="mt-1 text-emerald-300 text-[11px] font-bold flex items-center justify-between">
                      <span className="truncate">{item.identity}</span>
                      {item.personCode && (
                        <span className="text-emerald-400/80 text-[10px] bg-emerald-950/60 px-1 rounded border border-emerald-500/30">
                          {item.personCode}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Camera Code & Confidence Footer */}
                  <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                    <span className="text-cyan-400 font-bold bg-command-950 px-1.5 py-0.5 rounded border border-slate-800">
                      {item.cameraCode}
                    </span>
                    <span className="font-semibold text-slate-300">
                      Confidence {item.confidence}%
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Footer Status */}
      <div className="p-2.5 border-t border-slate-800/80 bg-command-950/80 text-[10px] font-mono text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-cyan-400" />
          FastAPI Ready
        </span>
        <span className="text-slate-500">
          Buffer: {filteredLog.length} events
        </span>
      </div>
    </div>
  );
}
