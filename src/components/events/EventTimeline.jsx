import React from 'react';
import { motion } from 'framer-motion';
import { 
  UserCheck, 
  Car, 
  User, 
  UserX, 
  ShieldAlert, 
  Clock, 
  Activity, 
  ChevronRight,
  Radio
} from 'lucide-react';
import { formatTacticalTime, formatDateTime } from '../../utils/formatters';
import { cn } from '../../utils/cn';

export default function EventTimeline({
  events = [],
  onSelectEvent,
  className
}) {
  const safeEvents = Array.isArray(events) ? events.slice(0, 15) : [];

  return (
    <div className={cn(
      "p-4 sm:p-5 rounded-2xl bg-command-900/90 border border-slate-800 backdrop-blur-xl",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs sm:text-sm font-bold font-mono text-white uppercase tracking-wider">
            Real-Time Visual Event Timeline
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-command-950 px-2 py-0.5 rounded border border-slate-800">
          Chronological AI Sequence
        </span>
      </div>

      {/* Timeline Stream */}
      {safeEvents.length === 0 ? (
        <div className="p-8 text-center text-xs font-mono text-slate-500">
          <Activity className="w-6 h-6 mx-auto mb-2 opacity-40 animate-pulse" />
          No chronological event recordings available.
        </div>
      ) : (
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-cyan-500/60 before:via-slate-800 before:to-transparent">
          {safeEvents.map((evt, idx) => {
            const isFriendly = (evt.eventType || '').toLowerCase().includes('friendly') || evt.objectType === 'FRIENDLY' || !!evt.personId;
            const isVehicle = (evt.eventType || '').toLowerCase().includes('vehicle') || evt.objectType === 'VEHICLE';
            const isCritical = (evt.eventType || '').toLowerCase().includes('fence') || (evt.eventType || '').toLowerCase().includes('zone') || evt.severity === 'CRITICAL';
            const isUnknown = (evt.eventType || '').toLowerCase().includes('unknown');

            let dotColor = 'bg-blue-500 ring-blue-500/30';
            let Icon = User;
            let badgeBg = 'bg-blue-500/15 text-blue-400 border-blue-500/30';

            if (isFriendly) {
              dotColor = 'bg-emerald-500 ring-emerald-500/30';
              Icon = UserCheck;
              badgeBg = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
            } else if (isVehicle) {
              dotColor = 'bg-cyan-400 ring-cyan-400/30';
              Icon = Car;
              badgeBg = 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
            } else if (isCritical) {
              dotColor = 'bg-red-500 ring-red-500/30';
              Icon = ShieldAlert;
              badgeBg = 'bg-red-500/15 text-red-400 border-red-500/30';
            } else if (isUnknown) {
              dotColor = 'bg-amber-400 ring-amber-400/30';
              Icon = UserX;
              badgeBg = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
            }

            return (
              <motion.div
                key={evt.id || idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.03 }}
                onClick={() => onSelectEvent && onSelectEvent(evt)}
                className="relative group cursor-pointer"
              >
                {/* Timeline Node Dot */}
                <div className={cn(
                  "absolute -left-[1.85rem] top-1.5 w-3.5 h-3.5 rounded-full ring-4 transition-transform group-hover:scale-125",
                  dotColor
                )} />

                {/* Event Card */}
                <div className="p-3 rounded-xl bg-command-950/80 border border-slate-800/90 group-hover:border-slate-700 transition-all font-mono text-xs shadow-sm">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <span className="text-cyan-400">{formatTacticalTime(evt.detectedAt || evt.createdAt || evt.timestamp)}</span>
                    </span>
                    <span className={cn("px-2 py-0.2 rounded text-[10px] font-semibold border flex items-center gap-1", badgeBg)}>
                      <Icon className="w-3 h-3" />
                      {evt.objectType || 'EVENT'}
                    </span>
                  </div>

                  {/* Title & Target Details */}
                  <div className="flex items-start justify-between gap-2 mt-1">
                    <div>
                      <div className="text-slate-100 font-semibold text-xs">
                        {evt.eventType}
                      </div>
                      {isFriendly && (
                        <div className="text-emerald-300 text-[11px] font-bold mt-0.5">
                          Arun Kumar (BSF-1024)
                        </div>
                      )}
                      {isVehicle && (
                        <div className="text-cyan-300 text-[11px] font-medium mt-0.5">
                          Motor Transport • ID: {evt.objectId || evt.targetId}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-cyan-400 bg-command-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {evt.camera || evt.cameraId}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
