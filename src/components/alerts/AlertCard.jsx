import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, AlertTriangle, Clock, MapPin, Video, CheckCircle2, ChevronRight } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { cn } from '../../utils/cn';
import { formatRelativeTime } from '../../utils/formatters';

export default function AlertCard({ alert, onClick, onAcknowledge, onResolve, className }) {
  const isCritical = alert.severity === 'CRITICAL';
  const isResolved = alert.status === 'RESOLVED';

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={() => onClick && onClick(alert)}
      className={cn(
        "p-4 rounded-xl border transition-all cursor-pointer bg-command-900/80 backdrop-blur-md relative overflow-hidden",
        isCritical && !isResolved
          ? "border-red-500/50 hover:border-red-500 shadow-[0_0_15px_-4px_rgba(255,51,75,0.25)]"
          : "border-slate-800 hover:border-slate-700",
        className
      )}
    >
      {/* Critical Indicator Strip */}
      {isCritical && !isResolved && (
        <div className="absolute top-0 left-0 bottom-0 w-1 bg-red-500 animate-pulse" />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            "p-2.5 rounded-lg border shrink-0 mt-0.5",
            isCritical
              ? "bg-red-500/10 border-red-500/30 text-red-400"
              : "bg-amber-500/10 border-amber-500/30 text-amber-400"
          )}>
            {isCritical ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-cyan-400">
                {alert.id}
              </span>
              <span className="text-slate-600">•</span>
              <h4 className="font-semibold text-slate-100 text-sm">
                {alert.type}
              </h4>
            </div>

            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
              {alert.description}
            </p>

            <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-400 font-mono flex-wrap">
              <span className="flex items-center gap-1 text-slate-300">
                <Video className="w-3.5 h-3.5 text-cyan-400" />
                {alert.camera}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                {alert.location}
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                {formatRelativeTime(alert.timestamp || alert.time)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusBadge status={alert.status} pulse={alert.status === 'ACTIVE'} />
          <div className="text-[10px] font-mono text-slate-400">
            Confidence: <span className="text-emerald-400 font-bold">{alert.confidence || '94%'}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons for Rapid Response */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[11px] font-mono text-slate-500">
          Assigned: <span className="text-slate-300">{alert.assignedUnit || 'QRT Command'}</span>
        </span>

        <div className="flex items-center gap-2">
          {alert.status === 'ACTIVE' && onAcknowledge && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAcknowledge(alert.id);
              }}
              className="px-2.5 py-1 rounded text-xs font-mono bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors"
            >
              Acknowledge
            </button>
          )}
          {alert.status !== 'RESOLVED' && onResolve && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResolve(alert.id);
              }}
              className="px-2.5 py-1 rounded text-xs font-mono bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 transition-colors flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3" />
              Resolve
            </button>
          )}
          <span className="text-slate-500 hover:text-cyan-400 flex items-center text-xs">
            Details <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}
