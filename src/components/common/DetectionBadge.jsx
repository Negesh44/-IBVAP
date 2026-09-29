import React from 'react';
import { UserCheck, UserX, ShieldAlert, Car, Shield } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function DetectionBadge({ type, label, confidence, className }) {
  const normalized = String(type || '').toUpperCase();

  const getConfig = () => {
    if (normalized === 'FRIENDLY') {
      return {
        icon: UserCheck,
        bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
        dot: 'bg-emerald-400',
        prefix: 'FRIENDLY'
      };
    }
    if (normalized === 'ALERT' || normalized === 'BREACH' || normalized === 'CRITICAL') {
      return {
        icon: ShieldAlert,
        bg: 'bg-red-500/20 border-red-500/50 text-red-300',
        dot: 'bg-red-500',
        prefix: 'ALERT'
      };
    }
    if (normalized === 'VEHICLE') {
      return {
        icon: Car,
        bg: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300',
        dot: 'bg-cyan-400',
        prefix: 'VEHICLE'
      };
    }
    // Unknown or default
    return {
      icon: UserX,
      bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
      dot: 'bg-amber-400',
      prefix: 'UNKNOWN'
    };
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border backdrop-blur-md",
        config.bg,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span className="font-semibold">{label || config.prefix}</span>
      {confidence && (
        <span className="text-[10px] opacity-75 ml-1">
          {typeof confidence === 'number' ? `${(confidence * 100).toFixed(0)}%` : confidence}
        </span>
      )}
    </div>
  );
}
