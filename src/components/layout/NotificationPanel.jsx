import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, AlertTriangle, CheckCircle2, Clock, X, Bell } from 'lucide-react';
import { useSurveillance } from '../../contexts/SurveillanceContext';
import { formatRelativeTime } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';

export default function NotificationPanel({ isOpen, onClose }) {
  const { alerts, acknowledgeAlert } = useSurveillance();
  const navigate = useNavigate();

  const recentAlerts = alerts.slice(0, 6);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute right-4 top-16 w-80 sm:w-96 rounded-2xl bg-command-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl overflow-hidden z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-command-950/70">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
                Security Notifications
              </h4>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
              {alerts.filter(a => a.status === 'ACTIVE').length} Active
            </span>
          </div>

          {/* Alert List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-800/60">
            {recentAlerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                No active security alerts.
              </div>
            ) : (
              recentAlerts.map(alert => {
                const isCrit = alert.severity === 'CRITICAL';
                return (
                  <div
                    key={alert.id}
                    onClick={() => {
                      onClose();
                      navigate('/alerts');
                    }}
                    className="p-3 hover:bg-slate-800/50 transition-colors cursor-pointer flex items-start gap-3"
                  >
                    <div className={isCrit ? "text-red-400 mt-0.5" : "text-amber-400 mt-0.5"}>
                      {isCrit ? <ShieldAlert className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-slate-200 truncate">
                          {alert.type}
                        </p>
                        <span className="text-[9px] font-mono text-slate-500 shrink-0">
                          {formatRelativeTime(alert.timestamp || alert.time)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5 font-mono">
                        {alert.camera} • {alert.location}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer View All */}
          <div className="p-2 border-t border-slate-800 bg-command-950/70 text-center">
            <button
              onClick={() => {
                onClose();
                navigate('/alerts');
              }}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
            >
              Open Full Alert Center →
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
